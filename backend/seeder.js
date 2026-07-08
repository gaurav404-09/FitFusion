const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const seedDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/fitfusion')
        console.log('MongoDB Connected correctly to server');

        await User.deleteMany();

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('demo123', salt);

        const users = [
            {
                name: 'Arjun Singh',
                email: 'arjun@campus.edu',
                passwordHash: passwordHash,
                role: 'student',
                age: 20,
                gender: 'Male',
                height: 175,
                weight: 68,
                fitnessLevel: 'intermediate',
                dietaryPreferences: 'Vegetarian',
                hostel: 'Hostel A',
                department: 'Computer Science',
                year: '2nd Year',
            },
            {
                name: 'Campus Admin',
                email: 'admin@campus.edu',
                passwordHash: passwordHash,
                role: 'admin',
                age: 35,
                gender: 'Female',
                height: 165,
                weight: 60,
                fitnessLevel: 'advanced',
                dietaryPreferences: 'Any',
                hostel: 'Admin Block',
                department: 'Sports Council',
                year: 'Staff',
            },
        ];

        await User.insertMany(users);
        console.log('Users seeded successfully');

        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedDB();
