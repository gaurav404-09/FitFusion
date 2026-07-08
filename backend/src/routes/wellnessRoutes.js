const express = require('express');
const router = express.Router();
const { predictWellness } = require('../controllers/wellnessController');
const { protect } = require('../middleware/authMiddleware');

router.post('/predict', protect, predictWellness);

module.exports = router;
