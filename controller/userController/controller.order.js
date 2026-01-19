import User from '../../model/userSchema.js'
import Category from '../../model/categorySchema.js'
import Order from '../../model/orderSchema.js'
import Product from '../../model/productSchema.js'
import { getCommonData } from '../../helpers/commonData.js'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import Coupon from '../../model/couponModel.js'
import { createOrderHelper } from '../../helpers/orderHelper.js'
import { log } from 'console'


//create Razorpay instance
const instance=new Razorpay({
    key_id:process.env.RAZORPAY_API_TEST_KEY_ID,
    key_secret:process.env.RAZORPAY_API_TEST_SECRET_KEY
})

//display checkout page
const loadCheckout=async(req,res)=>{
    try {
         if(!req.session.userId){
            return res.redirect('/login')
         }
        const userId=req.session.userId
       const commonData=await getCommonData()
        const user=await User.findById(userId).populate({
            path:'cart.productId',//to populate the product with its details in the cart
            model:'Product'
        })
        //load coupons
        const coupons=await Coupon.find({isActive:true,expiryDate:{$gt:new Date()}})
        const walletBalance=user.wallet.balance
        const phoneAndEmail={phone:user.phone,email:user.email}
        //filter out unavailable or out of stock products
       const availableCartItems=user.cart.filter(
        item=>!item.productId.isDeleted&&item.productId.quantity>=1
       )
       let totalPrice=0
       availableCartItems.forEach(item=>{
        totalPrice+=item.productId.salePrice*item.quantity
       })
        const userAddresses=user.addresses?user.addresses:[]
           res.render('user/checkOutPage',{categoryList:commonData.categoryList,user:user,categoryId:'',search:'',
            phoneEmail:phoneAndEmail,cartItems:availableCartItems,walletBalance:walletBalance,totalPrice:totalPrice,addresses:userAddresses,
            razorpayKeyId:process.env.RAZORPAY_API_TEST_KEY_ID,coupons:coupons
        })
        
    } catch (error) {
        console.error("error in loading checkoutpage",error);
        res.render('user/error',{statusCode:500,statusMessage:"Server Error"})
    }
}
//placing order if COD
const placeOrder=async(req,res)=>{
    try {
        console.log(req.body)        
        const {addressId,paymentOption,couponCode}=req.body
        const userId=req.session.userId
        if(!userId){
            return res.status(401).json({success:false,message:"User Not Found!"})
        }
        //call the orderHelper
        const{order,user,finalAmount,appliedCouponCode}=await createOrderHelper(userId,addressId,couponCode,paymentOption)

        //if paymentOption is 'wallet'
           if(paymentOption=='Wallet'){
            //deduct the amount from wallet
            user.wallet.balance-=parseFloat(finalAmount)
            user.wallet.transactions.push({
                amount:finalAmount,
                type:'Debit',
                description:'Order Payment'
            })
            await user.save()
            //update order payment status
            order.paymentStatus='Paid'
            await order.save()
           }
           const availableCartItems=user.cart.filter(item=>{
             return !item.productId.isDeleted&&item.productId.quantity>=1&&item.quantity<=item.productId.quantity
           })
            //to reduce items from stock
            for(let item of availableCartItems ){
                await Product.updateOne({_id:item.productId},
                    {$inc:{quantity:-item.quantity}})
                }
                user.cart=[]
                await user.save()
             //Mark it as usedby the user
             if(appliedCouponCode){
                await Coupon.updateOne({code:appliedCouponCode,$addToSet:{usedBy:userId}})
             }
            res.json({success:true,message:"Order Placed Successfully",orderId:order.orderId})
            
        
    } catch (error) {
        console.error("Error in placing the order: ",error.message);
        res.status(500).json({success:false,message:error.message||"Server Error"})
    }
}
//create a razorpay order
const createRazorpayOrder=async(req,res)=>{
try {
    const {addressId,couponCode}=req.body
    // console.log(req.body)
    const userId=req.session.userId
    if(!userId){
        return res.status(401).json({success:false,message:"User Not Found!"})
    }
           //call the orderHelper
           const{order,finalAmount}=await createOrderHelper(userId,addressId,couponCode,'Online')
       
        const options={
        amount:finalAmount*100,//convert to paise
        currency:'INR',
        receipt:"receipt#1"
    }
    const RazorpayOrder=await instance.orders.create(options)
    
    order.razorpayOrderId=RazorpayOrder.id
    await order.save()
    res.json({
        success:true,
        order:RazorpayOrder,
        dbOrderId:newOrder._id,
        customOrderId:newOrder.orderId
    })
} catch (error) {
    console.error("error in creazting Razorpay order: ",error);
    res.status(500).json({success:false,message:"Server error"})
}
}
//verification of Razorpay payment and Order is placed
const verifyRazorpayOrder=async(req,res)=>{
    try {
      const userId=req.session.userId
        const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body
        //verify signature
        const body=razorpay_order_id+"|"+razorpay_payment_id
        const expectedSignature=crypto
        .createHmac('sha256',process.env.RAZORPAY_API_TEST_SECRET_KEY).update(body.toString())
        .digest('hex')
       
        const order=await Order.findOne({razorpayOrderId:razorpay_order_id})
        const orderId=order.orderId
        if(!order){
            res.status(404).json({success:false,message:"Order not found"})
        }
        //if both signatures are same
        if(expectedSignature===razorpay_signature){
          order.paymentStatus='Paid'
          order.orderStatus='Processing'
          order.paymentId=razorpay_payment_id
          //Mark it as usedby the user
          if(order.couponApplied){
            const coupon=await Coupon.findOne({code:order.couponApplied})
        coupon.usedBy.push(userId)
        await coupon.save()
          }
          await order.save()
            //to reduce items from stock
            for(let item of order.items){
                await Product.updateOne({_id:item.productId},
                    {$inc:{quantity:-item.quantity}})
                }
                //update cart
               await User.updateOne({_id:req.session.userId},{$set:{cart:[]}})
            res.json({success:true,message:"Order Placed Successfully",orderId:orderId})
            //if both are different
    }else{
        order.paymentStatus='Failed'
        await order.save()
            res.status(400).json({success:false,message:"Invalid Signature"})

        }
    } catch (error) {
        console.error("Error in verifying the Razorpay payment: ",error);
        res.status(500).json({success:false,message:"Server Error in Verification"})
    }
}
//failed razorpay payment manage
const handlePaymentFailure =async(req,res)=>{
    try {
        const {order_id}=req.body
        const order=await Order.findOne({razorpayOrderId:order_id})
        console.log("order found",order)
        if(order){
            order.paymentStatus='Failed'
           
            await order.save()
        }
        res.json({success:true,orderId:order.orderId})
    } catch (error) {
        console.error("error in handling failed razorpay payment: ",error);
        res.status(500).json({success:false,message:"Server Error in failed payment"})
    }
}
//retry payment
const retryPayment=async(req,res)=>{
    try {
        const{orderId}=req.body
        const order=await Order.findOne({orderId:orderId})
        if(!order){
            return res.status(404).json({success:false,message:'Order not found'})
        }
        if(order.paymentStatus=='Paid'){
            return res.status(400).json({success:false,message:'Order is already paid'})
        }
        //create new Razorpay order
        const options={
            amount:Math.round(order.totalPrice*100),
            currency:'INR',
            receipt:`retry_${orderId}_${Date.now()}`
        }
        const newRazorpayOrder=await instance.orders.create(options)
        order.razorpayOrderId=newRazorpayOrder.id
        order.paymentStatus='Pending'
        await order.save()
        res.json({
            success:true,
            order:newRazorpayOrder,
            user:{
                name:order.shippingAddress.name,
                phone:order.shippingAddress.phone,
                email:order.shippingAddress.email
            }
        })
    } catch (error) {
        
    }
}
//handle request for return of items
const requestReturn=async(req,res)=>{
try {
    const{orderId,itemId,reason}=req.body
    const order=await Order.findOne({orderId:orderId})

    //find the item
    const item=order.items.id(itemId)

    if(item.itemStatus=='Delivered'){
        item.itemStatus='Return Requested'
        item.reason=reason
        await order.save()
        res.json({success:true,message:'Return requested successfully'})
    }else{
        res.json({success:false,message:'Cannot return this item'})
    }
} catch (error) {
    console.error('Error in requesting return of item: ',error);
    res.status(500).json({success:false})
}
}


export{loadCheckout,placeOrder,createRazorpayOrder,
    verifyRazorpayOrder,handlePaymentFailure,retryPayment,requestReturn}