const express=require("express")
const router=express.Router()
const shopController=require('../../controller/controller.shop')
const orderController=require('../../controller/controller.order')
const authenticate=require('../../helpers/authenticate')


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

module.exports=router