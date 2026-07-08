const MoodLog = require('../models/MoodLog');

// @desc    Get all mood logs for a user
// @route   GET /api/mood
// @access  Private
const getMoodLogs = async (req, res) => {
    try {
        const moodLogs = await MoodLog.find({ userId: req.user._id }).sort({ date: -1 });
        res.status(200).json(moodLogs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add a mood log
// @route   POST /api/mood
// @access  Private
const addMoodLog = async (req, res) => {
    try {
        const { mood, score, notes, date } = req.body;

        if (!mood || score === undefined || !date) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const moodLog = await MoodLog.create({
            userId: req.user._id,
            mood,
            score,
            notes,
            date
        });

        res.status(201).json(moodLog);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a mood log
// @route   DELETE /api/mood/:id
// @access  Private
const deleteMoodLog = async (req, res) => {
    try {
        const moodLog = await MoodLog.findById(req.params.id);

        if (!moodLog) {
            return res.status(404).json({ message: 'Mood log not found' });
        }

        if (moodLog.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await moodLog.deleteOne();
        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getMoodLogs,
    addMoodLog,
    deleteMoodLog
};
