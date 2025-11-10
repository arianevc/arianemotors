import express from 'express'
const router=express.Router()
import passport from 'passport';
import * as userController from "../../controller/controller.user.js";
import * as profileController from "../../controller/controller.profile.js"
import * as authenticate from '../../helpers/authenticate.js'
import upload from "../../config/multer.js"
import {body,validationResult} from "express-validator"


const addressValidationRules=[
    body('name','Name is required').trim().notEmpty(),
    body('street','Street is required').trim().notEmpty(),
    body('city','City is required').trim().notEmpty(),
    body('state','State is required').trim().notEmpty(),
    body('pinCode')
    .trim().notEmpty().isPostalCode('IN').withMessage('Pincode is required')
]



//homepage
router.get('/',authenticate.checkBlocked,userController.LoadHomepage)

//login/signup routes
router.get('/login',authenticate.checkLoggedIn,userController.loadUserLogin)//middleware chaining
router.post('/signup',userController.userSignupPost)
router.get('/verify-otp',userController.loadVerfiyOtp)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.post('/login',userController.userloginPost)
router.post('/logout',userController.userLogout)

//user account
router.get('/account',profileController.loadAccountDetails)
router.get('/account/editProfile/:userId',profileController.editProfile)
router.put('/account/update',profileController.editUserPost)
//user profileImage management
router.get('/account/change-image',authenticate.checkUserSession,profileController.loadImageEditer)
router.post('/account/change-image',authenticate.checkUserSession,upload.single('profileImage'),profileController.changeImagePost)
router.delete('/account/change-image',profileController.removeImage)
//user address management
router.post('/account/addresses',addressValidationRules,profileController.addAddress)
//to get a single address among the addresses
router.get('/account/addresses/:addressId',profileController.getSingleAddress)
router.put('/account/addresses/:addressId',profileController.editAddress)
router.delete('/account/addresses/:addressId',profileController.deleteAddress)
//edit email
router.get('/edit/email',profileController.loadEditEmail)
router.post('/edit/email',profileController.emailVerify)

router.route("/forgotpwd")//router chaining


.get(userController.loadforgotPassword)
.post(userController.forgotPasswordPost)
router.get('/resetpwd/:token',userController.loadResetPassword)
router.post('/resetpwd/:token',userController.resetPasswordPost)

//google auth for google signin
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
    req.session.user={
        _id:req.user._id,
        name:req.user.name,
        email:req.user.email
    }
    res.redirect('/')
})
//Users order management
router.get('/order-success',authenticate.checkUserSession,userController.loadOrderSuccess)
router.get('/orders/:orderId',authenticate.checkUserSession,userController.loadOrderDetails)
router.get('/orders/invoice/:orderId',authenticate.checkUserSession,userController.downloadInvoice)
router.get('/orders/cancel/:orderId',authenticate.checkUserSession,userController.cancelOrder)
router.post('/orders/return/:orderId',authenticate.checkUserSession,userController.returnOrder)

export default router