import mongoose from "mongoose"
const {Schema}=mongoose

const categorySchema= new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:false
        },
    isDeleted:{
        type:Boolean,
        default:false
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
}) 
const Category=mongoose.model('Category',categorySchema)
export default Category