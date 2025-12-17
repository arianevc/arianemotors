import User from "../../model/userSchema.js"
import { getCommonData } from "../../helpers/commonData.js"
import Razorpay from "razorpay"
import crypto from "crypto"

//create an instance of razorpay
const razorpayInstance=new Razorpay({
    key_id:process.env.RAZORPAY_API_TEST_KEY_ID,
    key_secret:process.env.RAZORPAY_API_TEST_SECRET_KEY
})
//load the wallet details of the user
const loadWallet=async(req,res)=>{
    try {
        const user=await User.findById(req.session.userId)
        console.log("balance: ",user.wallet.balance)
        let transactions=[]
        if(user.wallet.transactions.length>0){
            transactions=user.wallet.transactions.sort((a,b)=>{
                return new Date(b.date)-new Date(a.date)
            })
        }
        const commonData=await getCommonData()
        res.render('user/wallet',{categoryId:'',categoryList:commonData.categoryList,search:"",
            user:user,
            transactions,
            razorpayKeyId:process.env.RAZORPAY_API_TEST_KEY_ID
        })
    } catch (error) {
        console.error("Error in loading wallet: ",error);
        res.status(500).render('user/error',{statusCode:500,statusMessage:"Problem in loading Wallet"})
    }
}
//create razorpay order to recharge wallet
const rechargeWallet=async(req,res)=>{
try {
    const {amount}=req.body
    const options={
        amount:amount*100,
        currency:'INR',
        receipt:`wallet_recharge_${Date.now()}`
    }
    razorpayInstance.orders.create(options,(err,order)=>{
        if(err){
            console.error("Razorpay Error: ",err);
            return res.json({success:false,message:"Razorpay Error"})
        }
        res.json({success:true,order})
    })
} catch (error) {
    console.error("Error in recharging wallet: ",error)
    res.status(500).json({success:false,message:"Error in Recharging wallet"})
}
}
//verify and complete the wallet recharge
const verifyWalletPayment=async(req,res)=>{
try {
    const{razorpay_payment_id,razorpay_order_id,razorpay_signature,amount}=req.body
    const body=razorpay_order_id+"|"+razorpay_payment_id
    const expectedSignature=crypto.createHmac('sha256',process.env.RAZORPAY_API_TEST_SECRET_KEY)
    .update(body.toString()).digest('hex')
    if(expectedSignature==razorpay_signature){
        const user=await User.findById(req.session.userId)
        user.wallet.balance+=parseFloat(amount)
        user.wallet.transactions.push({
            amount:amount,
            type:"Credit",
            description:'Wallet Recharge',
            transactionId:razorpay_payment_id
        })
        await user.save()
        res.json({success:true,message:"Wallet recharged successfully"})
    }else{
        res.json({success:false,message:"Payment Verification failed"})
    }
} catch (error) {
    console.error("Error in Verifying payment: ",error);
    res.status(500).json({success:false,message:"Error in Verifying payment"})
}
}

export{loadWallet,rechargeWallet,verifyWalletPayment}