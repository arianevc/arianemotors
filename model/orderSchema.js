import mongoose from 'mongoose'
import { type } from 'os'
const{Schema}=mongoose

const orderSchema=new Schema({
    orderId:{
        type:String,
        required:true,
        unique:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        quantity:{
            type:Number,
            required:true,
            min:1
        },
        price:{
            type:Number,
            required:true
        }
    }],
    shippingAddress: {
        name: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true }, 
        phone: { type: String, required: true },
        email:{type:String,required:true}
    },
    orderStatus:{
        type:String,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled','Return Requested','Returned'],
        default:'Pending'
    },
    returnReason:{
        type:String,
        default:null
    },
    totalPrice:{
        type:Number,
        required:true
    },
    paymentId:{
        type:String
    },
    paymentMethod:{
        type:String,
        enum:['COD','Online','Wallet'],
        required:true
    },
    razorpayOrderId:{
        type:String,
    },
    // paymentId:{
    //     type:String,
    //     required:true
    // },
    paymentStatus:{
        type:String,
        enum:['Pending','Paid','Failed'],
        default:'Paid'
    }

},{
    timestamps:true
})
const Order=mongoose.model('Order',orderSchema)
export default Order