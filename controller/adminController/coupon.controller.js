import Coupon from "../../model/couponModel.js";
import { paginateHelper } from "../../helpers/pagination.js";
const loadCoupons=async(req,res)=>{
try {
    const page=req.query.page
    const filter={sort:{createdAt:-1}}
    const paginatedData=await paginateHelper(Coupon,{page:page,limit:5})
    const coupons = paginatedData.results

    const totalPages=paginatedData.pagination.totalPages    
    const currentPage=paginatedData.pagination.currentPage
    res.render('admin/coupons',{coupons,totalPages,currentPage})
} catch (error) {
    console.error("Error in displaying coupons: ",error);
    res.status(500).json({message:'Server Error'})
}
}
//create a coupon
const addCoupon=async(req,res)=>{
try {
    const{code,discountType,discountValue,minPurchase,maxPurchase,expiryDate}=req.body
    console.log(req.body)
    const exist=await Coupon.findOne({code:code.toUpperCase()})
    if(exist){
        return res.status(400).json({success:false,message:'Coupon code already exists'})
    }
    if(discountType=='fixed'&& discountValue>=minPurchase){
        return res.status(400).json({success:false,message:'Discount value should not be greater than minimum purchase amount '})
    }
    if(discountType=='fixed'&& discountValue==maxPurchase){
        return res.status(400).json({success:false,message:'Discount value can not be equal to maximum purchase amount '})
    }
    const newCoupon=new Coupon({
        code:code.toUpperCase(),
        discountType,
        discountValue,
        minPurchaseAmount:minPurchase,
        maxPurchaseAmount:maxPurchase,
        expiryDate:new Date(expiryDate)
    })
    await newCoupon.save()
    res.json({success:true,message:'Coupon created successfully'})
} catch (error) {
    console.error("Error in adding coupon: ",error);
    res.status(500).json({success:false,message:'Server error in adding coupon'})
}
}
//edit a coupon
const editCoupon=async(req,res)=>{
    try {
        const couponId=req.params.id
        const{code,discountType,discountValue,minPurchase,maxPurchase,expiryDate}=req.body
        
        // Basic validation
        if (!code || !discountType || !discountValue || !minPurchase || !maxPurchase || !expiryDate) {
            return res.status(400).json({success: false, message: 'All fields are required'});
        }

        if (discountValue <= 0 || minPurchase <= 0) {
            return res.status(400).json({success: false, message: 'Values cannot be negative or zero'});
        }
        
        if (minPurchase > maxPurchase || maxPurchase <= 0) {
            return res.status(400).json({success: false, message: 'Invalid max purchase amount'});
        }

        // Check if another coupon exists with the same code (excluding the current one)
        const exist = await Coupon.findOne({
            code: code.toUpperCase(),
            _id: { $ne: couponId }
        });

        if (exist) {
            return res.status(400).json({success: false, message: 'Coupon code already exists'});
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                code: code.toUpperCase(),
                discountType,
                discountValue,
                minPurchaseAmount: minPurchase,
                maxPurchaseAmount: maxPurchase,
                expiryDate: new Date(expiryDate)
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({success: false, message: 'Coupon not found'});
        }

        res.json({success: true, message: 'Coupon updated successfully'});
    } catch (error) {
        console.error("Error in editing coupon: ", error);
        res.status(500).json({success: false, message: 'Server error in updating coupon'});
    }
}
//delete a coupon
const deleteCoupon=async(req,res)=>{
    try {
        await Coupon.findByIdAndDelete(req.query.id)
        res.json({success:true,message:'Coupon Deleted'})
    } catch (error) {
        console.error("Coupon deletion error: ",error);
        res.json({success:false,message:'Server Error'})
    }
}
export{loadCoupons,addCoupon,editCoupon,deleteCoupon}