const mongoose = require('mongoose');

const MoodLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mood: { type: String, enum: ['Great', 'Good', 'Okay', 'Bad', 'Terrible'], required: true },
    score: { type: Number, required: true },
    notes: { type: String },
    date: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('MoodLog', MoodLogSchema);
