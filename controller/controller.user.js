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
const verifyEmail=require("../helpers/verifyEmail")



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
        const hashedPassword=await bcrypt.hash(user.password,10)
        const saveUserData=new User({
            name:user.name,
            phone:user.phone,
            email:user.email,
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

module.exports={LoadHomepage,loadUserLogin,loadforgotPassword,forgotPasswordPost,
    loadResetPassword,resetPasswordPost,userSignupPost,loadUserSignup,loadVerfiyOtp,verifyOtp,resendOtp,
    userloginPost,userLogout}