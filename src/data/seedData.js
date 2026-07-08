// Seed data for FitFusion - Real Data Only
import { format, subDays } from "date-fns";

const today = new Date();

// Same hash as auth service — needed for demo login
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
const DEMO_HASH = simpleHash("demo123");

// Campus metadata
export const COLLEGES = [
  // IITs
  "IIT Kharagpur",
  "IIT Bombay",
  "IIT Madras",
  "IIT Kanpur",
  "IIT Delhi",
  "IIT Guwahati",
  "IIT Roorkee",
  "IIT Ropar",
  "IIT Bhubaneswar",
  "IIT Gandhinagar",
  "IIT Hyderabad",
  "IIT Jodhpur",
  "IIT Patna",
  "IIT Indore",
  "IIT Mandi",
  "IIT (BHU) Varanasi",
  "IIT Palakkad",
  "IIT Tirupati",
  "IIT Dhanbad",
  "IIT Bhilai",
  "IIT Goa",
  "IIT Jammu",
  "IIT Dharwad",
  // NITs
  "NIT Trichy",
  "NIT Karnataka (Surathkal)",
  "NIT Rourkela",
  "NIT Warangal",
  "NIT Calicut",
  "VNIT Nagpur",
  "MNIT Jaipur",
  "NIT Kurukshetra",
  "NIT Silchar",
  "NIT Durgapur",
  "MNNIT Allahabad",
  "NIT Jalandhar",
  "NIT Meghalaya",
  "MANIT Bhopal",
  "NIT Raipur",
  "NIT Agartala",
  "NIT Goa",
  "NIT Jamshedpur",
  "NIT Patna",
  "NIT Hamirpur",
  "NIT Puducherry",
  "NIT Uttarakhand",
  "NIT Srinagar",
  "NIT Delhi",
  "NIT Mizoram",
  "NIT Nagaland",
  "NIT Manipur",
  "NIT Sikkim",
  "NIT Arunachal Pradesh",
  "NIT Andhra Pradesh",
];
export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export const BRANCHES = [
  "Material Science and Engineering",
  "Computer Science and Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electronics and Communication Engineering",
  "Electrical Engineering",
  "Chemical Engineering",
  "Information Technology",
  "Biotechnology",
  "Production and Industrial Engineering",
  "Mathematics and Computing",
  "Physics",
  "Chemistry",
  "Humanities and Social Sciences",
];

export const HOSTELS = [
  "Vindhyachal Hostel",
  "Himalaya Hostel",
  "Nilgiri Hostel",
  "Aravalli Hostel",
  "Satpura Hostel",
  "Mahendragiri Hostel",
  "Kailash Hostel",
  "Shivalik Hostel",
  "Girls Hostel A (Kasturba)",
  "Girls Hostel B (Sarojini)",
  "Girls Hostel C (Gargi)",
  "Day Scholar",
];
export const CAMPUS_ZONES = [
  "Main Ground",
  "Sports Complex",
  "Gym",
  "Library Area",
  "Food Court",
  "Academic Block",
];

// Sample users
export const SAMPLE_USERS = [
  {
    id: "user_1",
    name: "Arjun Sharma",
    email: "arjun@campus.edu",
    passwordHash: DEMO_HASH,
    age: 20,
    gender: "Male",
    height: 175,
    weight: 70,
    fitnessLevel: "intermediate",
    dietaryPreferences: "Vegetarian",
    college: "MNNIT Allahabad",
    year: "2nd Year",
    branch: "Material Science and Engineering",
    hostel: "Vindhyachal Hostel",
    role: "student",
    avatarColor: "#0077B6",
  },
  {
    id: "user_2",
    name: "Priya Patel",
    email: "priya@campus.edu",
    passwordHash: DEMO_HASH,
    age: 21,
    gender: "Female",
    height: 162,
    weight: 55,
    fitnessLevel: "beginner",
    dietaryPreferences: "Non-Vegetarian",
    college: "MNNIT Allahabad",
    year: "3rd Year",
    branch: "Computer Science and Engineering",
    hostel: "Girls Hostel A (Kasturba)",
    role: "student",
    avatarColor: "#0077B6",
  },
  {
    id: "admin_1",
    name: "Dr. Admin Kumar",
    email: "admin@campus.edu",
    passwordHash: DEMO_HASH,
    age: 35,
    gender: "Male",
    height: 178,
    weight: 80,
    fitnessLevel: "intermediate",
    dietaryPreferences: "Vegetarian",
    college: "MNNIT Allahabad",
    year: "Staff",
    branch: "Mathematics and Computing",
    hostel: "Day Scholar",
    role: "admin",
    avatarColor: "#FF6B35",
  },
];

