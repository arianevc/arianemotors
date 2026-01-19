import Order from "../../model/orderSchema.js"
import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import moment from "moment" // For easy date handling
import { log } from "node:console";

// --- Helper: Get Date Range based on Filter ---
const getDateRange = (filterType, startDate, endDate) => {
    let start = new Date();
    let end = new Date();
   console.log(startDate);
   console.log(endDate);
   
    if (filterType === 'daily') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (filterType === 'weekly') {
        start.setDate(start.getDate() - 7); // Last 7 days
    } else if (filterType === 'yearly') {
        start.setMonth(0, 1); // Jan 1st of current year
        start.setHours(0, 0, 0, 0);
    } else if (filterType === 'custom') {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if(end<start){
            throw new Error("End Date should be lesser than Start Date")
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
        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            orderStatus:'Delivered' // Only count delivered orders as "Sales"
        }).populate('userId', 'name email');
        console.log("fetched orders: ",orders);
        

        // Calculate Totals
        const totalSalesCount = orders.length;
        const totalOrderAmount = orders.reduce((sum, order) => sum + order.totalPrice, 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

        res.render('admin/salesReport', {
            orders,
            totalSalesCount,
            totalOrderAmount,
            totalDiscount,
            filterType: filterType || 'daily',
            startDate: startDate || moment(start).format('YYYY-MM-DD'),
            endDate: endDate || moment(end).format('YYYY-MM-DD')
        });

    } catch (error) {
        console.error("Sales Report Error:", error);
        res.status(500).send(error.message||"Server Error");
    }
};

// 2. Download PDF
const downloadPdf = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;
        const { start, end } = getDateRange(filterType, startDate, endDate);

        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            orderStatus: 'Delivered'
        });

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
        doc.text('Order ID', 150, y);
        doc.text('Total', 300, y);
        doc.text('Discount', 400, y);
        doc.text('Coupon', 500, y);
        doc.moveDown();
        doc.font('Helvetica');

        // Table Rows
        let totalAmount = 0;
        let totalDiscount = 0;

        orders.forEach(order => {
            y = doc.y;
            doc.text(moment(order.createdAt).format('DD/MM/YYYY'), 50, y);
            doc.text(order.orderId, 150, y);
            doc.text(`Rs.${order.totalPrice.toFixed(2)}`, 300, y);
            doc.text(`Rs.${order.discount.toFixed(2)}`, 400, y);
            doc.text(order.couponApplied || '-', 500, y);
            doc.moveDown();

            totalAmount += order.totalPrice;
            totalDiscount += order.discount;
        });

        // Summary
        doc.moveDown();
        doc.font('Helvetica-Bold');
        doc.text(`Total Sales Count: ${orders.length}`, 50);
        doc.text(`Total Order Amount: Rs.${totalAmount.toFixed(2)}`, 50);
        doc.text(`Total Discount: Rs.${totalDiscount.toFixed(2)}`, 50);

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
            orderStatus: 'Delivered'
        });

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
        orders.forEach(order => {
            worksheet.addRow({
                orderId: order.orderId,
                date: moment(order.createdAt).format('YYYY-MM-DD'),
                status: order.orderStatus,
                amount: order.totalPrice,
                discount: order.discount,
                coupon: order.couponApplied || 'N/A'
            });
        });

        // Add Summary Row
        worksheet.addRow({});
        worksheet.addRow({ orderId: 'Total Sales:', amount: orders.reduce((a, b) => a + b.totalPrice, 0) });

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