const express = require('express');
const router = express.Router();
const { getCampusAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/campus', protect, getCampusAnalytics);

module.exports = router;