// Food database
export const FOOD_DATABASE = [
  // Breakfast items
  {
    name: "Poha",
    calories: 250,
    protein: 5,
    carbs: 45,
    fat: 6,
    category: "breakfast",
    isVeg: true,
  },
  {
    name: "Idli Sambar (4 pcs)",
    calories: 300,
    protein: 8,
    carbs: 55,
    fat: 4,
    category: "breakfast",
    isVeg: true,
  },
  {
    name: "Paratha with Curd",
    calories: 350,
    protein: 10,
    carbs: 45,
    fat: 14,
    category: "breakfast",
    isVeg: true,
  },
  {
    name: "Bread Omelette",
    calories: 320,
    protein: 15,
    carbs: 30,
    fat: 16,
    category: "breakfast",
    isVeg: false,
  },
  {
    name: "Upma",
    calories: 220,
    protein: 6,
    carbs: 38,
    fat: 7,
    category: "breakfast",
    isVeg: true,
  },
  {
    name: "Cornflakes with Milk",
    calories: 280,
    protein: 8,
    carbs: 50,
    fat: 4,
    category: "breakfast",
    isVeg: true,
  },
  // Lunch items
  {
    name: "Rice + Dal + Sabzi",
    calories: 450,
    protein: 12,
    carbs: 75,
    fat: 8,
    category: "lunch",
    isVeg: true,
  },
  {
    name: "Roti + Paneer Curry",
    calories: 500,
    protein: 18,
    carbs: 50,
    fat: 22,
    category: "lunch",
    isVeg: true,
  },
  {
    name: "Chicken Biryani",
    calories: 550,
    protein: 25,
    carbs: 65,
    fat: 18,
    category: "lunch",
    isVeg: false,
  },
  {
    name: "Rajma Chawal",
    calories: 480,
    protein: 15,
    carbs: 70,
    fat: 10,
    category: "lunch",
    isVeg: true,
  },
  {
    name: "Chole Bhature",
    calories: 600,
    protein: 14,
    carbs: 72,
    fat: 28,
    category: "lunch",
    isVeg: true,
  },
  // Snacks
  {
    name: "Samosa (2 pcs)",
    calories: 300,
    protein: 5,
    carbs: 35,
    fat: 16,
    category: "snack",
    isVeg: true,
  },
  {
    name: "Tea + Biscuits",
    calories: 150,
    protein: 2,
    carbs: 25,
    fat: 5,
    category: "snack",
    isVeg: true,
  },
  {
    name: "Coffee",
    calories: 80,
    protein: 1,
    carbs: 12,
    fat: 3,
    category: "snack",
    isVeg: true,
  },
  {
    name: "Banana",
    calories: 105,
    protein: 1,
    carbs: 27,
    fat: 0,
    category: "snack",
    isVeg: true,
  },
  {
    name: "Protein Bar",
    calories: 200,
    protein: 20,
    carbs: 22,
    fat: 8,
    category: "snack",
    isVeg: true,
  },
  {
    name: "Maggi Noodles",
    calories: 350,
    protein: 8,
    carbs: 45,
    fat: 15,
    category: "snack",
    isVeg: true,
  },
  // Dinner items
  {
    name: "Roti + Mixed Veg",
    calories: 400,
    protein: 10,
    carbs: 55,
    fat: 12,
    category: "dinner",
    isVeg: true,
  },
  {
    name: "Egg Curry + Rice",
    calories: 480,
    protein: 18,
    carbs: 60,
    fat: 16,
    category: "dinner",
    isVeg: false,
  },
  {
    name: "Dal Fry + Jeera Rice",
    calories: 420,
    protein: 14,
    carbs: 65,
    fat: 10,
    category: "dinner",
    isVeg: true,
  },
  {
    name: "Chicken Curry + Roti",
    calories: 520,
    protein: 28,
    carbs: 45,
    fat: 20,
    category: "dinner",
    isVeg: false,
  },
  {
    name: "Dosa + Chutney",
    calories: 350,
    protein: 8,
    carbs: 50,
    fat: 12,
    category: "dinner",
    isVeg: true,
  },
];

// Generate food logs for past 30 days
// Generate real food logs (no more random generation)
export function generateFoodLogs(userId, days = 30) {
  // Return empty array - real data will come from user input
  return [];
}

// Generate real activity logs (no more random generation)
export function generateActivityLogs(userId, days = 30) {
  // Return empty array - real data will come from sensor input
  return [];
}

// Generate real mood logs (no more random generation)
export function generateMoodLogs(userId, days = 30) {
  // Return empty array - real data will come from user input
  return [];
}

// Generate real environment data (no more random generation)
export function generateEnvironmentData(days = 30) {
  // Return empty array - real data will come from API
  return [];
}

// Generate real analytics data (no more random generation)
export function generateAnalyticsData() {
  // Return empty arrays - real data will come from database aggregation
  return { collegeStats: [], weeklyTrends: [] };
}

// Wellness circles
export const WELLNESS_CIRCLES = [
  {
    id: "wc_1",
    name: "Morning Meditation",
    description: "Start your day with 15 min of guided meditation",
    schedule: "Daily 6:30 AM",
    location: "Yoga Hall",
    participants: 24,
    maxParticipants: 40,
    category: "Meditation",
  },
  {
    id: "wc_2",
    name: "Stress-Free Study Group",
    description: "Study together with wellness breaks every hour",
    schedule: "Mon, Wed, Fri 5 PM",
    location: "Library Room 3",
    participants: 15,
    maxParticipants: 20,
    category: "Study",
  },
  {
    id: "wc_3",
    name: "Sunset Yoga",
    description: "Unwind with relaxing yoga as the sun sets",
    schedule: "Tue, Thu 6 PM",
    location: "Main Ground",
    participants: 30,
    maxParticipants: 50,
    category: "Yoga",
  },
  {
    id: "wc_4",
    name: "Running Club",
    description: "Group running sessions for all fitness levels",
    schedule: "Daily 5:30 AM",
    location: "Sports Complex",
    participants: 18,
    maxParticipants: 30,
    category: "Running",
  },
  {
    id: "wc_5",
    name: "Nutrition Workshop",
    description: "Learn about balanced diet and meal planning",
    schedule: "Every Saturday 10 AM",
    location: "Seminar Hall",
    participants: 35,
    maxParticipants: 60,
    category: "Nutrition",
  },
];

// generateCampusAnalytics removed - use AnalyticsService instead
