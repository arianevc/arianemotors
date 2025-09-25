
const multer=require('multer')
const storage=multer.memoryStorage()//to store files in memory as buffer

const fileFilter=(req,file,cb)=>{
    if(file.mimetype.startsWith("image/")){
        cb(null,true)//accept the file
    }else{
        cb(new Error("Only image files are allowed!",false))//Rejects the file
    }
}
const upload=multer({
    storage,
    limits:{fileSize:5*1024*1024},
    fileFilter
})


module.exports=upload
    

