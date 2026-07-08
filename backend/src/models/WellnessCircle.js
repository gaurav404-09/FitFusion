const mongoose = require('mongoose');

const WellnessCircleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPrivate: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('WellnessCircle', WellnessCircleSchema);
