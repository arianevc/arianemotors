import mongoose from 'mongoose'
const {Schema}=mongoose

const productSchema=new Schema({
    name:{
        type:String,
        required:true,
    },
    productDescription:{
        type:String,
    },
    brand:{
        type:String,

    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true,
    },
    images:{
        type:[String]
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    quantity:{
        type:Number,
    },
    price:{
        type:Number,
        required:true,
    },
    // sellPrice:{
    //     type:Number,
    //     required:true,
    // }
})
const Product=mongoose.model('Product',productSchema)
export default Product