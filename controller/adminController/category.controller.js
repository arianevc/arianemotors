import { updateProductPrice } from "../../helpers/priceCalculator.js"
import Category from "../../model/categorySchema.js"
import Product from "../../model/productSchema.js"
import { paginateHelper } from "../../helpers/pagination.js";

const loadCategories = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const options = {
            page,
            limit,
            sort: { createdAt: -1 },
            search,
            searchFields: ['name']
        };

        const result = await paginateHelper(Category, options);

        const categories = result.results;
        let totalPages = result.pagination.totalPages;
        if (totalPages === 0) totalPages = 1;

        res.render('admin/categoryList', {
            categories,
            currentPage: result.pagination.currentPage,
            totalPages,
            search,
            limit
        });
    } catch (error) {
        console.log("Error in categories", error);
        res.status(500).send("Error in categories from server");
    }
}

const addCategory=async(req,res)=>{
    try {
        let {name,description,categoryOffer}=req.body
        if(!name||!name.trim()){
            return res.status(400).json({success:false,message:"Category name should not be empty"})
        }
        name=name.trim()
        const existingCategory=await Category.findOne({name:{$regex:`^${name}$`,$options:"i"}})
        if(existingCategory){
            return res.status(400).json({success:false,message:"Duplicate Category not allowed"})
        }
        if(categoryOffer<0 || categoryOffer>80){
            return res.status(400).json({success:false,message:"Enter a valid number for category offer"})
        }
        const newCategory=await new Category({name,description,categoryOffer}).save()
        //update prices of products under this category
        const products=await Product.find({category:newCategory._id})
        for(const product of products){
            await updateProductPrice(product._id)
        }
        res.json({success:true,message:"Category added Successfully"})
    } catch (error) {
        console.error("error in adding category: ",error)
        res.status(500).json({success:false,message:"Server Error"})
    }
}

const editCategory=async (req,res)=>{
try {
    const {id}=req.params
    
    const {name,description,categoryOffer}=req.body
    
    
    const duplicate=await Category.findOne({name:{ $regex: new RegExp(`^${name.trim()}$`, 'i') },_id:{$ne:id}})
    if(duplicate){
        return res.status(400).json({success:false,message:"Category name already exists"})
    }
    if(categoryOffer<0||categoryOffer>80){
            return res.status(400).json({success:false,message:"Enter a valid number for category offer "})
        }
    const updatedCategory=await Category.findByIdAndUpdate(id,{name,description,categoryOffer},{new:true})
    //update prices of products under this category
        const products=await Product.find({category:updatedCategory._id})
        for(const product of products){
            await updateProductPrice(product._id)
        }
    if(!updatedCategory){
        return res.status(404).json({success:false,message:'Category not found'})
    }
    res.json({success:true,message:'Category updated',category:updatedCategory})
} catch (error) {
    console.error("Error updating category: ",error)
    res.status(500).json({success:false,message:'Server Error'})
}
}

const softDeleteCategory=async(req,res)=>{
    try {
        const category=await Category.findById(req.params.id)
        console.log(req.params.id)
        if(!category){
            res.status(400).send("Category not found")
        }
        category.isDeleted=!category.isDeleted
        await category.save()
        return res.json({success:true,message:category.isDeleted?"Category is Deleted":"Category is restored",isDeleted:category.isDeleted})
    } catch (error) {
        console.log("error in deleting category:",error)
        return res.status(500).json({success:false,message:"Server Error"})
    }
}
export{loadCategories,addCategory,editCategory,softDeleteCategory}