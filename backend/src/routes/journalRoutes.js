const express = require('express');
const router = express.Router();
const {
    getJournals,
    addJournal,
    updateJournal,
    deleteJournal
} = require('../controllers/journalController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getJournals).post(protect, addJournal);
router.route('/:id').put(protect, updateJournal).delete(protect, deleteJournal);

module.exports = router;
