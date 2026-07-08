const express = require('express');
const router = express.Router();
const {
    getMoodLogs,
    addMoodLog,
    deleteMoodLog
} = require('../controllers/moodController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getMoodLogs).post(protect, addMoodLog);
router.route('/:id').delete(protect, deleteMoodLog);

module.exports = router;
