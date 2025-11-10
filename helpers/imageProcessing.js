import sharp from 'sharp'
import { v2 as cloudinary } from 'cloudinary'

function uploadToCloudinary(fileBuffer,options){
    return new Promise((resolve,reject)=>{
        const uploadStream=cloudinary.uploader.upload_stream(
            options,
            (error,result)=>{
                if(error){
                    return reject(error)
                }
                resolve(result)
            }
        )
        sharp(fileBuffer).pipe(uploadStream)
    })
}


async function processImages(files) {
    const imagePaths=[]
    for(const file of files){
        const processedBuffer=await sharp(file.buffer)
        .resize(500,500,{
            fit:sharp.fit.cover,
            position:sharp.strategy.entropy
        })
        .webp({quality:80})
        .toBuffer()
        const result=await uploadToCloudinary(processedBuffer,{
            folder:'product_images'
        })
        imagePaths.push(result.secure_url)//store the url
    }
    return imagePaths
}
async function processProfileImage(file) {
    if(!file){
        throw new Error('No file provided for processing')
    }
    //resize/compress with sharp

    const processedBuffer=await sharp(file.buffer)
    .resize(250,250,{fit:'cover'})
    .webp({quality:90})
    .toBuffer()//get the processed image as a buffer

    //uploads buffer to Cloudinary
    const result=await uploadToCloudinary(processedBuffer,{
        folder:'profile_images'
    })
    return result.secure_url//return https url
}
export{processImages,processProfileImage}