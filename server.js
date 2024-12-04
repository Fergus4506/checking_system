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
    { id: 1, name: 'JavaScript 入門課程', description: '學習 JavaScript 的基礎知識', participants: [] ,date:[],singInSheet:[]},
    { id: 2, name: 'Node.js 進階課程', description: '深入了解 Node.js 的高級功能', participants: [],date:[] ,singInSheet:[]},
];

// 註冊使用者
app.post('/register', (req, res) => {
    const { username, phone, courseId } = req.body;
    console.log(username, phone, courseId);

    // 確保 courseId 是數字
    const courseIdNumber = parseInt(courseId, 10);

    // 找到對應的課程
    const course = courses.find(c => c.id === courseIdNumber);
    if (!course) {
        return res.status(404).json({ message: '課程未找到' });
    }
    // 將使用者加入到課程的參與者列表中
    course.participants.push({ username, phone });

    // 利用 courseId 作為 SECRET_KEY 的一部分進行加密
    const token = jwt.sign({ username }, SECRET_KEY + courseIdNumber.toString().padStart(8, '0'));

    // 將 token 回傳
    res.json({ token });
});

// 檢查使用者
app.post('/check', (req, res) => {
    const { token ,courseId} = req.body;
    console.log(courseId);
    console.log(token);

    // 確保 courseId 是數字
    const courseIdNumber = parseInt(courseId, 10);
    // 找到對應的課程
    const course = courses.find(c => c.id === courseIdNumber);
    if (!course) {
        return res.status(404).json({ message: '課程未找到' });
    }else{
        //對token進行解密並去確認是否在users裡面
        const decoded = jwt.verify(token, SECRET_KEY + courseIdNumber.toString().padStart(8, '0'));
        const user = users.find(user => user.username === decoded.username);
        
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
        participants: [],
        date:[],
        singInSheet:[]
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

// 新增上課時間
app.post('/add-course-date', (req, res) => {
    const { courseId,date } = req.body;
    const id = parseInt(courseId, 10);
    const course = courses.find(c => c.id === id);
    if (course) {
        course.date.push(date);
        course.singInSheet.push({[date]:[]});
        console.log(course);
        res.redirect(`/admin/course/${courseId}`);
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