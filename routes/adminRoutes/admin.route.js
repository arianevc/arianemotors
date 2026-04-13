import express from 'express'
import * as adminController from '../../controller/adminController/admin.controller.js'
import * as categoryController from '../../controller/adminController/category.controller.js'
import * as productController from '../../controller/adminController/product.controller.js'
import * as userOrderController from "../../controller/adminController/orders.controller.js"
import * as couponController from "../../controller/adminController/coupon.controller.js"
import * as salesController from "../../controller/adminController/sales.controller.js"
import upload from '../../config/multer.js'
import * as authenticate from '../../helpers/authenticate.js'
const router = express.Router();
//Show Admin dashboard
router.get("/",authenticate.checkAdmin,adminController.loadDashboard);
//Admin Dashboard Sales Chart
router.get("/dashboard/chart-data",authenticate.checkAdmin,adminController.getChart)
//redirect to login if no admin
router.get("/login", authenticate.checkLoggedIn);
//admin Logout
router.post("/logout", adminController.adminLogout);
//user management
router.get("/users",adminController.loadUserList);
router.get("/users/filter", adminController.userStatusFilter);
router.post("/users/:id/block", adminController.blockUser);

//category management
router.get("/categories",authenticate.checkAdmin,categoryController.loadCategories);
router.post("/categories", authenticate.checkAdmin,categoryController.addCategory);
router.post("/categories/:id/edit", authenticate.checkAdmin,categoryController.editCategory);
router.patch("/categories/:id/delete",authenticate.checkAdmin, categoryController.softDeleteCategory);

//product management

router.get("/products",authenticate.checkAdmin, productController.loadProducts);
router.get("/addproduct",authenticate.checkAdmin, productController.loadAddProduct);
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

router.get('/orders', authenticate.checkAdmin,userOrderController.loadOrders);
router.post('/orders/update-status/:orderId',authenticate.checkAdmin, userOrderController.updateOrderStatus);
router.get('/orders/details/:orderId',authenticate.checkAdmin,userOrderController.loadOrderDetails)
router.post('/orders/approve-return',authenticate.checkAdmin,userOrderController.returnApprove)


//coupon management
router.get('/coupons',authenticate.checkAdmin,couponController.loadCoupons)
router.post('/coupons/addCoupon',authenticate.checkAdmin,couponController.addCoupon)
router.delete('/coupons/deleteCoupon',authenticate.checkAdmin,couponController.deleteCoupon)
router.put('/coupons/editCoupon/:id',authenticate.checkAdmin,couponController.editCoupon)

//sales report and view
router.get('/sales-report', authenticate.checkAdmin, salesController.loadSalesReport);
router.get('/sales-report/pdf', authenticate.checkAdmin, salesController.downloadPdf);
router.get('/sales-report/excel', authenticate.checkAdmin, salesController.downloadExcel);

export default router;
