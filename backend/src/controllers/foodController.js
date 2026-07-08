const FoodLog = require('../models/FoodLog');

// @desc    Get all food logs for a user
// @route   GET /api/food
// @access  Private
const getFoodLogs = async (req, res) => {
    try {
        const foodLogs = await FoodLog.find({ userId: req.user._id }).sort({ date: -1 });
        res.status(200).json(foodLogs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add a food log
// @route   POST /api/food
// @access  Private
const addFoodLog = async (req, res) => {
    try {
        const { mealType, foodItem, calories, protein, carbs, fat, date } = req.body;

        if (!mealType || !foodItem || !calories || !date) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const foodLog = await FoodLog.create({
            userId: req.user._id,
            mealType,
            foodItem,
            calories,
            protein: protein || 0,
            carbs: carbs || 0,
            fat: fat || 0,
            date
        });

        res.status(201).json(foodLog);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a food log
// @route   DELETE /api/food/:id
// @access  Private
const deleteFoodLog = async (req, res) => {
    try {
        const foodLog = await FoodLog.findById(req.params.id);

        if (!foodLog) {
            return res.status(404).json({ message: 'Food log not found' });
        }

        if (foodLog.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await foodLog.deleteOne();
        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getFoodLogs,
    addFoodLog,
    deleteFoodLog
};
