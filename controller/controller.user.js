const mongoose=require('mongoose')
const bcrypt = require('bcrypt')
const crypto=require('crypto')
const session=require('express-session')
const env=require('dotenv').config()
const nodemailer=require('nodemailer')
const User=require('../model/userSchema')
const Category=require('../model/categorySchema')
const Product=require('../model/productSchema')
const {processImages, processProfileImage}=require('../helpers/imageProcessing')
const { configDotenv } = require('dotenv')
const { search } = require('../routes/route.user')
const { error } = require('console')


const LoadHomepage=async (req,res)=>{
    try{
        const category=await Category.find()
       return res.render('user/homepage',{categoryList:category,search:"",categoryId:""})
    }
    catch(error){
        console.log("Error occured: ",error)
        res.status(500).send("Server Error")
    }
}


// const redirectIfLoggedIn = (req, res, next) => {
//     if (req.session.user ) {
//         return res.redirect('/');
//     }
//     if(req.session.admin){
//         return res.redirect('/admin')
//     }

//     next();
// };

const loadUserLogin=async (req,res)=>{
    // if (req.session.user){
    //     return res.redirect('/')
    // }
    // if(req.session.admin){
    //     return res.redirect('/admin')
    // }
    const successMsg = req.session.signupSuccess;
    req.session.signupSuccess = null
    res.setHeader('Cache-Control', 'no-store');
     // or user login page
     res.setHeader("Pragma",'no-cache')
     res.setHeader("Expires",'0')
     
     
    res.render('user/login', { message: "", success: successMsg});
}

const loadforgotPassword=async (req,res)=>{
    return res.render('user/forgotpwd',{message:""})
}

const forgotPasswordPost=async (req,res)=>{
    let {email}=req.body
    email=email.trim()
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    console.log(email)
    if(!emailRegex.test(email)){
        return res.render('user/forgotpwd',{message:"Enter a valid email address like'sample@mailid.com'"})
    }
    try {
        const user=await User.findOne({email:email})
        // console.log(user)
    if(!user){
      return res.render('user/forgotpwd',{message:"User doesn't exist"})
    }
    const token=crypto.randomBytes(32).toString('hex')//creating a token to identify the user
    const expiration=Date.now()+2*60*1000
    user.resetPasswordToken=token
    user.resetPasswordExpires=expiration
    await user.save()


    const resetlink=`http://localhost:3001/resetpwd/${token}`
    //sending the email
    console.log(resetlink)
    const transporter=nodemailer.createTransport({
        service:'gmail',
        auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSKEY
        }
    })
    await transporter.sendMail({
        from:process.env.NODEMAILER_EMAIL,
        to:user.email,
        subject:'Reset Password',
        html:`<p>This is a mail to reset your password from Ariane Motors</p>
        <p>This is your link. Link will be active only for 2 minutes </p>
        <p><a href="${resetlink}">Click Here</a></p>
        <p>Best Regards,</p>
        <break>
        <p><b>The Arachnid</b></p>`
    })
    res.render('user/forgotpwd',{message:"Check your email to reset your password"})
    } catch (error) {
        console.log("error in sending reset email: ",error)
        res.render('user/forgotpwd',{message:'Something went wrong'})
    }
    
}

const loadResetPassword=async (req,res)=>{//to verify token and expiration time
const {token}=req.params
const user=await User.findOne({//to check whether its same token or not
    resetPasswordToken:token,
    resetPasswordExpires:{$gt:Date.now()}
})
if(!user){
    return res.send('Token is invalid or expired')
}
res.render('user/resetpwd',{token,message:"",success:""})
}

