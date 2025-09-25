const mongoose=require('mongoose')
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
    // isListed:{
    //     type:Boolean,
    //     default:true
    // },
    createdAt:{
        type:Date,
        default:Date.now
    }
})
module.exports=mongoose.model('Category',categorySchema)