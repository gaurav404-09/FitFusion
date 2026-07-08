const express = require('express');
const router = express.Router();
const {
    getActivities,
    addActivity,
    deleteActivity
} = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getActivities).post(protect, addActivity);
router.route('/:id').delete(protect, deleteActivity);

module.exports = router;
