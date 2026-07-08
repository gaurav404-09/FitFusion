const mongoose = require('mongoose');

const EnvDataSchema = new mongoose.Schema({
    aqi: { type: Number, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    noiseLevel: { type: Number, required: true }, // dB
    crowdDensity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    date: { type: Date, required: true },
}, { timestamps: true });

// Usually, EnvData is global to the campus, so no userId is needed, or we just track per specific sensor locations.
module.exports = mongoose.model('EnvData', EnvDataSchema);
