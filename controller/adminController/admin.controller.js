
import User from '../../model/userSchema.js'
import Order from '../../model/orderSchema.js'
import { processChartData } from '../../helpers/chartCreation.js'
import Product from '../../model/productSchema.js'
import Category from '../../model/categorySchema.js'
//load admin Dashboard
const loadDashboard=async (req,res)=>{
    try{

        //calculate total revenue
        const revenueResult=await Order.aggregate([
            {$match:{
                orderStatus:{$nin:['Cancelled','Returned','Failed']}
            }},
            {$group:{
                _id:null,
                total:{$sum:'$totalPrice'}
            }}
        ])
        const totalRevenue=revenueResult.length>0?revenueResult[0].total:0
        //other datas
        const totalOrders=await Order.countDocuments({orderStatus:{$ne:'Cancelled'}})
        const totalProducts=await Product.countDocuments({isDeleted:false})
        const totalCategories=await Category.countDocuments({isDeleted:false})
        //calculate monthly revenue
        const currentMonthStart=new Date(new Date().getFullYear(),new Date().getMonth(),1)
        const monthlyEarningsResult=await Order.aggregate([
            {
                $match:{
                    createdAt:{$gte:currentMonthStart},
                    orderStatus:{$nin:['Cancelled','Returned']}
                }
            },
            {$group:{
                _id:null,
                total:{$sum:'$totalPrice'}
            }}
        ])
        const monthlyEarnings=monthlyEarningsResult.length>0?monthlyEarningsResult[0].total:0
        //show top 10 products
        const topProducts=await Order.aggregate([
            {$unwind:"$items"},
            {$group:{
                _id:"$items.productId",
                totalSold:{$sum:"$items.quantity"}
            }},
            {$sort:{totalSold:-1}},
            {$limit:10},
            {$lookup:{from:'products',localField:'_id',foreignField:'_id',as:'productInfo'}},
            {$unwind:'$productInfo'},
            {$project:{productName:'$productInfo.name',totalSold:1}}
        ])
        //show top 10 Brands
        const topBrands=await Order.aggregate([
            {$unwind:"$items"},
            {$lookup:{from:'products',localField:'items.productId',foreignField:'_id',as:'product'}},
            {$unwind:'$product'},
            {$group:{
                _id:'$product.brand',
                totalSold:{$sum:"$items.quantity"}
            }},
            {$sort:{totalSold:-1}},
            {$limit:10}
        ])
        //show top 10 categories
        const topCategories=await Order.aggregate([
            {$unwind:'$items'},
            {$lookup:{from:'products',localField:'items.productId',foreignField:'_id',as:'product'}},
            {$unwind:"$product"},
            {$lookup:{from:'categories',localField:'product.category',foreignField:'_id',as:'category'}},
            {$group:{
                _id:"$category._id",
                categoryName:{$first:"$category.name"},
                totalSold:{$sum:"$items.quantity"}
            }},
            {$sort:{totalSold:-1}},
            {$limit:10}
        ])
       return res.render('admin/adminDashboard',{topProducts,topBrands,topCategories,totalRevenue,totalOrders,totalProducts,totalCategories,monthlyEarnings})
    }
    catch(error){
        console.log("Error occured: ",error)
        res.status(500).send("Server Error")
    }

}
//get the data for the dashboard chart
const getChart=async(req,res)=>{
    try {
        const {filter}=req.query
        let startDate=new Date()
        let endDate=new Date()
        let groupFormat=""

        if(filter==='yearly'){
            startDate=new Date(new Date().getFullYear()-1,0,1)//from Jan 1st of 2025
            groupFormat='%Y-%m'//group by YYYY-MM
        }else if(filter==='monthly'){
            startDate=new Date(new Date().getFullYear(),new Date().getMonth(),1)//from the first of the month
            groupFormat='%Y-%m-%d'
        }else if(filter==='weekly'){
            startDate.setDate(startDate.getDate()-7)
            groupFormat='%Y-%m-%d'
        }

        //aggregate the data
        const salesData=await Order.aggregate([
            {
                $match:{
                    createdAt:{$gte:startDate,$lte:endDate},
                    orderStatus:{$ne:'Cancelled'}
                }
            },
            {
                $group:{
                    _id:{$dateToString:{format:groupFormat,date:"$createdAt"}},
                    totalSales:{$sum:'$totalPrice'}
                }
            },
            {$sort:{_id:-1}}
        ])
        const result=processChartData(salesData,filter,startDate,endDate)
        res.json(result)
    } catch (error) {
        console.error("Error in getting the data for the chart: ",error);
        res.status(500).json({error:"Internal Server Error"})
    }
}
//load registered users with pagination logic
const loadUserList=async(req,res)=>{

    try {
        const search=req.query.search||""
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // users per page
    const skip = (page - 1) * limit;
        const allUsers=await User.find({isAdmin:0}).skip(skip).limit(limit)
        const total=await User.find({isAdmin:0}).countDocuments()
        // console.log(total);
        const totalPages=Math.ceil(total/limit)
        res.render('admin/usersList',{users:allUsers,search,currentPage:page,totalPages})
    } catch (error) {
        console.error("Error in rendering usersList",error)
        return res.status(500).send("Server Error")
    }
}
//Filter based search on the user
const userStatusFilter=async (req,res)=>{
    
    try {
        
        const status=req.query.status
        const search=req.query.search
        const page=parseInt(req.query.page)||1
        const limit=5
        const skip=(page-1)*limit
        let query={isAdmin:0}
        if(status=="blocked"){
            query.isBlocked=true
        }else if(status=="unblocked"){
            query.isBlocked=false
        }
        if(search){
            query.$or=[
                {name:{$regex:search,$options:'i'}},
                {email:{$regex:search,$options:'i'}}
            ]
        }

        const total=await User.find(query).countDocuments()
        const totalPages=Math.ceil(total/limit)
        const user=await User.find(query).sort({createdAt:-1}).skip(skip).limit(limit)
        return res.json({users:user,totalPages:totalPages,currentPage:page})
    } catch (error) {
        console.log('Error displaying users',error)
        return res.status(500).send("Server Error")
    }
}
//change the status of user to "Block" or "Unblock"
const blockUser=async (req,res)=>{
try {
    // console.log("BLOCK USER REQUEST RECEIVED FOR ID:", req.params.id);
    const user=await User.findById(req.params.id)
    user.isBlocked=!user.isBlocked
    await user.save()
    res.redirect('/admin/users')
   

} catch (error) {
    console.log("Error while updating user status",error)
    res.status(500).send("Error in update userstatus")
}
}
//logout for admin
const adminLogout=async (req,res)=>{
    if(req.session.userId) {
        delete req.session.adminId;
        req.session.save((err) => {
            if(err) console.log("Error saving session", err);
            res.redirect('/login');
        });
    } else {
        req.session.destroy((err)=>{
            if(err){
                console.log("Error while destroying session",err)
                return res.redirect('/')
            }
            res.clearCookie('user.sid')
            res.redirect('/login')
        })
    }
}


export {loadDashboard,getChart,loadUserList,userStatusFilter,blockUser,adminLogout}