const resetPasswordPost=async (req,res)=>{//to save the new password
    let {password,confirmpassword}=req.body
    let pwdpattern=/^[a-zA-Z0-9#$&@./]+$/

    password=password.trim()
    confirmpassword=confirmpassword.trim()
    const {token}=req.params
    if(!pwdpattern.test(password)){
        return res.render('user/resetpwd',{token,message:"Enter only alphabets,numbers and only characters like $,#,.,/,&",success:false})
    }
    if(!confirmpassword||!password){
        return res.render('user/resetpwd',{token,message:"Enter a valid password",success:false})
    }
    if(password!==confirmpassword){
        return res.render('user/resetpwd',{token,message:"Both passwords are not matching",success:false})
    }
    const user=await User.findOne({
        resetPasswordToken:token,
        resetPasswordExpires:{$gt:Date.now()}
    })
    if(!user){
        return res.send("Token is invalid or expired")
    }
    const hashedPassword=await bcrypt.hash(password,10)
    user.password=hashedPassword
    user.resetPasswordToken=null
    user.resetPasswordExpires=null
    await user.save()

    
    res.render('user/resetpwd',{token:null,message:null,success:true})
}

const loadUserSignup=async(req,res)=>{
    try {
        if(!req.session.userData)
        return res.render('user/login',{success:"",message:""})
    else{
        
         res.redirect('/')
    }
    } catch (error) {
        console.log("Error occured: ",error)
        res.status(500).send("Server Error")
    }
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function verifyEmail(email,otp) {
    try {
        console.log("email function called")
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSKEY
            }
        })
        const info= await transporter.sendMail({
            from:`Ariane Motors <${process.env.NODEMAILER_EMAIL}>`,
            to:email,
            subject:'Verify your account on Ariane Motors',
            text:`Your OTP is ${otp} to verify your account`,
            html:`<h3>Hi there!</h3>
  <p>Use the following OTP to verify your email address:</p>
  <h2>${otp}</h2>
  <p>This OTP is valid for 2 minutes.</p>
  <br>
  <p>– The Arachnid & Team</p>`
        })
        return info.accepted.length>0
    } catch (error) {
        console.log("Error in sending OTP",error)
    }
    
}

const userSignupPost=async (req,res)=>{
    try {
        const {name,phone,email,password,cpassword}=req.body
        console.log(req.body)
        if (password!==cpassword){
            return res.render('user/login',{success:"false",message:"Passwords don't match"})
        }
        const findUser=await User.findOne({email})
        if(findUser){
            return res.render('user/login',{error:true,message:"Email already exists"})
        }
        const otp=generateOtp()
        const emailSent=await verifyEmail(email,otp)
        if(!emailSent){
            return res.json('email-error')
        }
        req.session.otpData={
            otp:otp,
            expiresAt:Date.now()+1*60*1000,
            email:email
        }
        console.log(req.session.otpData)
        req.session.userData={name,phone,email,password}
        res.render('user/verify-otp',{email:email})
        console.log("OTP Sent: ",otp)
    } catch (error) {
        console.log("Signup error: ",error)
        res.redirect('/login')
    }
}
const loadVerfiyOtp=async(req,res)=>{
    try {
        if(!req.session.otpData){
            return res.redirect('/')
        }
        return res.render('user/verify-otp',{email:req.session.otpData.email})
    } catch (error) {
        console.error("error in rendering the otp verify: ",error);
        res.status(500).json("Server Error")
    }
}
const verifyOtp= async (req,res)=>{
try { 
    const {otp}=req.body
    console.log("User Entered otp: ",otp)
    if(!req.session.otpData){//if no otp is stored in session
       return res.status(400).json({success:false,message:"OTP not found"})
    }
    const{otp:storedOtp,expiresAt,email}=req.session.otpData
    if(Date.now()>expiresAt){
       return res.status(400).json({success:false,message:"OTP is expired"})
    }
    if(otp===storedOtp){
        if(req.session.userData){
        const user=req.session.userData
        const hashedPassword=await bcrypt.hash(user.password,10)
        const saveUserData=new User({
            name:user.name,
            phone:user.phone,
            email:user.email,
            password:hashedPassword
        })
        await saveUserData.save()
        req.session.userData = null;
    }else if(req.session.user){
       await User.findByIdAndUpdate(req.session.user._id,{email:email})
        
    }
      req.session.signupSuccess = "Verification successful. Please log in.";
      req.session.otpData= null;
      req.session.destroy((err)=>{
        if(err){
            console.error("error in destroying session: ",err);
            return res.status(500).json("Server Error")
        }
            
        })
       return res.json({ success: true, redirectUrl: "/login" });

    }
    else{
        res.status(400).json({success:false,message:"Invalid OTP"})
    }
} catch (error) {
    console.log("Error in OTP verification: ",error)
    res.render('user/verify-otp', { email: req.session.userData?.email || ""})
    // res.status(400).json({success:false,message:"Error occured"})
}
}

