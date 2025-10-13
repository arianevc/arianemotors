const noCache=(req,res,next)=>{
    res.setHeader('Cache-Control','no-store,no-cache,must-revalidate,proxy-validate')
    res.setHeader('Pragma','no-cache')
    res.setHeader('Expires','0')
    res.setHeader('Surrogate-Control','no-store')
    next()
}
module.exports=noCache