import User from '../model/userSchema.js'
import Category from '../model/categorySchema.js'
import Order from '../model/orderSchema.js'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { log } from 'console'

const instance=new Razorpay({
    key_id:process.env.RAZORPAY_API_TEST_KEY_ID,
    key_secret:process.env.RAZORPAY_API_TEST_SECRET_KEY
})


const loadCheckout=async(req,res)=>{
    try {
         if(!req.session.userId){
            return res.redirect('/login')
         }
        const userId=req.session.userId
        const search=req.query.search||""
        const categoryId=req.query.category||""
        const categories=await Category.find()
        const user=await User.findById(userId).populate({
            path:'cart.productId',//to populate the product with its details in the cart
            model:'Product'
        })
        const phoneAndEmail={phone:user.phone,email:user.email}
       const availableCartItems=user.cart.filter(
        item=>!item.productId.isDeleted
       )
       let totalPrice=0
       availableCartItems.forEach(item=>{
        totalPrice+=item.productId.price*item.quantity
       })
        const userAddresses=user.addresses?user.addresses:[]

           res.render('user/checkOutPage',{categoryList:categories,user:user,categoryId,search,
            phoneEmail:phoneAndEmail,cartItems:availableCartItems,totalPrice:totalPrice,addresses:userAddresses,
            razorpayKeyId:process.env.RAZORPAY_API_TEST_KEY_ID
        })
        
    } catch (error) {
        console.error("error in loading checkoutpage",error);
        res.render('user/error',{statusCode:500,statusMessage:"Server Error"})
    }
}

const placeOrder=async(req,res)=>{
    try {
        console.log(req.body)        
        const {addressId,totalPrice}=req.body
        if(req.session.userId){
            const user=await User.findById(req.session.userId).populate('cart.productId')
            const orderAddress=user.addresses[addressId]

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
                paymentMethod:'COD',
                paymentStatus:'Pending',
                orderStatus:'Pending'
            })
            await newOrder.save()
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
    const {totalPrice}=req.body
    console.log('Order Creation using razorpay: ',totalPrice)
    const options={
        amount:totalPrice*100,//convert to paise
        currency:'INR',
        receipt:"receipt#1"
    }
    const order=await instance.orders.create(options)
    console.log("razorpay order created ");
    
    res.json({success:true,order})
} catch (error) {
    console.error("error in creazting Razorpay order: ",error);
    res.status(500).json({success:false,message:"Server error"})
}
}
//verification of Razorpay payment and Order is placed
const verifyRazorpayOrder=async(req,res)=>{
    try {
        console.log(req.body)
        const {razorpay_order_id,razorpay_payment_id,razorpay_signature,addressId,totalPrice}=req.body
        //verify signature
        console.log("Razorpay verification: ",req.body)
        const body=razorpay_order_id+"|"+razorpay_payment_id
        const expectedSignature=crypto
        .createHmac('sha256',process.env.RAZORPAY_API_TEST_SECRET_KEY).update(body.toString())
        .digest('hex')
        console.log("razorpay_signature: ",razorpay_signature);
        console.log("expected_signature: ",expectedSignature);
        
        if(expectedSignature===razorpay_signature){
            if(req.session.userId){
            const user=await User.findById(req.session.userId).populate('cart.productId')
            const orderAddress=user.addresses[addressId]

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
                paymentMethod:'Online',
                paymentStatus:'Paid',
                orderStatus:'Pending'
            })
            await newOrder.save()
            user.cart=[]
            await user.save()
            res.json({success:true,message:"Order Placed Successfully",orderId:customOrderId})
            
        }else{
            res.status(401).json({success:false,message:"Unauthorized.Please signin to continue"})
            
        }
    }else{
            res.status(400).json({success:false,message:"Invalid Signature"})

        }
    } catch (error) {
        console.error("Error in verifying the Razorpay payment: ",error);
        res.status(500).json({success:false,message:"Server Error in Verification"})
    }
}
export{loadCheckout,placeOrder,createRazorpayOrder,verifyRazorpayOrder}