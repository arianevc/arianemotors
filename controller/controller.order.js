import User from '../model/userSchema.js'
import Category from '../model/categorySchema.js'
import Order from '../model/orderSchema.js'

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

           res.render('user/checkOutPage',{categoryList:categories,user:user,categoryId,search,phoneEmail:phoneAndEmail,cartItems:availableCartItems,totalPrice:totalPrice,addresses:userAddresses})
        
    } catch (error) {
        console.error("error in loading checkoutpage",error);
        res.render('user/error',{statusCode:500,statusMessage:"Server Error"})
    }
}
const placeOrder=async(req,res)=>{
    try {
        console.log(req.body)        
        const {payment,addressId,totalPrice}=req.body
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
export{loadCheckout,placeOrder}