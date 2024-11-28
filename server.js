const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = 3000;
const SECRET_KEY = '5000';

// 設置 EJS 為模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 解析 JSON 和 URL-encoded 請求
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // 處理 base64 圖像數據

// 提供靜態文件
app.use(express.static(path.join(__dirname, 'public')));

// 模擬的使用者資料庫
const users = [];

// 模擬的課程資料庫
const courses = [
    { id: 1, name: 'JavaScript 入門課程', description: '學習 JavaScript 的基礎知識', participants: [] },
    { id: 2, name: 'Node.js 進階課程', description: '深入了解 Node.js 的高級功能', participants: [] },
    // 可以添加更多課程
];

// 註冊使用者
app.post('/register', (req, res) => {
    const { username, phone,id } = req.body;

    users.push({ username, phone });
    const course = courses.find(c => c.id === id);  // 找到該課程
    course.participants.push({ username, phone });  // 將使用者加入該課程的參與者中
    // 利用JWT對SECRET_KEY進行加密
    const token = jwt.sign({ username }, SECRET_KEY);
    // 將token回傳
    res.json({ token });
});

// 檢查使用者
app.post('/check', (req, res) => {
    const { token } = req.body;
    console.log(token);
    //對token進行解密並去確認是否在users裡面
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = users.find(user => user.username === decoded.username);
    console.log(user);
    //如果有找到就回傳該使用者的資料
    if (user) {
        res.json({message: 'success'});
    } else {
        res.status(401).json({ message: 'Invalid token' });
    }
});

// 動態生成課程頁面
app.get('/course/:id', (req, res) => {
    const courseId = parseInt(req.params.id, 10);
    const course = courses.find(c => c.id === courseId);
    if (course) {
        res.render('course', { course });
    } else {
        res.status(404).send('課程未找到');
    }
});

// 新增課程頁面
app.get('/add-course', (req, res) => {
    res.render('add-course',{courses});
});

// 處理新增課程的請求
app.post('/add-course', (req, res) => {
    const { name, description } = req.body;
    const newCourse = {
        id: courses.length + 1,
        name,
        description,
        participants: []
    };
    courses.push(newCourse);
    res.redirect(`/add-course`);
});

// 管理者頁面
app.get('/admin/course/:id', (req, res) => {
    const courseId = parseInt(req.params.id, 10);
    const course = courses.find(c => c.id === courseId);
    if (course) {
        res.render('admin-course', { course });
    } else {
        res.status(404).send('課程未找到');
    }
});

//建立課程的QRcode
app.get('/course/:id/qrcode', async (req, res) => {
    try{
        //抓取相對應課程的URL
        const courseId = parseInt(req.params.id, 10);
        const URL = `http://localhost:3000/course/${courseId}`;
        const qrCodeImage= await QRCode.toDataURL(URL);
        res.send(`<img src="${qrCodeImage}" alt="QR Code"/>`);
    }catch(err){
        console.error(err);
    }

});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});