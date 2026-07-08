const express = require('express');
const router = express.Router();
const {
    getFoodLogs,
    addFoodLog,
    deleteFoodLog
} = require('../controllers/foodController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getFoodLogs).post(protect, addFoodLog);
router.route('/:id').delete(protect, deleteFoodLog);

module.exports = router;
