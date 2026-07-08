const WellnessCircle = require('../models/WellnessCircle');

// @desc    Get all wellness circles
// @route   GET /api/wellness-circles
// @access  Private
const getWellnessCircles = async (req, res) => {
    try {
        const circles = await WellnessCircle.find().populate('creator', 'name');
        res.status(200).json(circles);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a wellness circle
// @route   POST /api/wellness-circles
// @access  Private
const createWellnessCircle = async (req, res) => {
    try {
        const { name, description, isPrivate } = req.body;

        const circle = await WellnessCircle.create({
            name,
            description,
            isPrivate,
            creator: req.user._id,
            members: [req.user._id]
        });

        res.status(201).json(circle);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Join a wellness circle
// @route   POST /api/wellness-circles/:id/join
// @access  Private
const joinWellnessCircle = async (req, res) => {
    try {
        const circle = await WellnessCircle.findById(req.params.id);

        if (!circle) {
            return res.status(404).json({ message: 'Circle not found' });
        }

        if (circle.members.includes(req.user._id)) {
            return res.status(400).json({ message: 'Already a member' });
        }

        circle.members.push(req.user._id);
        await circle.save();

        res.status(200).json(circle);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getWellnessCircles,
    createWellnessCircle,
    joinWellnessCircle
};
