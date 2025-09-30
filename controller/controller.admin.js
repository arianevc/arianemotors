const mongoose=require('mongoose')
const adminModel=require('../model/adminSchema')
const User=require("../model/userSchema")
const bcrypt=require('bcrypt')
const Category=require('../model/categorySchema')



const adminLogin=async(req,res)=>{
    if(req.session.admin){
        return res.redirect('/')
    }
    res.redirect('/user/login')
}
// const adminLoginPost=async (req,res)=>{
//     try{
//         const {email,password}=req.body
//         const admin=await adminModel.findOne({email:email})
//         if(admin){
//         const isValid=await bcrypt.compare(password,admin.password);
//         if(!isValid){
//             return res.render('adminLogin',{message:"Invalid Email or Password"})
//         }
//         req.session.admin=true
//         res.redirect('admin/dashboard')

//     }
//     else{
//         res.render('admin/dashboard')
//     }
// }
// catch(error){
//     console.log(error)
//     res.render('/')
// }
// }
const loadDashboard=async (req,res)=>{
    try{
        if(!req.session.admin){
            return res.redirect('/login')
        }
       return res.render('admin/adminDashboard')
    }
    catch(error){
        console.log("Error occured: ",error)
        res.status(500).send("Server Error")
    }

}
const loadUserList=async(req,res)=>{

    try {
        const search=req.query.search||""
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // products per page
    const skip = (page - 1) * limit;
        const allUsers=await User.find({isAdmin:0})
        res.render('admin/usersList',{users:allUsers,search})
    } catch (error) {
        console.error("Error in rendering usersList",error)
        return res.status(500).send("Server Error")
    }
}
const userStatusFilter=async (req,res)=>{
    
    try {
        
        const status=req.query.status
        const search=req.query.search
        let query={isAdmin:0}
        if(status=="blocked"){
            query.isBlocked=true
        }else if(status=="unblocked"){
            query.isBlocked=false
        }
        if(search){
            query.name={$regex:search,$options:'i'}
        }
        const user=await User.find(query)
        
        return res.json({users:user})
    } catch (error) {
        console.log('Error displaying users',error)
        return res.status(500).send("Server Error")
    }
}

const blockUser=async (req,res)=>{
try {
    // console.log("BLOCK USER REQUEST RECEIVED FOR ID:", req.params.id);
    const user=await User.findById(req.params.id)
    user.isBlocked=!user.isBlocked
    await user.save()
    res.redirect('/admin/users')
   

} catch (error) {
    console.log("Error while updating user status",error)
    res.status(500).send("Error in update userstatus")
}
}
const adminLogout=async (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.log("Error while destroying session",err)
            return res.redirect('/')
        }
        res.clearCookie('connect.sid')
        res.redirect('/login')
    })
}

module.exports={adminLogin,loadDashboard,loadUserList,userStatusFilter,blockUser,adminLogout}