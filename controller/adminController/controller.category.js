import Category from "../../model/categorySchema.js"

const loadCategories=async(req,res)=>{
    if(!req.session.isAdmin){
       return res.redirect('/login')
    }
    try {
        const search=req.query.search || ''
        const page=parseInt(req.query.page)|| 1
        const limit=20

        //search for a category if it is present in the DB
        const query={
            name:{$regex:new RegExp(search,'i')}
        }
        const categories=await Category.find(query)
        .sort({createdAt:-1}).skip((page-1)*limit).limit(limit)

        const total=Category.countDocuments(query)
        const totalPages=Math.ceil(total/limit)


        res.render('admin/categoryList',{categories,currentPage:page,totalPages,search})
    } catch (error) {
        console.log("Error in categories",error)
        res.status(500).send("Error in categories from server")
    }
}

const addCategory=async(req,res)=>{
    try {
        let {name,description}=req.body
        if(!name||!name.trim()){
            return res.status(400).json({success:false,message:"Category name should not be empty"})
        }
        name=name.trim()
        const existingCategory=await Category.findOne({name:{$regex:`^${name}$`,$options:"i"}})
        if(existingCategory){
            return res.status(400).json({success:false,message:"Duplicate Category not allowed"})
        }
        await new Category({name,description}).save()
        res.json({success:true,message:"Category added Successfully"})
    } catch (error) {
        console.error("error in adding category: ",error)
        res.status(500).json({success:false,message:"Server Error"})
    }
}

const editCategory=async (req,res)=>{
try {
    const {id}=req.params
    
    const {name,description}=req.body
    
    
    const duplicate=await Category.findOne({name:{ $regex: new RegExp(`^${name.trim()}$`, 'i') },_id:{$ne:id}})
    if(duplicate){
        return res.status(400).json({success:false,message:"Category name already exists"})
    }
    const updatedCategory=await Category.findByIdAndUpdate(id,{name,description},{new:true})
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