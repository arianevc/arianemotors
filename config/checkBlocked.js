const User=require('../model/userSchema')

module.exports=async function (req,res,next) {
    try {
        if(!req.session.user){
            return next()
        }
        const userId=req.session.user._id
        if(!userId){
            return next()
        }
        const user=await User.findById(userId)
        if(!user){//user doesnt exists
            req.session.user=null
            return res.redirect('/login')
        }
        if(user.isBlocked){
            req.session.user=null
            return res.redirect('/login?blocked=true')
        }
            next()
        
    
    } catch (error) {
        console.error("Error in checking status of user: ",error)
        next()
    }
}