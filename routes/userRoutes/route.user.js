import express from 'express'
const router=express.Router()
import passport from 'passport';
import * as userController from "../../controller/controller.user.js";
import * as profileController from "../../controller/controller.profile.js"
import * as authenticate from '../../helpers/authenticate.js'
import upload from "../../config/multer.js"
import * as Validators from '../../helpers/expressValidator.js'





//homepage
router.get('/',authenticate.checkBlocked,authenticate.isAdmin,userController.LoadHomepage)

//login/signup routes
router.get('/login',authenticate.checkLoggedIn,userController.loadUserLogin)//middleware chaining
router.get('/signup',authenticate.checkLoggedIn,userController.loadUserSignup)
router.post('/signup',Validators.signupValidator,userController.userSignupPost)
router.get('/verify-otp',userController.loadVerfiyOtp)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.post('/login',userController.userloginPost)
router.post('/logout',userController.userLogout)

//user account
router.get('/account',authenticate.checkBlocked,profileController.loadAccountDetails)
router.get('/account/editProfile/:userId',profileController.editProfile)
router.put('/account/update',profileController.editUserPost)
//user profileImage management
router.get('/account/change-image',authenticate.checkUserSession,profileController.loadImageEditer)
router.post('/account/change-image',authenticate.checkUserSession,upload.single('profileImage'),profileController.changeImagePost)
router.delete('/account/change-image',profileController.removeImage)

//user address management
//to get add a new address
router.post('/account/addresses',Validators.addressValidator,profileController.addAddress)
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
//order fail page for user to retry or view the failed order
router.get('/order-failure',authenticate.checkUserSession,userController.loadOrderFailure)
router.get('/orders/:orderId',authenticate.checkUserSession,userController.loadOrderDetails)
router.get('/orders/invoice/:orderId',authenticate.checkUserSession,userController.downloadInvoice)
router.get('/orders/cancel/:orderId',authenticate.checkUserSession,userController.cancelOrder)
router.post('/orders/return/:orderId',authenticate.checkUserSession,userController.returnOrder)

//wallet management

// //load wallet page
// router.get('/wallet',authenticate.checkUserSession,profileController.loadWallet)
// //create razorpay order to recharge wallet
// router.post('/wallet/add-money',authenticate.checkUserSession,profileController.rechargeWallet)
// //verify and update wallet balance
// router.post('/wallet/verify-payment',authenticate.checkUserSession,profileController.verifyWalletPayment) 
export default router