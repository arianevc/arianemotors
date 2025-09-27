const mongoose=require('mongoose') 
const { ref } = require('process')
// const { resetPassword } = require('../controller/controller.user')
const { type } = require('os')
const{Schema}=mongoose
const addressSchema=new Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },
    street:{
        type:String,
        required:true,
        trim:true
    },
    city:{
        type:String,
        required:true,
        trim:true
    },
    pinCode:{
        type:String,
        required:true,
        trim:true
    },
    state:{
        type:String,
        required:true,
        trim:true
    }
})
const userSchema= new Schema({
    name:{
        type:String,
        required:true,
    },
    profileImage:{
      type:String
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
    addresses:[addressSchema],
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