import User from '../model/userSchema.js'
import Category from '../model/categorySchema.js'
import Product from '../model/productSchema.js'

//render the shop page with all filters and search criteria
const loadShop = async (req, res) => {
  try {
    const search=req.query.search ||""
    const categoryId=req.query.category||""
    const minPrice=parseInt(req.query.minPrice)||0
    const maxPrice=parseInt(req.query.maxPrice)||100000
    const page=parseInt(req.query.page)||1
    const sort=req.query.sort||''
    const limit=6
    const skip=(page-1)*limit

    const filter={isDeleted:false,price:{$gte:minPrice,$lte:maxPrice}}
    // console.log(search,categoryId)
    //always apply search filter
    if(search)
    {
       filter.name={$regex:search,$options:"i"}

    }
    if(categoryId){
    filter.category=categoryId
    }
    let sortOption={}//sort products according filter
    
    if(sort=='asc'){
        sortOption.price=1
    }else if(sort=="desc"){
        sortOption.price=-1
    }else{
        sortOption.createdAt=-1
    }


    const totalProducts=await Product.countDocuments(filter)
    const totalPages=Math.ceil(totalProducts/limit)


    const products = await Product.find(filter).populate('category').sort(sortOption).skip(skip).limit(limit);
    const categories=await Category.find()
    let wishlistedProductIds=[]
    let cartProductIds=[]
    if(req.session.userId){
        const user=await User.findById(req.session.userId)
        wishlistedProductIds=user.wishList.map(product=>product._id.toString())
        // console.log("wishlist products",wishlistedProductIds);
        
        cartProductIds=user.cart.map(item=>item.productId.toString())
        // console.log("cart products",cartProductIds);
    }
    const annotatedProducts=products.map(product=>{
        const id=product._id.toString()
        return{
            ...product.toObject(),isWishlisted:wishlistedProductIds.includes(id),
            isInCart:cartProductIds.includes(id)
        }
    })
    if (req.xhr) { // Check if request is AJAX
        return res.render('partials/user/productView', { products:annotatedProducts });
}

    res.render('user/shop', { products:annotatedProducts,categoryList:categories,search,minPrice,maxPrice,categoryId,currentPage:page,totalPages,sort }); // render 'shop.ejs' with products
  } catch (error) {
    console.error("Error loading shop:", error);
    res.status(500).send("Something went wrong.");
  }
};
//render product detailing page for a particular product
const loadProductDetails=async(req,res)=>{
    try {
        const productId=req.params.id
        const categories=await Category.find()
        const product=await Product.findById(productId).populate('category')
        let isWishlisted=false
        if(req.session.userId){
        const user=await User.findById(req.session.userId)
        if(user.wishList.includes(productId)){
            isWishlisted=true
        }
    }
        if(!product){
            return res.status(404).send("Product Not Found")
        }
        res.render('user/productDetails',{product,isWishlisted:isWishlisted,categoryList:categories,categoryId:"",search:""})
    } catch (error) {
        console.error("Error in showing product details",error)
        res.status(500).send("Server Error")
    }
}
//display the user cart contents
const loadCart=async(req,res)=>{
    try {
        if(!req.session.userId){
            return res.redirect('/login')
        }
        const search=req.query.search||""
        const categoryId=req.query.category||""
        const categories=await Category.find()
        const user=await User.findById(req.session.userId).populate({
            path:'cart.productId',
            model:'Product'
        })
        res.render('user/cart',{categoryList:categories,categoryId,search,cart:user.cart})
    } catch (error) {
        console.error("error in displaying the cart: ",error);
        res.status(500).send("Server Error")
    }
}
//add a particular product to cart with desired qty
const addProductToCart=async(req,res)=>{
    try {
        if(!req.session.userId){
           return res.status(401).json({success:false,message:"Please sign in to add to cart",redirectUrl:'/login'})
        }
        
        const{productId,quantity}=req.body
        const qtynum=parseInt(quantity)
        if(qtynum>3){
            return res.status(400).json({success:false,message:"Cannot allow more than 3 in quantity"})
        }
        const userId=req.session.userId
        const user=await User.findById(userId)
        const product=await Product.findById(productId)
        if(qtynum>product.quantity){
            return res.status(406).json({success:false,message:"Cart quantity cannot be more than that of stock"})
        }
        if(!product||product.isDeleted){
            return res.status(404).json({success:false,message:"Product is unavailable",redirectUrl:'/shop'})
        }
        if(!user){
           return res.status(404).json({success:false,message:"User not found"})
        }
        if(user.cart.length>=3){
            return res.status(401).json({success:false,message:"Only 3 items allowed in cart"})
        }
        const inWishlist=user.wishList.find(id=>id==productId)
        if(inWishlist){
            await user.updateOne({$pull:{wishList:productId}})
        }
        const existingProduct=user.cart.find(item=>item.productId.toString()==productId)
        if(existingProduct){
            existingProduct.quantity+=qtynum
        }else{
            user.cart.push({productId,quantity:qtynum})
        }
        await user.save()
        return res.status(200).json({success:true,message:"Product added to cart successfully"})
    } catch (error) {
        console.log("Error in adding product to cart",error)
        res.status(500).json({success:false,message:"Server error occured while adding to cart"})
    }
}
//update the cart quantity
const updateCartQuantity=async(req,res)=>{
    try {
        const{productId,quantity}=req.body
        const userId=req.session.userId
        if(!userId){
            return res.status(401).json({success:false,message:"User not found.Please login again"})
        }
        const user=await User.findById(userId)
        const cartItem=user.cart.find(item=>item.productId.toString()===productId)
        if(!cartItem){
            return res.status(404).json({success:false,message:"Item not found"})
        }
        const product=await Product.findById(productId)
        if((parseInt(quantity)>product.quantity)){
            return res.status(406).json({success:false,message:"quantity cannot be greater than product stock"})
        }
        cartItem.quantity=parseInt(quantity)
        await user.save()
        const updatedUser=await User.findById(userId).populate('cart.productId')
        let newGrandTotal=0
        updatedUser.cart.forEach(item=>{
            newGrandTotal+=item.productId.price*item.quantity
        })
        res.json({success:true,finalTotal:newGrandTotal})
    } catch (error) {
        res.status(500).json({success:false,message:"Server Error"})
    }
}
//remove an item from cart
const deleteFromCart=async(req,res)=>{
    try {
        const productId=req.params.productId
        if(req.session.userId){
        const user=await User.findById(req.session.userId)
        await user.updateOne({$pull:{cart:{productId:productId}}})
        res.status(200).json({success:true,message:"Item removed from Cart"})
    }else{
        res.status(401).json({success:false,message:"User unavailable.Please login again."})
    }
    } catch (error) {
        console.log("error in deleting from cart: ",error);
        res.status(500).json({success:false,message:"Server Error"})
        
    }
    } 
    //drop the entire cart