const resendOtp=async (req,res)=>{
    try {
        const email=req.session.userData.email
        if(!email){
            res.status(400).json({success:false,message:"Email not found"})
        }
        const otp=generateOtp()
         req.session.otpData={
            otp:otp,
            expiresAt:Date.now()+1*60*1000,
            email:email
        }
        console.log(req.session.otpData)
        const emailsent=await verifyEmail(email,otp)
        if(emailsent){
            console.log("Resend OTP is",otp)
            res.status(200).json({success:true,message:"OTP sent succesfully to your registered email"})
        }
        else{
            res.status(400).json({success:false,message:"Error in sending OTP"})
        }
    } catch (error) {
        console.log("Error in resend OTP: ",error)
        res.status(500).json({success:false,message:"Internal server error"})
    }
}

const userloginPost=async (req,res)=>{
    try {
        const {email,password}=req.body
        const user=await User.findOne({email:email})
        if(!user){
            return res.render('user/login',{success:false,message:"User Not Found"})
        }
        const passwordMatch=await bcrypt.compare(password,user.password)
        if(user.isAdmin){
            {
                if(!passwordMatch){
                    return res.render('user/login',{success:false,message:"Invalid Password"})
                }
            }
            req.session.admin=user
            return res.redirect('/admin')
        }
        if(user.isBlocked){
            return res.render('user/login',{success:false,message:"User is blocked by admin"})
        }
        if(!passwordMatch){
            return res.render('user/login',{success:false,message:"Invalid Password"})
        }
        req.session.user=user
    
         res.redirect('/')
        
    } catch (error) {
        console.log("Issue while user logging",error)
        res.render('user/login',{sucess:false,message:"Login Failed . Please try again later"})
    }
}

const userLogout=async (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.log("Error while destroying session",err)
            return res.redirect('/')
        }
        res.clearCookie('connect.sid')
        res.redirect('/login')
    })
}

const loadAccountDetails=async(req,res)=>{
    try {
        if(!req.session.user){
           return res.redirect('/login')
        }
        const user=await User.findById(req.session.user._id)
        const category=await Category.find()
        // console.log(user.addresses)
        res.render('user/accountDetails',{categoryList:category,categoryId:"",search:"",user:user})
    } catch (error) {
        console.log("error in loading ")
    }
}

