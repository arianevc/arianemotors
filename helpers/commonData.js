import Category from "../model/categorySchema.js";
import User from "../model/userSchema.js";
async function getCommonData() {
    const category=await Category.find()
    return{
        categoryList:category,
        search:"",
        categoryId:"",
    }
}
export{getCommonData}