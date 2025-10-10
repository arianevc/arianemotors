const sharp=require('sharp')
const fs=require('fs')
const path=require('path')

async function processImages(files) {
    const imagePaths=[]
    for(let i=0;i<files.length;i++){
        const filename=`product-${Date.now()}-${i}.jpeg`
        const outputPath=path.join('public/uploads/products',filename)

        fs.mkdirSync(path.dirname(outputPath),{recursive:true})//to ensure the directory exists

        await sharp(files[i].buffer)
        .resize(500,500,{
            fit:sharp.fit.cover,
            position:sharp.strategy.entropy
        })
        .jpeg({quality:80})
        .toFile(outputPath)

        imagePaths.push(`uploads/products/${filename}`)
    }
    return imagePaths
}
async function processProfileImage(file) {
    if(!file){
        throw new Error('No file provided for processing')
    }
    const filename=`profile-${Date.now()}.jpeg`
    const outputPath=path.join('public/uploads/profile_images',filename)

    fs.mkdirSync(path.dirname(outputPath),{recursive:true})//to make sure directory exists

    //Process the image buffer with sharp
    await sharp(file.buffer)
    .resize(250,250,{
        fit:'cover',
    })
    .jpeg({quality:90})
    .toFile(outputPath)
    return `uploads/profile_images/${filename}`
}
module.exports={processImages,processProfileImage}