const express=require('express')
const router=express.Router()
const passport=require('passport')
const userController=require('../controller/controller.user')
const authenticate=require('../helpers/authenticate')


//homepage
router.get('/',authenticate.checkBlocked,userController.LoadHomepage)

//login/signup routes
router.get('/login',authenticate.checkLoggedIn,userController.loadUserLogin)//middleware chaining
router.post('/signup',userController.userSignupPost)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.post('/login',userController.userloginPost)
router.post('/logout',userController.userLogout)

//user account
router.get('/account',userController.loadAccountDetails)
//user address management
router.post('/account/addresses',userController.addAddress)
//to get a single address among the addresses
router.get('/account/addresses/:addressId',userController.getSingleAddress)
router.put('/account/addresses/:addressId',userController.editAddress)
router.delete('/account/addresses/:addressId',userController.deleteAddress)
router.get('/edit/email',userController.loadEditEmail)
router.post('/emailchange',userController.emailChange)

router.route("/forgotpwd")//router chaining

//wishlist


.get(userController.loadforgotPassword)
.post(userController.forgotPasswordPost)
router.get('/resetpwd/:token',userController.loadResetPassword)
router.post('/resetpwd/:token',userController.resetPasswordPost)

//shop functions
router.get('/shop',authenticate.checkBlocked,userController.loadShop);
router.get('/shop/sort',authenticate.checkBlocked,userController.loadShop)

//product details
router.get('/product/:id',userController.loadProductDetails)
//wishlist functions
router.get('/wishlist',userController.loadWishlist)
router.post('/wishlist/add/:productId',userController.addToWishlist)
router.post('/wishlist/remove/:productId',userController.removeFromWishlist)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),(req,res)=>{
    req.session.user={
        _id:req.user._id,
        name:req.user.name,
        email:req.user.email
    }
    res.redirect('/')
})
module.exports=router