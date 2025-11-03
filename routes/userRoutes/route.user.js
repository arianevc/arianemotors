const express=require('express')
const router=express.Router()
const passport=require('passport')
const userController=require('../../controller/controller.user')
const profileController=require("../../controller/controller.profile")
const shopController=require('../../controller/controller.shop')
const authenticate=require('../../helpers/authenticate')
const upload = require("../../config/multer");

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
router.post('/account/addresses',profileController.addAddress)
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

//shop functions
router.get('/shop',authenticate.checkBlocked,shopController.loadShop);
router.get('/shop/sort',authenticate.checkBlocked,shopController.loadShop)

//product details
router.get('/product/:id',shopController.loadProductDetails)
//wishlist functions
router.get('/wishlist',shopController.loadWishlist)
router.post('/wishlist/toggle/:productId',shopController.toggleWishlist)
router.delete('/wishlist/delete/:productId',shopController.deleteFromWishlist)

//cart management
router.post('/cart/add',shopController.addProductToCart)
router.get('/cart',shopController.loadCart)
router.delete('/cart/clearCart',shopController.clearCart)
router.delete('/cart/delete/:productId',shopController.deleteFromCart)
router.post('/cart/update-quantity',shopController.updateCartQuantity)

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