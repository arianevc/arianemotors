import express from 'express'
const router=express.Router()
import passport from 'passport';
import * as userController from "../../controller/userController/controller.user.js";
import * as profileController from "../../controller/userController/controller.profile.js"
import * as walletController from "../../controller/userController/controller.wallet.js"
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

//change user account password
router.post('/account/change-password',authenticate.checkUserSession,profileController.changePassword)

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

// //google auth for google signin
// router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
// router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
//     console.log("Google Auth Success for the user: ",req.user.email);
//     req.session.userId=req.user._id
//     req.session.loggedUser=req.user.name
//         req.session.loggedUserImage=req.user.profileImage
//         req.session.loggedUserReferral=req.user.referralCode
//     req.session.save((err)=>{
//         if(err){
//             console.error("Session save error: ",err);
//             return res.redirect('/login')
//         }
//         console.log("Session saved .Redirecting to home...");
//         res.redirect('/')
//     })
// })
//Users order management

//search for order on profile page
router.get('/order/search',authenticate.checkUserSession,profileController.orderSearch)
//load success page for the user order placed
router.get('/order-success',authenticate.checkUserSession,userController.loadOrderSuccess)
//order fail page for user to retry or view the failed order
router.get('/order-failure',authenticate.checkUserSession,userController.loadOrderFailure)
router.get('/orders/:orderId',authenticate.checkUserSession,userController.loadOrderDetails)
router.get('/orders/invoice/:orderId',authenticate.checkUserSession,userController.downloadInvoice)
router.get('/orders/cancel/:orderId',authenticate.checkUserSession,userController.cancelOrder)
router.post('/orders/return/:orderId',authenticate.checkUserSession,userController.returnOrder)
router.post('/orders/return-item',authenticate.checkUserSession,userController.returnItems)
//wallet management

// //load wallet page
router.get('/wallet',authenticate.checkUserSession,walletController.loadWallet)
// //create razorpay order to recharge wallet
router.post('/wallet/add-money',authenticate.checkUserSession,walletController.rechargeWallet)
// //verify and update wallet balance
router.post('/wallet/verify-payment',authenticate.checkUserSession,walletController.verifyWalletPayment) 
export default router