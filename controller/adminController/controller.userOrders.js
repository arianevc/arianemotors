import Order from '../../model/orderSchema.js'
import Product from '../../model/productSchema.js'
import User from '../../model/userSchema.js';

//load the orders and the orderTable
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
        //if new status is delivered update the stock of product
        if (newStatus === 'Delivered' && order.orderStatus !== 'Delivered') {
            if(order.paymentMethod=='COD'){
                order.paymentStatus='Paid'
            }
            for (const item of order.items) {
                // Find the product and decrease its stock
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { quantity: -item.quantity } } 
                );
                item.itemStatus='Delivered'
            }
        }
        //refund and re-stock on the product side
        else if(newStatus==='Returned' && order.orderStatus!=='Returned'){
            const user=await User.findById(order.userId)
            if(user){
                //credit user balance
                user.wallet.balance+=order.totalPrice
                //add new transaction
                user.wallet.transactions.push({
                    amount:order.totalPrice,
                    type:'Credit',
                    description:`Refund for order:${order.orderId} `
                })
                await user.save()
                order.paymentStatus='Refunded'
            }
            //increment product stock
            for(const item of order.items){
                await Product.updateOne({_id:item.productId},{$inc:{quantity:item.quantity}})
                item.itemStatus='Returned'
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
//load individual order Details
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
//approve return of items
const returnApprove=async(req,res)=>{
try {
    const {orderId,itemId}=req.body
    const order=await Order.findOne({orderId:orderId})
    const user=await User.findById(order.userId)
    const item=order.items.id(itemId)
    if(!item||item.itemStatus!=='Return Requested'){
        return res.json({success:false,message:'Invalid Return Request'})
    }
    //refund to wallet
    const refundAmount=item.price*item.quantity
    user.wallet.balance+=refundAmount
    user.wallet.transactions.push({
        type:'Credit',
        amount:refundAmount,
        transactionId:'Nil',
        description:`Refund for the ${item.productId.name}(Order:${orderId})`
    })
    await user.save()

    //restock the product
    await Product.updateOne({_id:item.productId},{$inc:{quantity:item.quantity}})

    item.itemStatus='Returned'
    //if all items are returned
    const allReturned=order.items.every(i=>i.itemStatus=='Returned')
    if(allReturned){
        order.orderStatus='Returned'
        order.paymentStatus='Refunded'
    }
    await order.save()
    res.json({success:true,message:'Return Approved & Wallet Refunded'})
} catch (error) {
    console.error("Error in approving the return of item: ",error);
    res.status(500).json({success:false,message:'Server Error'})
}
}
export{loadOrders,updateOrderStatus,loadOrderDetails,returnApprove}
