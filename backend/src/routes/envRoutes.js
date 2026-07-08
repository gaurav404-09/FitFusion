const express = require('express');
const router = express.Router();
const { getEnvData, addEnvData } = require('../controllers/envController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getEnvData);
router.post('/', protect, admin, addEnvData);

module.exports = router;
