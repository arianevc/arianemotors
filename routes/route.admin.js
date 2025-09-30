const express = require("express");
// const adminModel=require('../model/adminSchema')
const adminController = require("../controller/controller.admin");
const categoryController = require("../controller/controller.category");
const productController = require("../controller/controller.product");
const upload = require("../config/multer");
const authenticate=require('../helpers/authenticate')
const router = express.Router();

router.get("/",adminController.loadDashboard);
router.get("/login", authenticate.checkLoggedIn,adminController.adminLogin);
router.post("/logout", adminController.adminLogout);
//user management
router.get("/users",adminController.loadUserList);
router.get("/users/filter", adminController.userStatusFilter);
router.post("/users/:id/block", adminController.blockUser);

//category management
router.get("/categories", categoryController.loadCategories);
router.post("/categories", categoryController.addCategory);
router.post("/categories/:id/edit", categoryController.editCategory);
router.patch("/categories/:id/delete", categoryController.softDeleteCategory);

//product management

router.get("/products", productController.loadProducts);
router.get("/addproduct", productController.loadAddProduct);
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

module.exports = router;
