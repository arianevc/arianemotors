
import User from '../../model/userSchema.js'
import Product from '../../model/productSchema.js'
import Order from '../../model/orderSchema.js'




const loadDashboard=async (req,res)=>{
    try{
        if(!req.session.isAdmin){
            return res.redirect('/login')
        }
       return res.render('admin/adminDashboard')
    }
    catch(error){
        console.log("Error occured: ",error)
        res.status(500).send("Server Error")
    }

}
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
const adminLogout=async (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.log("Error while destroying session",err)
            return res.redirect('/')
        }
        res.clearCookie('connect.sid')
        res.redirect('/login')
    })
}
const loadOrders = async (req, res) => {
    try {
      
        const page = parseInt(req.query.page) || 1
        const search = req.query.search || ""
        const status = req.query.status || "All"
        const sort = req.query.sort || "newest"
        const limit = 5
        const skip = (page - 1) * limit

       
        let filter = {}
        // Add status filter (if not "All")
        if (status !== "All") {
            filter.orderStatus = status
        }

        if (search) {
       
            const users = await User.find({ 
                name: { $regex: search, $options: 'i' } 
            }).select('_id')
            const userIds = users.map(u => u._id)
            
            filter.$or = [
                { orderId: { $regex: search, $options: 'i' } }, // Search by Order ID
                { userId: { $in: userIds } } // Search by User ID from the name search
            ]
        }

        // --- 3. Build the sort options ---
        let sortOption = {};
        if (sort === 'oldest') {
            sortOption = { createdAt: 1 };
        } else if (sort === 'total_asc') {
            sortOption = { totalPrice: 1 };
        } else if (sort === 'total_desc') {
            sortOption = { totalPrice: -1 };
        } else {
            sortOption = { createdAt: -1 }; // Default: newest
        }

        // --- 4. Execute queries ---
        const [orders, totalOrders] = await Promise.all([
            Order.find(filter)
                 .populate('userId', 'name email') // Get user's name/email
                 .sort(sortOption)
                 .skip(skip)
                 .limit(limit),
            Order.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalOrders / limit);

        // --- 5. Render the page or partial ---
        
        // This is the AJAX request from your frontend fetch
        if (req.xhr) {
            return res.render('partials/admin/order-table', {
                orders: orders,
                totalPages: totalPages,
                currentPage: page,
                limit: limit
                // Pass other filters if needed for pagination links
            });
        }
        
        // This is the initial page load
        res.render('admin/orders', {
            orders: orders,
            totalPages: totalPages,
            currentPage: page,
            limit: limit,
            // Pass current filter values to set in the form
            currentSearch: search,
            currentStatus: status,
            currentSort: sort
        });

    } catch (error) {
        console.error("Error loading orders:", error);
        res.status(500).send("Server Error");
    }
};

 ///Controller to update an order's status

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { newStatus } = req.body;

        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        if (newStatus === 'Delivered' && order.orderStatus !== 'Delivered') {
            for (const item of order.items) {
                // Find the product and decrease its stock
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { quantity: -item.quantity } } 
                );
            }
        }
        order.orderStatus = newStatus;
        await order.save();
        
        res.json({ success: true, message: 'Order status updated successfully.' });

    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
const loadOrderDetails=async(req,res)=>{
try {
        const { orderId } = req.params;

        
        const order = await Order.findOne({ orderId: orderId }).populate('userId', 'name email') 
        .populate('items.productId'); 
        if (!order) {
            return res.status(404).send('Order not found.');
        }

        // Render the new admin order details view
        res.render('admin/order-details', { 
            order: order
        });

    } catch (error) {
        console.error("Error loading admin order details:", error);
        res.status(500).send("Server Error");
    }
}


export {loadDashboard,loadUserList,userStatusFilter,blockUser,adminLogout,loadOrders,
    updateOrderStatus,loadOrderDetails}