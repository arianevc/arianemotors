import  express  from "express";
const router=express.Router()
import * as shopController from "../../controller/controller.shop.js";
import * as orderController from "../../controller/controller.order.js"
import * as authenticate from "../../helpers/authenticate.js"


//shop functions
router.get('/products',authenticate.checkBlocked,shopController.loadShop);
router.get('/products/sort',authenticate.checkBlocked,shopController.loadShop)

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

//checkout
router.get('/checkout',orderController.loadCheckout)
//order management
router.post('/place-order',authenticate.checkUserSession,orderController.placeOrder)
router.post('/create-razorpay-order',authenticate.checkUserSession,orderController.createRazorpayOrder)
router.post('/verify-razorpay-payment',authenticate.checkUserSession,orderController.verifyRazorpayOrder)
export default router