const mongoose=require('mongoose')
const dotenv=require('dotenv').config();


const connectDB=async ()=>{
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log(`DB Connected: ${mongoose.connection.host}`)
    }
    catch(error){
        console.log("DB connection error: ",error)
        process.exit(1)
    }
}
module.exports=connectDB