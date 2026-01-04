import Coupon from "../../model/couponModel.js";

const loadCoupons=async(req,res)=>{
try {
    const coupons=await Coupon.find().sort({createdAt:-1})
    res.render('admin/coupons',{coupons})
} catch (error) {
    console.error("Error in displaying coupons: ",error);
    res.status(500).json({message:'Server Error'})
}
}
const addCoupon=async(req,res)=>{
try {
    const{code,discountType,discountValue,minPurchase,expiryDate}=req.body
    const exist=await Coupon.findOne({code:code.toUpperCase()})
    if(exist){
        return res.status(400).json({success:false,message:'Coupon code already exists'})
    }
    const newCoupon=new Coupon({
        code:code.toUpperCase(),
        discountType,
        discountValue,
        minPurchaseAmount:minPurchase,
        expiryDate:new Date(expiryDate)
    })
    await newCoupon.save()
    res.json({success:true,message:'Coupon created successfully'})
} catch (error) {
    console.error("Error in adding coupon: ",error);
    res.status(500).json({success:false,message:'Server error in adding coupon'})
}
}
const deleteCoupon=async(req,res)=>{
    try {
        await Coupon.findByIdAndDelete(req.query.id)
        res.json({success:true,message:'Coupon Deleted'})
    } catch (error) {
        console.error("Coupon deletion error: ",error);
        res.json({success:false,message:'Server Error'})
    }
}
export{loadCoupons,addCoupon,deleteCoupon}