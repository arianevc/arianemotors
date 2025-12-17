export default function setLocals(req,res,next){
    res.locals.loggedUser=req.session?.loggedUser||null
    res.locals.loggedUserImage=req.session?.loggedUserImage||null
    res.locals.isAdmin=req.session.isAdmin?true:false
    next()
}