const nodemailer=require('nodemailer')
const User=require('../model/userSchema')
const Category=require('../model/categorySchema')
const {processImages,processProfileImage}=require('../helpers/imageProcessing')
const bcrypt = require('bcrypt')
const crypto=require('crypto')

const loadAccountDetails=async(req,res)=>{
    try {
        if(!req.session.userId){
           return res.redirect('/login')
        }
        const user=await User.findById(req.session.userId)
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
        const user=await User.findByIdAndUpdate(req.session.userId,{name:name,phone:phone})
        
        res.json({success:true,message:"User Profile updated successfully"})
    } catch (error) {
        console.error(error)
        res.status(500).json({success:false,message:"Server Error"})
    }
    
}
const addAddress=async (req,res)=>{
    try {
        const user=await User.findById(req.session.userId)
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
        const user=await User.findById(req.session.userId)
        const address=user.addresses.id(req.params.addressId)
        res.json({success:true,address:address})
    } catch (error) {
        res.status(500).json({success:false,message:"Server Error"})
    }
}
const editAddress=async(req,res)=>{
    try {
        const user=await User.findById(req.session.userId)
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
        const user=await User.findById(req.session.userId)
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
         if(!req.session.userId){
            return res.redirect('/login')
        }
        res.render('user/editEmail',{user:req.session.userId,message:"",success:""})
    } catch (error) {
        console.error("Error in loading edit mail page",error)
    }
}
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
    const userId=req.session.userId
    //this takes the file buffer,resizes/compresses it, saves it and returns the path
    const imageUrl=await processProfileImage(req.file)
    //update the user's record in the database
    await User.findByIdAndUpdate(userId,{profileImage:imageUrl})
    res.json({
        success:true,
        message:"Profile image uploaded successfully!",
        newImagePath:imageUrl
    })
} catch (error) {
    console.error("Error uploading profile image: ",error);
    res.status(500).json({success:false,message:"Server error during upload"})
    
}
}
const removeImage=async(req,res)=>{
    try {
        const userId=req.session.userId
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
module.exports={loadAccountDetails,editProfile,editUserPost,addAddress,getSingleAddress
    ,editAddress,deleteAddress,loadEditEmail,emailVerify,loadImageEditer,changeImagePost,
    removeImage
}