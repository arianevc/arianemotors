import User from "../model/userSchema.js"
import Order from "../model/orderSchema.js"
import Product from "../model/productSchema.js"
import Coupon from "../model/couponModel.js"

//check the cart before placing the order
const validateCartStock=(cartItems)=>{
    //Check if cart is empty
    if(!cartItems||cartItems.length===0){
        return {isValid:false,message:'Cart is empty'}
    }
    for(const item of cartItems){
        const product=item.productId
        if(!product||product.isDeleted){
            return {isValid:false,message:`Error:${product?product.name:'item'} is no longer available`}
        }
        if(product.quantity<item.quantity){
            return {isValid:false,message:`Stock Change Alert: ${product.name} has only ${product.quantity} available in the cart`}
        }
    }
    return {isValid:true,message:null}
}
const createOrderHelper=async(userId,addressId,couponCode,paymentMethod)=>{
//fetch the user & the cart
const user=await User.findById(userId).populate('cart.productId')
if(!user)throw new Error("User not found")  

//check the cart length

const cartItems=user.cart.filter(item=>{
    return !item.productId.isDeleted&&item.productId.quantity>=1&&item.quantity<=item.productId.quantity    
})
if(!cartItems.length)throw new Error("Cart is empty")
const stockCheck=validateCartStock(cartItems)
if(!stockCheck.isValid){
    throw new Error(stockCheck.message)
}
//calculate total
let subtotal=0
cartItems.forEach(item=>{
    subtotal+=item.productId.salePrice*item.quantity
})
//coupon logic
        let finalAmount=subtotal
        let discountAmount=0
        let appliedCouponCode=null
        if(couponCode){
            const coupon=await Coupon.findOne({code:couponCode.toUpperCase()})
            //check the coupon is valid again
            if(coupon&&coupon.isActive&&new Date()<=coupon.expiryDate
        &&subtotal>=coupon.minPurchaseAmount&&!coupon.usedBy.includes(userId)){
            if(coupon.discountType=='fixed'){
                discountAmount=coupon.discountValue
            }else{
                discountAmount=(subtotal*coupon.discountValue)/100
            }
            //to avoid negative pricing
            if(discountAmount>subtotal)discountAmount=subtotal
        }
        finalAmount=subtotal-discountAmount
        appliedCouponCode=coupon.code
    }
    //avoid COD for above ₹1000
    if(paymentMethod=='COD'&& finalAmount>1000){
        throw new Error("Cash on Delivery not applicable for purchases above ₹1000")
    }
    //wallet payment condition checking
    if(paymentMethod==='Wallet'&&user.wallet.balance<finalAmount){
        throw new Error("Insufficient Wallet Balance")
    }
    //choosing the address among user addresses
    const orderAddress=user.addresses[addressId]
    if(!orderAddress)throw new Error("Invalid address Id")

//create the order
            const customOrderId=`ORD-${Date.now().toString(36).toUpperCase()}`
            console.log("create new order id: ",customOrderId);
            const newOrder=new Order({
                orderId:customOrderId,
                userId:userId,
                shippingAddress:{
                    name:orderAddress.name,
                    street:orderAddress.street,
                    city:orderAddress.city,
                    state:orderAddress.state,
                    pincode:orderAddress.pinCode,
                    phone:user.phone,
                    email:user.email
                },
                items:cartItems.map(item=>({
                    productId:item.productId._id,
                    quantity:item.quantity,
                    price:item.productId.salePrice
                })),
                totalPrice:finalAmount,
                discount:discountAmount,
                couponApplied:appliedCouponCode,
                paymentMethod:paymentMethod,
                paymentStatus:'Pending',
                orderStatus:'Pending'
            })
            await newOrder.save()
            return {order:newOrder,user,finalAmount,appliedCouponCode}
}
export{validateCartStock,createOrderHelper}