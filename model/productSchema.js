import mongoose from 'mongoose'
import { type } from 'node:os'
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
    productOffer:{
        type:Number,
        default:0
    },
    salePrice:{
        type:Number,
        required:true,
        default:0
    }
})
const Product=mongoose.model('Product',productSchema)
export default Product