const clearCart=async(req,res)=>{
    try {
        if(!req.session.userId){
            return res.status(401).json({success:false,message:"Please login to use cart"})
        }
        const user=await User.findById(req.session.userId)
        user.cart=[]
        await user.save()
        return res.status(200).json({success:true,message:"Items cleared from the cart"})
    } catch (error) {
       console.error("error in clearing the cart: ",error);
       res.status(500).render('user/error',{statusCode:500,statusMessage:"Internal Server Error"})
        
    }
}
//display wishlist
const loadWishlist=async (req,res)=>{
    try {
        if(req.session.userId){
            const search=req.query.search||""
        const categoryId=req.query.category||""
        const categories=await Category.find()
        const user=await User.findById(req.session.userId).populate('wishList')
        res.render('user/wishList',{wishList:user.wishList,categoryList:categories,categoryId,search})
        }else{
            return res.redirect('/login')
        }
    } catch (error) {
        console.error("Error while loading wishlist",error)
        res.status(500).send("Server Error")
    }
}
//add or remove an item from wishlist using toggle button
const toggleWishlist=async (req,res)=>{
    try {
        if(!req.session.userId){
            return res.status(401).json({success:false,message:"Please Login to use Wishlist",redirectUrl:'/login'})
        }
        const userId=req.session.userId
        
        
        const productId=req.params.productId
        // console.log("product id:",productId);
        
        const user=await User.findById(userId)

        const productIndex=user.wishList.indexOf(productId)
        if(productIndex>-1){
            //if product in wishlist then remove
            await user.updateOne({$pull:{wishList:productId}})
           return res.status(200).json({success:true,removed:true,message:"Product removed from wishlist"})

        
        }
        else{
            //add product to wishlist
            //if item is in cart , cannot add to wishlist
            if(user.cart.some(item=>item.productId.toString()===productId.toString())){
                return res.status(400).json({success:false,message:"Product is already in cart"})
            }
            await user.updateOne({$addToSet:{wishList:productId}})
            const updateUser=await User.findById(userId)
            // console.log("user wishlist: ",updateUser.wishList);
            
           return res.status(200).json({success:true,removed:false,message:"Product added to wishlist"})
        }
    } catch (error) {
        console.error("Error while toggling to the wishlist",error)
        res.status(500).json({success:false,message:"Server Error"})
    }
}
//remove from wishlist
const deleteFromWishlist=async(req,res)=>{
    try {
        const productId=req.params.productId
    console.log(productId)
    if(req.session.userId){
        const user=await User.findById(req.session.userId)
        await user.updateOne({$pull:{wishList:productId}})
        res.status(200).json({success:true,message:"Item removed from wishlist"})
    }else{
        res.status(401).json({success:false,message:"User unavailable.Please login again."})
    }
    } catch (error) {
        console.log("error in deleting from wishlist: ",error);
        res.status(500).json({success:false,message:"Server Error"})
        
    }
}

export{loadShop,loadProductDetails,addProductToCart,
    loadCart,updateCartQuantity,deleteFromCart,clearCart,loadWishlist,
    toggleWishlist,deleteFromWishlist}