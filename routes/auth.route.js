import express from 'express'
const router=express.Router()
import passport from 'passport'

//trigger google login
router.get('/google',passport.authenticate('google',{scope:['profile','email']}))

//google callback
router.get('/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
    req.session.userId=req.user._id
    req.session.loggedUser=req.user.name
    req.session.loggedUserImage=req.user.profileImage
    req.session.loggedUserReferral=req.user.referralCode
    
    req.session.save((err)=>{
        if(err){
            console.error("Session save error: ",err);
            return res.redirect('/login')
        }
        res.redirect('/')
    })
})
export default router