const editProfile=async(req,res)=>{
    try {
        const userId=req.params.userId
        // console.log(userId)
        const user=await User.findById(userId)
        res.json({name:user.name,phone:user.phone})
    } catch (error) {
        console.log("error in editing profile",error)
    }
}
const editUserPost=async(req,res)=>{
    try {
        // console.log(req.body)
        const {name,phone}=req.body
        if(!name||!phone){
           return res.status(400).json({success:false,message:"Name and phone are required"})
        }
        const user=await User.findByIdAndUpdate(req.session.user._id,{name:name,phone:phone})
        
        res.json({success:true,message:"User Profile updated successfully"})
    } catch (error) {
        console.error(error)
        res.status(500).json({success:false,message:"Server Error"})
    }
    
}
const addAddress=async (req,res)=>{
    try {
        const user=await User.findById(req.session.user._id)
        user.addresses.push(req.body)
        await user.save()
        // console.log(user.addresses)
        res.json({success:true,message:'Address added sucessfully!',addresses:user.addresses})
    } catch (error) {
        console.error("Error in adding address",error)
        res.status(500).json({success:false,message:'Server Error'})
    }
}
const getSingleAddress=async (req,res)=>{
    try {
        const user=await User.findById(req.session.user._id)
        const address=user.addresses.id(req.params.addressId)
        res.json({success:true,address:address})
    } catch (error) {
        res.status(500).json({success:false,message:"Server Error"})
    }
}
const editAddress=async(req,res)=>{
    try {
        const user=await User.findById(req.session.user._id)
        const address=user.addresses.id(req.params.addressId)
        address.set(req.body)
        await user.save()
        res.json({success:true,message:"Address Updated!",addresses:user.addresses})
    } catch (error) {
        console.error("error in updating user address",error)
    }
}
const deleteAddress=async(req,res)=>{
    try {
        const user=await User.findById(req.session.user._id)
        user.addresses.pull(req.params.addressId)
        await user.save()
        res.json({success:true,message:"Address deleted!",addresses:user.addresses})
    } catch (error) {
        console.error("error in deleteing address",error)
        res.status(500).json({success:false,message:"Server Error"})
    }
}
const loadEditEmail=async(req,res)=>{
    try {
         if(!req.session.user){
            return res.redirect('/login')
        }
        res.render('user/editEmail',{user:req.session.user,message:"",success:""})
    } catch (error) {
        console.error("Error in loading edit mail page",error)
    }
}

