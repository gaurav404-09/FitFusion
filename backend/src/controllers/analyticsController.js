const User = require('../models/User');
const Activity = require('../models/Activity');
const FoodLog = require('../models/FoodLog');
const MoodLog = require('../models/MoodLog');

// @desc    Get anonymized campus-wide analytics
// @route   GET /api/analytics/campus
// @access  Private
const getCampusAnalytics = async (req, res) => {
    try {
        // 1. Hostel-wise Activity Minutes (Average)
        const hostelStats = await User.aggregate([
            {
                $lookup: {
                    from: 'activities',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'activities'
                }
            },
            {
                $group: {
                    _id: '$hostel',
                    avgActivityMinutes: {
                        $avg: {
                            $cond: [
                                { $gt: [{ $size: '$activities' }, 0] },
                                { $sum: '$activities.duration' },
                                0
                            ]
                        }
                    },
                    activeUsers: { $sum: 1 }
                }
            },
            {
                $project: {
                    hostel: '$_id',
                    avgActivityMinutes: { $round: ['$avgActivityMinutes', 0] },
                    activeUsers: 1,
                    participationRate: { $multiply: [{ $divide: ['$activeUsers', 10] }, 100] } // Mocked denominator for demo
                }
            },
            { $sort: { avgActivityMinutes: -1 } }
        ]);

        // 2. Department-wise Activity
        const departmentStats = await User.aggregate([
            {
                $lookup: {
                    from: 'activities',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'activities'
                }
            },
            {
                $group: {
                    _id: '$department',
                    avgActivityMinutes: { $avg: { $sum: '$activities.duration' } },
                    totalActivities: { $sum: { $size: '$activities' } }
                }
            },
            {
                $project: {
                    department: '$_id',
                    avgActivityMinutes: { $round: ['$avgActivityMinutes', 0] },
                    participationRate: { $min: [{ $multiply: ['$totalActivities', 10] }, 100] }
                }
            },
            { $sort: { avgActivityMinutes: -1 } }
        ]);

        // 3. Weekly Trends (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const weeklyTrends = await Activity.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalActivities: { $sum: 1 },
                    avgCalories: { $avg: "$calories" }
                }
            },
            {
                $project: {
                    date: '$_id',
                    totalActivities: 1,
                    avgCalories: { $round: ['$avgCalories', 0] },
                    day: { $literal: 'Day' } // Placeholder for day name
                }
            },
            { $sort: { date: 1 } }
        ]);

        res.status(200).json({
            hostelStats: hostelStats.filter(h => h.hostel),
            departmentStats: departmentStats.filter(d => d.department),
            weeklyTrends
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getCampusAnalytics
};
