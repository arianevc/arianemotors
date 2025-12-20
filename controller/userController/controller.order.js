import User from '../../model/userSchema.js'
import Category from '../../model/categorySchema.js'
import Order from '../../model/orderSchema.js'
import Product from '../../model/productSchema.js'
import { getCommonData } from '../../helpers/commonData.js'
import Razorpay from 'razorpay'
import crypto from 'crypto'
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
        const walletBalance=user.wallet.balance
        const phoneAndEmail={phone:user.phone,email:user.email}
       const availableCartItems=user.cart.filter(
        item=>!item.productId.isDeleted
       )
       let totalPrice=0
       availableCartItems.forEach(item=>{
        totalPrice+=item.productId.price*item.quantity
       })
        const userAddresses=user.addresses?user.addresses:[]

           res.render('user/checkOutPage',{categoryList:commonData.categoryList,user:user,categoryId:'',search:'',
            phoneEmail:phoneAndEmail,cartItems:availableCartItems,walletBalance:walletBalance,totalPrice:totalPrice,addresses:userAddresses,
            razorpayKeyId:process.env.RAZORPAY_API_TEST_KEY_ID
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
        const {addressId,totalPrice,paymentOption}=req.body
        if(req.session.userId){
            const user=await User.findById(req.session.userId).populate('cart.productId')
            const orderAddress=user.addresses[addressId]
           if(paymentOption=='Wallet'){
            if(user.wallet.balance<totalPrice){
                return res.json({success:false,message:"Insufficient wallet balance"})
            }
            //deduct the amount from wallet
            user.wallet.balance-=parseFloat(totalPrice)
            user.wallet.transactions.push({
                amount:totalPrice,
                type:'Debit',
                description:'Order Payment'
            })
            await user.save()
           }
            const customOrderId=`ORD-${Date.now().toString(36).toUpperCase()}`
            console.log("create new order id: ",customOrderId);
            const newOrder=new Order({
                orderId:customOrderId,
                userId:req.session.userId,
                shippingAddress:{
                    name:orderAddress.name,
                    street:orderAddress.street,
                    city:orderAddress.city,
                    state:orderAddress.state,
                    pincode:orderAddress.pinCode,
                    phone:user.phone,
                    email:user.email
                },
                items:user.cart.map(item=>({
                    productId:item.productId._id,
                    quantity:item.quantity,
                    price:item.productId.price
                })),
                totalPrice:totalPrice,
                paymentMethod:paymentOption,
                paymentStatus:paymentOption=='Wallet'?'Paid':'Pending',
                orderStatus:'Pending'
            })
            await newOrder.save()
            
            //to reduce items from stock
            for(let item of user.cart){
                await Product.updateOne({_id:item.productId},
                    {$inc:{quantity:-item.quantity}})
                }
                user.cart=[]
                await user.save()
            res.json({success:true,message:"Order Placed Successfully",orderId:customOrderId})
            
        }else{
            res.status(404).json({success:false,message:"User unavailable.Please login and try again"})

        }
    } catch (error) {
        console.error("Error in placing the order: ",error);
        res.status(500).json({success:false,message:"Server Error"})
    }
}
//create a razorpay order
const createRazorpayOrder=async(req,res)=>{
try {
    const {totalPrice,addressId}=req.body
            const user=await User.findById(req.session.userId).populate('cart.productId')
            const orderAddress=user.addresses[addressId]

    const customOrderId=`ORD-${Date.now().toString(36).toUpperCase()}`
            
            const newOrder=new Order({
                orderId:customOrderId,
                userId:req.session.userId,
                shippingAddress:{
                    name:orderAddress.name,
                    street:orderAddress.street,
                    city:orderAddress.city,
                    state:orderAddress.state,
                    pincode:orderAddress.pinCode,
                    phone:user.phone,
                    email:user.email
                },
                items:user.cart.map(item=>({
                    productId:item.productId._id,
                    quantity:item.quantity,
                    price:item.productId.price
                })),
                totalPrice:totalPrice,
                paymentMethod:'Online',
                paymentStatus:'Pending',
                orderStatus:'Pending'
            })
            await newOrder.save()

    const options={
        amount:totalPrice*100,//convert to paise
        currency:'INR',
        receipt:"receipt#1"
    }
    const RazorpayOrder=await instance.orders.create(options)
    
    newOrder.razorpayOrderId=RazorpayOrder.id
    await newOrder.save()
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
        res.json({success:true})
    } catch (error) {
        console.error("error in handling failed razorpay payment: ",error);
        res.status(500).json({success:false,message:"Server Error in failed payment"})
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
    verifyRazorpayOrder,handlePaymentFailure,requestReturn}