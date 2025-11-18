import bcrypt from 'bcrypt' 
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import User from '../model/userSchema.js'
import Category from '../model/categorySchema.js'
import Order from '../model/orderSchema.js'
import  PDFDocument  from "pdfkit";
import verifyEmail from "../helpers/verifyEmail.js"



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

const loadUserLogin=async (req,res)=>{
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
            let abbr=user.name[0]+user.name[user.name.indexOf(' ')+1]
            let image=`https://placehold.co/300x300/088178/white?text=${abbr}`
        const hashedPassword=await bcrypt.hash(user.password,10)
        const saveUserData=new User({
            name:user.name,
            phone:user.phone,
            email:user.email,
            profileImage:image,
            password:hashedPassword
        })
        await saveUserData.save()
        req.session.userData = null;
    }else if(req.session.userId){
       await User.findByIdAndUpdate(req.session.userId,{email:email})
        
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
        if(user.isBlocked){
            return res.render('user/login',{success:false,message:"User is blocked by admin"})
        }
        if(!passwordMatch){
            return res.render('user/login',{success:false,message:"Invalid Password"})
        }
        req.session.userId=user._id
        if(user.isAdmin){
            req.session.isAdmin=true
            return res.redirect('/admin')
        }
         return res.redirect('/')
        
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

//order management
const loadOrderSuccess=async(req,res)=>{
try {
    const orderId=req.query.orderId
    console.log("given orderId: ",orderId);
    const search=req.query.search||""
    const categoryId=req.query.category||""
    const categories=await Category.find()
    if(!orderId){
       return res.redirect('/')
    }
    res.render('user/orderSuccessPage',{categoryList:categories,categoryId,search,orderId:orderId})
} catch (error) {
    console.error("error in loading order success page: ",error);
    res.status(500).render('user/error',{statusCode:500,statusMessage:"Page Unavailable due to server error"})
    
}
}
//order failure
const loadOrderFailure=async(req,res)=>{
    try {
        const search=req.query.search||""
    const categoryId=req.query.category||""
    const categories=await Category.find()
        res.render('user/orderFailurePage',{categoryList:categories,categoryId,search})
    } catch (error) {
        console.error("error in displaying payment failure page: ",error);
        res.status(500).render('user/error',{statusCode:500,statusMessage:"Page Unavailable due to server error"})
    }
}
const loadOrderDetails=async(req,res)=>{
    try {
        const orderId=req.params.orderId
    const search=req.query.search||""
    const categoryId=req.query.category||""
    const categories=await Category.find()    
    const userId=req.session.userId
    const order=await Order.findOne({orderId:orderId,userId:userId}).populate('items.productId')
    if(!order){
        return res.status(404).render('user/error',{statusCode:404,statusMessage:"Order Not Found"})
    }
    res.render('user/orderDetails',{categoryList:categories,categoryId,search,order:order})

    } catch (error) {
        console.error("error in displaying order details: ",error);
        res.status(404).render('user/error',{statusCode:404,statusMessage:"Order Not Found"})
    }
}
const downloadInvoice=async(req,res)=>{
    try{
    const orderId=req.params.orderId
    const userId=req.session.userId
    const order=await Order.findOne({orderId:orderId,userId:userId}).populate('items.productId')
    if(!order){
        return res.status(404).render('user/error',{statusCode:404,statusMessage:"Order Not Found"})
    }
    const doc=new PDFDocument({size:'A4',margin:50})

    // Set response headers to trigger a PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderId}.pdf"`);

        // Pipe the PDF document directly to the response
        doc.pipe(res);

        // --- Add Content to the PDF ---
        // Header
        doc.fontSize(25).text('Invoice', { align: 'center' });
        doc.moveDown();

        // Order Details
        doc.fontSize(14);
        doc.text(`Order ID: ${order.orderId}`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
        doc.text(`Status: ${order.orderStatus}`);
        doc.moveDown();

        // Shipping Address
        doc.fontSize(16).text('Shipping To:');
        doc.fontSize(12);
        doc.text(order.shippingAddress.name);
        doc.text(order.shippingAddress.street);
        doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`);
        doc.text(`Phone: ${order.shippingAddress.phone}`);
        doc.moveDown();

        // Items Table
        doc.fontSize(16).text('Items Purchased:');
        doc.moveDown(0.5);
        
        // Table Header
        let tableTop = doc.y;
        const itemX = 50;
        const qtyX = 350;
        const priceX = 420;
        const totalX = 500;

        doc.fontSize(12).text('Item', itemX, tableTop);
        doc.text('Qty', qtyX, tableTop);
        doc.text('Price', priceX, tableTop);
        doc.text('Total', totalX, tableTop);
        doc.strokeColor('#aaa').moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();
        doc.moveDown(2);

        // Table Rows
        order.items.forEach(item => {
            let itemY = doc.y;
            doc.fontSize(10).text(item.productId.name, itemX, itemY);
            doc.text(item.quantity, qtyX, itemY, { width: 50 });
            doc.text(`Rs.${item.price.toFixed(2)}`, priceX, itemY);
            doc.text(`Rs.${(item.price * item.quantity).toFixed(2)}`, totalX, itemY);
            doc.moveDown(1);
        });
        doc.moveDown();
        
        // Grand Total
        doc.fontSize(16).text(`Grand Total: Rs.${order.totalPrice.toFixed(2)}`);

        // --- Finalize the PDF ---
        doc.end();
    }catch{
        console.error("Error generating invoice:", error);
        res.status(500).render('user/error',{statusCode:500,statusMessage:'Failed to generate invoice'})
    }
}
const cancelOrder=async(req,res)=>{
    try {
        const orderId=req.params.orderId   
    const userId=req.session.userId
    const order=await Order.findOne({orderId:orderId,userId:userId})
    if(!order){
        return res.status(404).render('user/error',{statusCode:404,statusMessage:"Order Not Found"})
    }
    if(order.orderStatus==="Pending"||order.orderStatus==="Processing"){
        order.orderStatus="Cancelled"
        await order.save()
       return res.status(200).json({success:true,message:"Order is Cancelled"})
    }else{
        return res.status(406).json({success:false,message:"Order cancellation failed"})
    }
     } catch (error) {
        console.error("error in cancelling the order")
        return res.status(500).json({success:false,message:"Server Error"})
    }

}
const returnOrder=async(req,res)=>{
    try {
        const orderId=req.params.orderId
        const userId=req.session.userId
        const reason=req.body.reason
        console.log(reason)
        if(!reason||reason.trim()===''){
          return res.status(400).json({success:false,message:'A reason for return is required'})
        }
        const order=await Order.findOne({orderId:orderId,userId:userId})
        if(!order){
            return res.status(404).json({success:false,message:"Order Not Found"})
        }
        if(order.orderStatus==='Delivered'){
            order.orderStatus='Return Requested'
            order.returnReason=reason
            await order.save()
            res.json({success:true,message:"Return request submitted successfully"})             
        }
    } catch (error) {
        console.error("Error in requesting return: ",error);
        res.status(500).json({success:false,message:"Server Error"})
    }
}
export{LoadHomepage,loadUserLogin,loadforgotPassword,forgotPasswordPost,
    loadResetPassword,resetPasswordPost,userSignupPost,loadUserSignup,loadVerfiyOtp,verifyOtp,resendOtp,
    userloginPost,userLogout,loadOrderSuccess,loadOrderFailure,loadOrderDetails,downloadInvoice,
    cancelOrder,returnOrder}