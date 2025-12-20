import User from '../../model/userSchema.js'


//load admin Dashboard
const loadDashboard=async (req,res)=>{
    try{
        if(!req.session.isAdmin){
            return res.redirect('/login')
        }
       return res.render('admin/adminDashboard')
    }
    catch(error){
        console.log("Error occured: ",error)
        res.status(500).send("Server Error")
    }

}
//load registered users with pagination logic
const loadUserList=async(req,res)=>{

    try {
        const search=req.query.search||""
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // users per page
    const skip = (page - 1) * limit;
        const allUsers=await User.find({isAdmin:0}).skip(skip).limit(limit)
        const total=await User.find({isAdmin:0}).countDocuments()
        // console.log(total);
        const totalPages=Math.ceil(total/limit)
        res.render('admin/usersList',{users:allUsers,search,currentPage:page,totalPages})
    } catch (error) {
        console.error("Error in rendering usersList",error)
        return res.status(500).send("Server Error")
    }
}
//Filter based search on the user
const userStatusFilter=async (req,res)=>{
    
    try {
        
        const status=req.query.status
        const search=req.query.search
        const page=parseInt(req.query.page)||1
        const limit=5
        const skip=(page-1)*limit
        let query={isAdmin:0}
        if(status=="blocked"){
            query.isBlocked=true
        }else if(status=="unblocked"){
            query.isBlocked=false
        }
        if(search){
            query.$or=[
                {name:{$regex:search,$options:'i'}},
                {email:{$regex:search,$options:'i'}}
            ]
        }

        const total=await User.find(query).countDocuments()
        const totalPages=Math.ceil(total/limit)
        const user=await User.find(query).sort({createdAt:-1}).skip(skip).limit(limit)
        return res.json({users:user,totalPages:totalPages,currentPage:page})
    } catch (error) {
        console.log('Error displaying users',error)
        return res.status(500).send("Server Error")
    }
}
//change the status of user to "Block" or "Unblock"
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
//logout for admin
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

export {loadDashboard,loadUserList,userStatusFilter,blockUser,adminLogout}