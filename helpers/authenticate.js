import User from "../model/userSchema.js"

const checkLoggedIn=async (req,res,next)=>{
    if(req.session.isAdmin){
        return res.redirect('/admin')
    }else if(req.session.userId){
        return res.redirect('/')
    }   
    next()
}
const checkUserSession=async(req,res,next)=>{
    if(req.session.userId){
        next()
    }else{
        res.redirect('/login')
    }
}
const isAdmin=async(req,res,next)=>{
    if(req.session.userId&&req.session.isAdmin){
        next()
    }else{
        res.redirect('/login')
    }
}
const checkBlocked=async(req,res,next)=> {
    try {
        if(!req.session.userId){
            return next()
        }
        const user=await User.findById(req.session.userId)
        if(!user){//user doesnt exists
            req.session.userId=null
            return res.redirect('/login')
        }
        if(user.isBlocked){
            req.session.userId=null
            return res.redirect('/login?blocked=true')
        }
            next()
        
    
    } catch (error) {
        console.error("Error in checking status of user: ",error)
        next()
    }
}
export{checkLoggedIn,checkUserSession,checkBlocked,isAdmin}