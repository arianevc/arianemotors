import Order from "../../model/orderSchema.js"
import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import moment from "moment" // For easy date handling
import { log } from "node:console";

// --- Helper: Get Date Range based on Filter ---
const getDateRange = (filterType, startDate, endDate) => {
    let start = new Date();
    let end = new Date();   
    if (filterType === 'daily') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (filterType === 'weekly') {
        start.setDate(start.getDate() - 7); // Last 7 days
    } else if (filterType === 'monthly') {
        start.setMonth(start.getMonth() - 1); // Last 1 month
    } else if (filterType === 'yearly') {
        start.setMonth(0, 1); // Jan 1st of current year
        start.setHours(0, 0, 0, 0);
    } else if (filterType === 'custom') {
        start = new Date(startDate);
        end = new Date(endDate);
          start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error("Please select valid Start and End dates");
        }
        if(end<start){
            throw new Error("End Date should be lesser than Start Date")
        }
        if (end > todayEnd) {
            throw new Error("Future dates are not allowed. Please select today or a past date.");
        }
      
    }
    
    return { start, end };
};

// 1. Render Report Page
const loadSalesReport = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;
        
        // Default to 'daily' if no filter provided
        const { start, end } = getDateRange(filterType || 'daily', startDate, endDate);

        // Fetch Orders
        const allOrders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            orderStatus: { $in: ["Delivered", "Returned", "Cancelled"] }
        }).populate('userId', 'name email').sort({ createdAt: -1 });

        // Calculate Totals
        let totalSalesCount = 0;
        let totalOrderAmount = 0;
        let totalDiscount = 0;
        let totalReturnsAmount = 0;
        let totalCancellationsAmount = 0;

        allOrders.forEach(order => {
            if (order.orderStatus === 'Delivered') {
                totalSalesCount++;
                totalOrderAmount += order.totalPrice;
                totalDiscount += (order.discount || 0);
                
                // Account for partial item returns and cancellations within delivered orders
                order.items.forEach(item => {
                    if (item.itemStatus === 'Returned') {
                        totalReturnsAmount += (item.price * item.quantity);
                    } else if (item.itemStatus === 'Cancelled') {
                        totalCancellationsAmount += (item.price * item.quantity);
                    }
                });
            } else if (order.orderStatus === 'Returned') {
                totalReturnsAmount += order.totalPrice; // If full order is returned
            } else if (order.orderStatus === 'Cancelled') {
                totalCancellationsAmount += order.totalPrice; // If full order is cancelled
            }
        });

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const totalDocuments = allOrders.length;
        let totalPages = Math.ceil(totalDocuments / limit);
        if (totalPages === 0) totalPages = 1;

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const pagedOrders = allOrders.slice(startIndex, endIndex);

        res.render('admin/salesReport', {
            orders: pagedOrders,
            totalSalesCount,
            totalOrderAmount,
            totalDiscount,
            totalReturnsAmount,
            totalCancellationsAmount,
            filterType: filterType || 'daily',
            startDate: startDate || moment(start).format('YYYY-MM-DD'),
            endDate: endDate || moment(end).format('YYYY-MM-DD'),
            currentPage: page,
            totalPages: totalPages
        });

    } catch (error) {
        console.error("Sales Report Error:", error);
      res.render('admin/salesReport', {
            orders: [],
            totalSalesCount: 0,
            totalOrderAmount: 0,
            totalDiscount: 0,
            totalReturnsAmount: 0,
            totalCancellationsAmount: 0,
            filterType: req.query.filterType || 'daily',
            startDate: req.query.startDate || '',
            endDate: req.query.endDate || '',
            currentPage: 1,
            totalPages: 1,
            errorMessage: error.message 
        });
    }
};

