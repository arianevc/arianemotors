import mongoose from "mongoose";
import { ref } from "node:process";

const couponSchema=new mongoose.Schema({
code:{
    type:String,
    required:true,
    uppercase:true,
    unique:true,
    trim:true
},
discountType:{
    type:String,
    enum:['percentage','fixed'],
    default:'fixed'
},
discountValue:{
    type:Number,
    required:true
},
minPurchaseAmount:{
    type:Number,
    required:true
},
expiryDate:{
    type:Date,
    required:true
},
usedBy:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User'
}],
isActive:{
    type:Boolean,
    default:true
}
},{
    timestamps:true
})
const Coupon=mongoose.model('Coupon',couponSchema)
export default Coupon