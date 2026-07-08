const Journal = require('../models/Journal');

// @desc    Get all journals for a user
// @route   GET /api/journals
// @access  Private
const getJournals = async (req, res) => {
    try {
        const journals = await Journal.find({ userId: req.user._id }).sort({ date: -1 });
        res.status(200).json(journals);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add a journal
// @route   POST /api/journals
// @access  Private
const addJournal = async (req, res) => {
    try {
        const { title, content, date } = req.body;

        if (!title || !content || !date) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const journal = await Journal.create({
            userId: req.user._id,
            title,
            content,
            date
        });

        res.status(201).json(journal);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a journal
// @route   PUT /api/journals/:id
// @access  Private
const updateJournal = async (req, res) => {
    try {
        const journal = await Journal.findById(req.params.id);

        if (!journal) {
            return res.status(404).json({ message: 'Journal not found' });
        }

        if (journal.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const updatedJournal = await Journal.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.status(200).json(updatedJournal);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a journal
// @route   DELETE /api/journals/:id
// @access  Private
const deleteJournal = async (req, res) => {
    try {
        const journal = await Journal.findById(req.params.id);

        if (!journal) {
            return res.status(404).json({ message: 'Journal not found' });
        }

        if (journal.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await journal.deleteOne();
        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getJournals,
    addJournal,
    updateJournal,
    deleteJournal
};