const emailVerify=async(req,res)=>{
    try {
        const {existingEmail,newEmail}=req.body
        const emailRegex=/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if(existingEmail==newEmail){
            return res.json({success:false,message:"Both emails cannot be same"})
        }else if(!emailRegex.test(newEmail)){
            return res.json({success:false,message:"Please enter a valid email id"})
        }
        const otp=generateOtp()
        const emailSent=await verifyEmail(newEmail,otp)
        if(!emailSent){
            return res.json('email-error')
        }
        req.session.otpData={
            otp:otp,
            expiresAt:Date.now()+1*60*1000,
            email:newEmail
        }
        console.log(req.session.otpData)
        console.log("OTP Sent: ",otp)
        return res.json({success:true,message:"An OTP is sent to the new Email.Please check your email for the OTP ",redirectUrl:'/verify-otp'})
        // await User.findByIdAndUpdate(req.session.user._id,{email:newEmail})
    } catch (error) {
        console.error("error in reseting the email",error)
        res.status(500).json("Server Error")
    }
}
const loadImageEditer=async(req,res)=>{
    try {
        res.render('user/change-image')
    } catch (error) {
        console.error("error in rendering image editer: ",error);
        res.status(500).json("Server Error")
    }
}
const changeImagePost=async(req,res)=>{
try {
    if(!req.file){
        return res.status(400).json({success:false,message:"No file was uploaded"})
    }
    const userId=req.session.user._id
    //this takes the file buffer,resizes/compresses it, saves it and returns the path
    const imagePath=await processProfileImage(req.file)
    //update the user's record in the database
    await User.findByIdAndUpdate(userId,{profileImage:'/'+imagePath.replace(/\\/g,'/')})
    res.json({
        success:true,
        message:"Profile image uploaded successfully!",
        newImagePath:'/'+imagePath.replace(/\\/g,'/')
    })
} catch (error) {
    console.error("Error uploading profile image: ",error);
    res.status(500).json({success:false,message:"Server error during upload"})
    
}
}
const removeImage=async(req,res)=>{
    try {
        const userId=req.session.user._id
        if(!userId){
            return res.redirect('/login')
        }
        await User.findByIdAndUpdate(userId,{profileImage:""})
        res.json({success:true,message:"Profile Image removed successfully"})
    } catch (error) {
        console.error("error in removing the image: ",error);
        res.status(500).json({success:false,message:"Server error during removal of image"})
    }
}
const addProductToCart=async(req,res)=>{
    try {
        if(!req.session.user){
           return res.status(401).json({success:false,message:"Please sign in to add to cart",redirectUrl:'/login'})
        }
        // console.log(req.body)
        const{productId,quantity}=req.body
        const qtynum=parseInt(quantity)
        const userId=req.session.user._id
        const user=await User.findById(userId)
        const product=await Product.findById(productId)
        if(!product||product.isDeleted){
            return res.status(404).json({success:false,message:"Product is unavailable",redirectUrl:'/shop'})
        }
        if(!user){
           return res.status(404).json({success:false,message:"User not found"})
        }
        if(user.cart.length>=5){
            return res.status(401).json({success:false,message:"Only 5 items allowed in cart"})
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
    if (req.xhr) { // Check if request is AJAX
  return res.render('partials/user/productView', { products });
}

    res.render('user/shop', { products,categoryList:categories,search,minPrice,maxPrice,categoryId,currentPage:page,totalPages,sort }); // render 'shop.ejs' with products
  } catch (error) {
    console.error("Error loading shop:", error);
    res.status(500).send("Something went wrong.");
  }
};


const loadProductDetails=async(req,res)=>{
    try {
        const productId=req.params.id
        const categories=await Category.find()
        const product=await Product.findById(productId).populate('category')

        if(!product){
            return res.status(404).send("Product Not Found")
        }
        res.render('user/productDetails',{product,categoryList:categories,categoryId:"",search:""})
    } catch (error) {
        console.error("Error in showing product details",error)
        res.status(500).send("Server Error")
    }
}
const loadCart=async(req,res)=>{
    try {
        if(!req.session.user){
            return res.redirect('/login')
        }
        const search=req.query.search||""
        const categoryId=req.query.category||""
        const categories=await Category.find()
        const user=await User.findById(req.session.user._id).populate({
            path:'cart.productId',
            model:'Product'
        })
        res.render('user/cart',{categoryList:categories,categoryId,search,cart:user.cart})
    } catch (error) {
        console.error("error in displaying the cart: ",error);
        res.status(500).send("Server Error")
    }
}
const loadWishlist=async (req,res)=>{
    try {
        if(req.session.user){
            const search=req.query.search||""
        const categoryId=req.query.category||""
        const categories=await Category.find()
        const user=await User.findById(req.session.user._id).populate('wishList')
        res.render('user/wishList',{wishList:user.wishList,categoryList:categories,categoryId,search})
        }else{
            return res.redirect('/login')
        }
    } catch (error) {
        console.error("Error while loading wishlist",error)
        res.status(500).send("Server Error")
    }
}

const toggleWishlist=async (req,res)=>{
    try {
        
        const userId=req.session.user._id
        const productId=req.params.productId

        const user=await User.findById(userId)

        const productIndex=user.wishList.indexOf(productId)
        if(productIndex>-1){
            //if product in wishlist then remove
            await user.updateOne({_id:userId},{$pull:{wishList:productId}})
            res.status(200).json({success:true,removed:true,message:"Product removed from wishlist"})
        }else{
            //add product to wishlist
            await user.updateOne({_id:userId},{$addToSet:{wishList:productId}})
            res.status(200).json({success:true,removed:false,message:"Product added from wishlist"})
        }
    } catch (error) {
        console.error("Error while toggling to the wishlist",error)
        res.status(500).json({success:false,message:"Server Error"})
    }
}


module.exports={LoadHomepage,loadUserLogin,loadforgotPassword,forgotPasswordPost,
    loadResetPassword,resetPasswordPost,userSignupPost,loadUserSignup,loadVerfiyOtp,verifyOtp,resendOtp,
    userloginPost,userLogout,loadAccountDetails,editProfile,editUserPost,addAddress,editAddress,
    getSingleAddress,deleteAddress,loadEditEmail,emailVerify,loadImageEditer,changeImagePost,removeImage,addProductToCart
    ,loadShop,loadProductDetails,loadCart,
    loadWishlist,toggleWishlist}