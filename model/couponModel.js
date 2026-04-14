import mongoose from "mongoose";


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
maxPurchaseAmount:{
    type:Number,
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