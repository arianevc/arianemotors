import Category from "../model/categorySchema.js";
import Product from "../model/productSchema.js";

const updateProductPrice=async(productId)=>{
try {
    const product=await Product.findById(productId).populate('category')
    if(!product)return
     //calculate offers 
    const categoryOffer=product.category?.categoryOffer||0
    const productOffer=product.productOffer||0
    //calculate the largest offer
    const bestOffer=Math.max(categoryOffer,productOffer)
    let newSalePrice=product.price
    if(bestOffer>0){
        const discountAmount=(bestOffer*product.price)/100
        newSalePrice=Math.floor(product.price-discountAmount)
    }
    product.salePrice=Math.floor(newSalePrice)
    // console.log("updated sale price of the product: ",product.salePrice);
    
    await product.save()
} catch (error) {
    console.error("Error in updating prices: ",error);
}
}
export{updateProductPrice}