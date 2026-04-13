import mongoose from "mongoose";

const {Schema}=mongoose

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', // This creates a reference to your Product model
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity cannot be less than 1.'],
        default: 1
    }
});
const Cart=mongoose.model('Cart',cartItemSchema)
export default Cart