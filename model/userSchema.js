const mongoose=require('mongoose') 
const { ref } = require('process')
// const { resetPassword } = require('../controller/controller.user')
const { type } = require('os')
const{Schema}=mongoose
const userSchema= new Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true,
        default:null
    },
    password:{
        type:String,
        required:false
        },
    resetPasswordToken:{
        type:String,
        default:null
    },
    resetPasswordExpires:{
        type:Date,
        default:null
    },
    wishList:[{type:mongoose.Schema.ObjectId,ref:'Product'}],
    address:{
        type:String,
        // required:false,
        default:null
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true
        // required:true,
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wallet:{
        type:Number,
        default:0
        
    },
    

})
module.exports=mongoose.model('User',userSchema)