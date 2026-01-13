import User from "../model/userSchema.js"

export default async function setLocals (req,res,next){
    res.locals.loggedUser=req.session?.loggedUser||null
    res.locals.loggedUserReferral=req.session?.loggedUserReferral||null
    res.locals.loggedUserImage=req.session?.loggedUserImage||null
    res.locals.isAdmin=req.session.isAdmin?true:false
    res.locals.cartCount=null
    res.locals.wishListCount=null
    if(req.session.userId){
        const user=await User.findById(req.session.userId)
        if(user.cart.length>0){
            res.locals.cartCount=user.cart.length
        }
        if(user.wishList.length>0){
            res.locals.wishListCount=user.wishList.length
        }
    }
    next()
}