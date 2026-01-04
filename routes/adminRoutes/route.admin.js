import express from 'express'
import * as adminController from '../../controller/adminController/controller.admin.js'
import * as categoryController from '../../controller/adminController/controller.category.js'
import * as productController from '../../controller/adminController/controller.product.js'
import * as userOrderController from "../../controller/adminController/controller.userOrders.js"
import * as couponController from "../../controller/adminController/controller.coupon.js"
import upload from '../../config/multer.js'
import * as authenticate from '../../helpers/authenticate.js'
const router = express.Router();

router.get("/",authenticate.checkUserSession,adminController.loadDashboard);
router.get("/login", authenticate.checkLoggedIn);
router.post("/logout", adminController.adminLogout);
//user management
router.get("/users",adminController.loadUserList);
router.get("/users/filter", adminController.userStatusFilter);
router.post("/users/:id/block", adminController.blockUser);

//category management
router.get("/categories",authenticate.checkUserSession,categoryController.loadCategories);
router.post("/categories", categoryController.addCategory);
router.post("/categories/:id/edit", categoryController.editCategory);
router.patch("/categories/:id/delete", categoryController.softDeleteCategory);

//product management

router.get("/products",authenticate.checkUserSession, productController.loadProducts);
router.get("/addproduct",authenticate.checkUserSession, productController.loadAddProduct);
router.post(
  "/products/add",
  upload.array("images", 5),
  productController.addProduct
);
router.post(
  "/products/:id/edit",
  upload.array("images", 5),
  productController.editProduct
);
router.post("/products/:id/delete", productController.softDeleteProduct);

//order management

router.get('/orders', authenticate.checkUserSession,userOrderController.loadOrders);
router.post('/orders/update-status/:orderId',authenticate.checkUserSession, userOrderController.updateOrderStatus);
router.get('/orders/details/:orderId',authenticate.checkUserSession,userOrderController.loadOrderDetails)
router.post('/orders/approve-return',authenticate.checkAdmin,userOrderController.returnApprove)


//coupon management
router.get('/coupons',authenticate.checkAdmin,couponController.loadCoupons)
router.post('/coupons/addCoupon',authenticate.checkAdmin,couponController.addCoupon)
router.delete('/coupons/deleteCoupon',authenticate.checkAdmin,couponController.deleteCoupon)
export default router;
