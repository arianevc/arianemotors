import User from "../../model/userSchema.js"
import Category from "../../model/categorySchema.js"
import Order from "../../model/orderSchema.js"
import { paginateHelper } from "../../helpers/pagination.js"
import { processProfileImage } from "../../helpers/imageProcessing.js"
import { validationResult } from "express-validator"
import { getCommonData } from "../../helpers/commonData.js"
import Razorpay from "razorpay"
import { log, timeStamp } from "node:console"


//load Account details
const loadAccountDetails=async(req,res)=>{
    try {
        if(!req.session.userId){
           return res.redirect('/login')
        }
        // console.log("page no: ",page);
        
        const filters={userId:req.session.userId}
        let sortOption={createdAt:-1}
        const paginatedData=await paginateHelper(Order,{
            limit:6,
            sort:sortOption,
            filters:filters,
            page:1
        })
        const userOrders=paginatedData.results
        const totalPages=paginatedData.pagination.totalPages
        // console.log("total documents: ",paginatedData.pagination.totalDocuments)
        const currentPage=paginatedData.pagination.currentPage

        const user=await User.findById(req.session.userId)
       if(req.xhr){
        return res.render('partials/user/orderList',{orders:userOrders,totalPages:totalPages,currentPage:currentPage})
       }
     
        const category=await Category.find()
        // console.log(user.addresses)
        res.render('user/accountDetails',{categoryList:category,categoryId:"",search:"",user:user,orders:userOrders,currentPage,totalPages})
    } catch (error) {
        console.log("error in loading account details: ",error)
        res.status(500).render('user/errorPage')
    }
}
//search for orders
const orderSearch=async(req,res)=>{
 try {
    console.log(req.query) 
    const query={userId:req.session.userId}
    //search regex for finding OrderId
    if(req.query.search){
        const searchRegex=new RegExp(req.query.search,'i')
        query.orderId={$regex:searchRegex}
    }
    //setting a range for the date
    if(req.query.date){
        const dateStr=req.query.date

        const startOfDate=new Date(dateStr)
        startOfDate.setHours(0,0,0,0)
        const endOfDate=new Date(dateStr)
        endOfDate.setHours(23,59,59,999)
        query.createdAt={$gte:startOfDate,$lte:endOfDate}
    }
    if(req.query.status&&req.query.status!=='All'){
        query.orderStatus=req.query.status
    }
    console.log('final mongoQuery: ',query)
    const sortOption={createdAt:-1}
    const paginatedData=await paginateHelper(Order,{
        sort:sortOption,
        limit:6,
        page:req.query.page,
        filters:query,
    })
    console.log("paginatedData: ",paginatedData)
    const userOrders=paginatedData.results
    console.log('fetched Orders: ',userOrders);
    const totalPages=paginatedData.pagination.totalPages
    const currentPage=paginatedData.pagination.currentPage
    if(req.xhr){
        return res.render('partials/user/orderList',{orders:userOrders,totalPages:totalPages,currentPage:currentPage})
    }

 } catch (error) {
    console.error("Error in displaying the searched order: ",error);
        
 }
}

//load user details to edit or read
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
//add or update user details
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
//Add new address to user profile
const addAddress=async (req,res)=>{
    const errors=validationResult(req)
    console.log(errors);
    
    if(!errors.isEmpty()){
       return res.status(400).json({success:false,message:'validation failed',errors:errors.array()})
}
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
//retrieve a single address to edit and view
const getSingleAddress=async (req,res)=>{
    try {
        const user=await User.findById(req.session.userId)
        const address=user.addresses.id(req.params.addressId)
        res.json({success:true,address:address})
    } catch (error) {
        res.status(500).json({success:false,message:"Server Error"})
    }
}
//edit address and update the changes
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
//remove unwanted address
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
//display edit email page to enter new email
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
//generate OTP to send it to the new mail
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
//verify the otp and update the new email
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
//profile image editing page
const loadImageEditer=async(req,res)=>{
    try {
        res.render('user/change-image')
    } catch (error) {
        console.error("error in rendering image editer: ",error);
        res.status(500).json("Server Error")
    }
}
//add new image
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
//remove existing image
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
export{loadAccountDetails,orderSearch,editProfile,editUserPost,addAddress,getSingleAddress
    ,editAddress,deleteAddress,loadEditEmail,emailVerify,loadImageEditer,changeImagePost,
    removeImage
}