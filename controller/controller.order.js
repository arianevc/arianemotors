const User=require('../model/userSchema')
const Category=require('../model/categorySchema')
const Product=require('../model/productSchema')
const Address=require('../model/addressSchema')

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
module.exports={loadCheckout}