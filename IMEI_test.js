
// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Course = require('./models/Course');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const JWT_SECRET = 'your_jwt_secret';  // 請使用安全的金鑰


//抓取.env的密碼
const userPassword = process.env.USER_PASSWORD;
mongoose.connect(`mongodb+srv://fergus:K4RN7bg8Tuy_vhu@cluster0.aatoy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`)
.then(() => console.log('Connected to MongoDB Atlas'))
.catch((error) => console.error('Connection error', error));


// 使用者註冊
app.post('/register', async (req, res) => {
    const { username, password, deviceId } = req.body;
    try {
        const user = new User({ username, password, deviceId });
        await user.save();
        res.status(201).send('User registered successfully');
    } catch (error) {
        res.status(400).send(error.message);
    }
});

// 使用者登入
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send('Invalid credentials');
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    res.send({ token });
});

// 檢查用戶是否已註冊課程
app.post('/check-course', async (req, res) => {
    const { token, deviceId, courseCode } = req.body;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).populate('enrolledCourses');
        
        if (user.deviceId !== deviceId) {
            return res.status(403).send('Device ID does not match');
        }

        const course = await Course.findOne({ courseCode });
        if (!course) return res.status(404).send('Course not found');

        const isEnrolled = user.enrolledCourses.some(
            enrolledCourse => enrolledCourse.courseCode === courseCode
        );
        
        res.send(isEnrolled ? 'User is enrolled in this course' : 'User is not enrolled in this course');
    } catch (error) {
        res.status(400).send('Invalid token or request');
    }
});

// 註冊新課程
app.post('/create-course', async (req, res) => {
    const { courseCode, courseName } = req.body;
    try {
        const course = new Course({ courseCode, courseName });
        await course.save();
        res.status(201).send('Course created successfully');
    } catch (error) {
        res.status(400).send(error.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
