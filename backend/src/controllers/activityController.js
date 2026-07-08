const Activity = require('../models/Activity');

// @desc    Get all activities for a user
// @route   GET /api/activities
// @access  Private
const getActivities = async (req, res) => {
    try {
        const activities = await Activity.find({ userId: req.user._id }).sort({ date: -1 });
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add an activity
// @route   POST /api/activities
// @access  Private
const addActivity = async (req, res) => {
    try {
        const { type, duration, calories, intensity, date, notes } = req.body;

        if (!type || !duration || !calories || !date) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const activity = await Activity.create({
            userId: req.user._id,
            type,
            duration,
            calories,
            intensity,
            date,
            notes
        });

        res.status(201).json(activity);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete an activity
// @route   DELETE /api/activities/:id
// @access  Private
const deleteActivity = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);

        if (!activity) {
            return res.status(404).json({ message: 'Activity not found' });
        }

        // Make sure user owns the activity
        if (activity.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await activity.deleteOne();
        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getActivities,
    addActivity,
    deleteActivity
};
