const express = require("express");
const adminController = require("../../controller/controller.admin");
const categoryController = require("../../controller/controller.category");
const productController = require("../../controller/controller.product");
const upload = require("../../config/multer");
const authenticate=require('../../helpers/authenticate')
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

router.get('/orders', authenticate.checkUserSession,adminController.loadOrders);
router.post('/orders/update-status/:orderId',authenticate.checkUserSession, adminController.updateOrderStatus);
router.get('/orders/details/:orderId',authenticate.checkUserSession,adminController.loadOrderDetails)
module.exports = router;
