import User from "../../model/userSchema.js";
import Coupon from "../../model/couponModel.js";

//Apply and validate coupon
const applyCoupon=async(req,res)=>{
    try {
        const{couponCode,totalAmount}=req.body
        console.log(req.body);
        
        const userId=req.session.userId
        const coupon=await Coupon.findOne({code:couponCode.toUpperCase()})
        //validate
        if(!coupon){
           return res.json({success:false,message:"Invalid Coupon Code"})
        }
        if(!coupon.isActive){
            return res.json({success:false,message:"Coupon is inactive at the moment"})
        }
        if(new Date()>coupon.expiryDate){
            return res.json({success:false,message:"Coupon has expired"})
        }
        if(coupon.usedBy.includes(userId)){
            return res.json({success:false,message:"You have already used this coupon"})
        }
        if(totalAmount<coupon.minPurchaseAmount){
            return res.json({success:false,message:`Coupon valid only for purchase on or above ${coupon.minPurchaseAmount}`})
        }
        //calculate the discount
        let discountAmount=0
        if(coupon.discountType=='fixed'){
            discountAmount=coupon.discountValue
        }else{
            discountAmount=(totalAmount*coupon.discountValue)/100
            //setting a limit for discount above 500
            if(discountAmount>500)discountAmount=500
        }
        if(discountAmount>totalAmount){
            discountAmount=totalAmount
        }
        const newTotal=totalAmount-discountAmount
        res.json({
            success:true,
            discount:discountAmount,
            totalAmount:newTotal,
            code:coupon.code,
            message:"Coupon applied successfully"
        })
    } catch (error) {
      console.error("Error in validating coupon: ",error);
      res.status(500).json({success:false,message:"Server Error"})
    }
    
}
const removeCoupon=async(req,res)=>{
    try{
        const {totalAmount}=req.body
         res.json({
           success:true,
           newTotal:totalAmount,
           message:"Coupon Removed"
          })
}catch(error){
    console.error("Error in removing the coupon: ",error);
    res.status(500).json({success:false,message:"Server Error"})
}

}
export{applyCoupon,removeCoupon}