// 2. Download PDF
const downloadPdf = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;
        const { start, end } = getDateRange(filterType, startDate, endDate);

        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            orderStatus: { $in: ["Delivered", "Returned", "Cancelled"] }
        }).sort({ createdAt: -1 });

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date Range: ${moment(start).format('DD/MM/YYYY')} - ${moment(end).format('DD/MM/YYYY')}`, { align: 'center' });
        doc.moveDown();

        // Table Header
        let y = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Date', 50, y);
        doc.text('Order ID', 120, y);
        doc.text('Status', 220, y);
        doc.text('Total', 320, y);
        doc.text('Discount', 400, y);
        doc.text('Coupon', 480, y);
        doc.moveDown();
        doc.font('Helvetica');

        // Table Rows
        let totalSalesCount = 0;
        let totalAmount = 0;
        let totalDiscount = 0;
        let totalReturnsAmount = 0;
        let totalCancellationsAmount = 0;

        orders.forEach(order => {
            y = doc.y;
            doc.text(moment(order.createdAt).format('DD/MM/YYYY'), 50, y);
            doc.text(order.orderId, 120, y);
            doc.text(order.orderStatus, 220, y);
            doc.text(`Rs.${order.totalPrice.toFixed(2)}`, 320, y);
            doc.text(`Rs.${(order.discount || 0).toFixed(2)}`, 400, y);
            doc.text(order.couponApplied || '-', 480, y);
            doc.moveDown();

            if (order.orderStatus === 'Delivered') {
                totalSalesCount++;
                totalAmount += order.totalPrice;
                totalDiscount += (order.discount || 0);
                
                order.items.forEach(item => {
                    if (item.itemStatus === 'Returned') {
                        totalReturnsAmount += (item.price * item.quantity);
                    } else if (item.itemStatus === 'Cancelled') {
                        totalCancellationsAmount += (item.price * item.quantity);
                    }
                });
            } else if (order.orderStatus === 'Returned') {
                totalReturnsAmount += order.totalPrice;
            } else if (order.orderStatus === 'Cancelled') {
                totalCancellationsAmount += order.totalPrice;
            }
        });

        // Summary
        doc.moveDown();
        doc.font('Helvetica-Bold');
        doc.text(`Total Sales Count: ${totalSalesCount}`, 50);
        doc.text(`Total Order Amount: Rs.${totalAmount.toFixed(2)}`, 50);
        doc.text(`Total Discount: Rs.${totalDiscount.toFixed(2)}`, 50);
        doc.text(`Total Returns: Rs.${totalReturnsAmount.toFixed(2)}`, 50);
        doc.text(`Total Cancellations: Rs.${totalCancellationsAmount.toFixed(2)}`, 50);

        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).send("Error generating PDF");
    }
};

// 3. Download Excel
const downloadExcel = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;
        const { start, end } = getDateRange(filterType, startDate, endDate);

        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            orderStatus: { $in: ["Delivered", "Returned", "Cancelled"] }
        }).sort({ createdAt: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Define Columns
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Total Amount', key: 'amount', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Coupon Code', key: 'coupon', width: 20 }
        ];

        // Add Data
        let totalAmount = 0;
        let totalReturns = 0;
        let totalCancellations = 0;

        orders.forEach(order => {
            worksheet.addRow({
                orderId: order.orderId,
                date: moment(order.createdAt).format('YYYY-MM-DD'),
                status: order.orderStatus,
                amount: order.totalPrice,
                discount: order.discount || 0,
                coupon: order.couponApplied || 'N/A'
            });

            if (order.orderStatus === 'Delivered') {
                totalAmount += order.totalPrice;
                order.items.forEach(item => {
                    if (item.itemStatus === 'Returned') {
                        totalReturns += (item.price * item.quantity);
                    } else if (item.itemStatus === 'Cancelled') {
                        totalCancellations += (item.price * item.quantity);
                    }
                });
            } else if (order.orderStatus === 'Returned') {
                totalReturns += order.totalPrice;
            } else if (order.orderStatus === 'Cancelled') {
                totalCancellations += order.totalPrice;
            }
        });

        // Add Summary Row
        worksheet.addRow({});
        worksheet.addRow({ orderId: 'Total Sales Revenue:', amount: totalAmount });
        worksheet.addRow({ orderId: 'Total Returns Amount:', amount: totalReturns });
        worksheet.addRow({ orderId: 'Total Cancellations Amount:', amount: totalCancellations });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(error);
        res.status(500).send("Error generating Excel");
    }
};

export{ loadSalesReport, downloadPdf, downloadExcel };