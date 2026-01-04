
import Category from '../../model/categorySchema.js'
import Product from '../../model/productSchema.js'
import { processImages } from '../../helpers/imageProcessing.js'
import { updateProductPrice } from '../../helpers/priceCalculator.js'

const loadProducts=async(req,res)=>{
  if(!req.session.isAdmin){
 return res.redirect('/login')
  }
    try {
    const search=req.query.search||""
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // products per page
    const skip = (page - 1) * limit;
    

    const query={name:{$regex:new RegExp(search,"i")}}

    const products=await Product.find(query).sort({createdAt:-1}).skip(skip).limit(limit).populate('category')
const categories = await Category.find({ isDeleted: false });

const total=await Product.countDocuments(query)
const totalPages=Math.ceil(total/limit)
res.render('admin/productList', {products, categories,currentPage:page,totalPages,search })
    } catch (error) {
      console.error("Error loading products:", error);
    res.status(500).send("Server Error");  
    }
   
}

const loadAddProduct=async(req,res)=>{

  try {
    const categories = await Category.find({ isDeleted: false })
    res.render('admin/addProduct',{categories})
  } catch (error) {
    console.error("error in add product page",error)
  }
}
const addProduct=async (req,res)=>{
try {
  // console.log("Uploaded images",req.files)
  const { name,brand,description, price, quantity,category,productOffer } = req.body;
  if(!price||isNaN(price)||Number(price)<1){
    return res.status(400).json({success:false,priceError:true})
  }
  if(!req.files||req.files.length==0){
    return res.status(400).json({success:false,message:"Please upload a proper image file"})
  }
  const allowedTypes=["image/jpeg","image/png","image/jpg","image/webp"]
  for(const file of req.files){
    if(!allowedTypes.includes(file.mimetype)){
      return res.status(400).json({success:false,message:`${file.originalname} is not a valid image file`})
    }
  }
  const images = await processImages(req.files); // Assumes an array of images is returned
    const product = new Product({
      name,
      brand:brand,
      productDescription:description,
      price,
      quantity,
      category,
      productOffer,
      images
    });

    await product.save();
    await updateProductPrice(product._id)
    return res.status(200).json({success:true})
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({success:false,message:"Server error"});
  }

}

const editProduct=async(req,res)=>{
try {
  const product=await Product.findById(req.params.id)
  if(!product){
    return res.status(404).send("Product not found")
  }
    //remove the selected images
    if(req.body.removeImages && Array.isArray(req.body.removeImages)){
     const urlsToRemove=req.body.removeImages
     console.log('removed images: ',urlsToRemove)
     product.images=product.images.filter(
      imgUrl=>!urlsToRemove.includes(imgUrl)
     )
    }
    // console.log(product.images);
    
    //to add new images 
    let newImages=[]
    if(req.files&&req.files.length>0){
      newImages=await processImages(req.files)
      // console.log(newImages)
      product.images.push(...newImages)
    }
    product.name=req.body.name
    product.productDescription=req.body.description
    product.price=req.body.price
    product.brand=req.body.brand
    product.quantity=req.body.quantity
    product.productOffer=req.body.productOffer
    product.category=req.body.category

    await product.save()
    await updateProductPrice(product._id)
    res.redirect('/admin/products')

} catch (error) {
   console.log("error editing the product",error) 
}
}

const softDeleteProduct=async(req,res)=>{
    try {
      const product= await Product.findByIdAndUpdate(req.params.id)
      product.isDeleted=!product.isDeleted
      await product.save()
      res.status(200).json({success:true,deleted:product.isDeleted})
    } catch (error) {
        console.log("error in deleting product",error)
    }
}
export{loadProducts,addProduct,editProduct,softDeleteProduct,loadAddProduct}