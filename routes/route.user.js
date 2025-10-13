const express=require('express')
const router=express.Router()
const passport=require('passport')
const userController=require('../controller/controller.user')
const authenticate=require('../helpers/authenticate')
const upload = require("../config/multer");

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
router.get('/account',userController.loadAccountDetails)
router.get('/account/editProfile/:userId',userController.editProfile)
router.put('/account/update',userController.editUserPost)
//user profileImage management
router.get('/account/change-image',authenticate.checkUserSession,userController.loadImageEditer)
router.post('/account/change-image',authenticate.checkUserSession,upload.single('profileImage'),userController.changeImagePost)
router.delete('/account/change-image',userController.removeImage)
//user address management
router.post('/account/addresses',userController.addAddress)
//to get a single address among the addresses
router.get('/account/addresses/:addressId',userController.getSingleAddress)
router.put('/account/addresses/:addressId',userController.editAddress)
router.delete('/account/addresses/:addressId',userController.deleteAddress)
//edit email
router.get('/edit/email',userController.loadEditEmail)
router.post('/edit/email',userController.emailVerify)

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
router.post('/wishlist/toggle/:productId',userController.toggleWishlist)

//cart management
router.post('/cart/add',userController.addProductToCart)
router.get('/cart',userController.loadCart)

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