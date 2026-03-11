const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    date: {
        type: String, // YYYY-MM-DD for consistency
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
