const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    duration: { type: Number, required: true }, // minutes
    calories: { type: Number, required: true },
    intensity: { type: String, enum: ['light', 'moderate', 'vigorous'], default: 'moderate' },
    date: { type: Date, required: true },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Activity', ActivitySchema);
