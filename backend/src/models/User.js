const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    name: { type: String, required: true },
    age: { type: Number, default: 20 },
    gender: { type: String, default: 'Male' },
    height: { type: Number, default: 170 },
    weight: { type: Number, default: 65 },
    fitnessLevel: { type: String, default: 'beginner' },
    dietaryPreferences: { type: String, default: 'Vegetarian' },
    hostel: { type: String, default: 'Hostel A' },
    department: { type: String, default: 'Computer Science' },
    year: { type: String, default: '2nd Year' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
