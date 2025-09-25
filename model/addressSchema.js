const mongoose=require('mongoose')
const { type } = require('os')
const  {Schema}=mongoose

const addressSchema=new Schema({
    UserId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    address:[{
        addressType:{
            type:String,
            required:true
        },
        name:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required:true
        },
        pincode:{
            type:Number,
            required:true
        }
    }]
})
module.exports=mongoose.model('Address',addressSchema)