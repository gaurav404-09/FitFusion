const express = require('express');
const router = express.Router();
const { getWellnessCircles, createWellnessCircle, joinWellnessCircle } = require('../controllers/wellnessCircleController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getWellnessCircles);
router.post('/', protect, createWellnessCircle);
router.post('/:id/join', protect, joinWellnessCircle);

module.exports = router;
