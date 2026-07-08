const EnvData = require('../models/EnvData');
const axios = require('axios');

// @desc    Get current environmental data
// @route   GET /api/env
// @access  Private
const getEnvData = async (req, res) => {
    try {
        const data = await EnvData.find().sort({ date: -1 }).limit(7);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add environmental data (Admin or System)
// @route   POST /api/env
// @access  Private/Admin
const addEnvData = async (req, res) => {
    try {
        const { date, temperature, aqi, humidity, noiseLevel, crowdDensity, rainfall, windSpeed, uvIndex, zones } = req.body;

        const data = await EnvData.create({
            date,
            temperature,
            aqi,
            humidity,
            noiseLevel,
            crowdDensity,
            rainfall,
            windSpeed,
            uvIndex,
            zones
        });

        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getEnvData,
    addEnvData
};
