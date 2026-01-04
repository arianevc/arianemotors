import { timeStamp } from 'console';
import mongoose from 'mongoose'
import { type } from 'os';
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
const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', // This creates a reference to your Product model
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity cannot be less than 1.'],
        default: 1
    }
});
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
    wishList:[{
        type:mongoose.Schema.ObjectId,
        ref:'Product'
    }],
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
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[cartItemSchema],
    wallet:{
        balance:{
            type:Number,
            default:0
        },
        transactions:[{
            amount:{
                type:Number,
                required:true
            },
            type:{
                type:String,
                enum:['Credit','Debit'],
                required:true,
            },
                date:{
                    type:Date,
                    default:Date.now()
            },
            description:{
                type:String,
                required:true
            },
            transactionId:{
                type:String
            }
        }]
        
    }
},{timestamps:true})
const User=mongoose.model('User',userSchema)
export default User