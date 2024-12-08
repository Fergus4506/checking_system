const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const QRCode = require('qrcode');
const { Sequelize, DataTypes } = require('sequelize');

// 初始化 Express 和資料庫
const app = express();
const PORT = 3000;
const SECRET_KEY = '5000';

// 設定 Sequelize 與 MySQL
const sequelize = new Sequelize('courses_app', 'root', 'Fergus5211', {
    host: '127.0.0.1',
    dialect: 'mysql',
});

// 定義模型
const Course = sequelize.define('Course', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
});
const CourseDate = sequelize.define('CourseDate', {
    date: { type: DataTypes.DATEONLY, allowNull: false },
});
const Participant = sequelize.define('Participant', {
    username: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING },
});
const SignInSheet = sequelize.define('SignInSheet', {
    check_time: { type: DataTypes.DATE, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false },
});

// 設定模型關聯
Course.hasMany(CourseDate, { foreignKey: 'course_id' });
CourseDate.belongsTo(Course, { foreignKey: 'course_id' });

Course.hasMany(Participant, { foreignKey: 'course_id' });
Participant.belongsTo(Course, { foreignKey: 'course_id' });

CourseDate.hasMany(SignInSheet, { foreignKey: 'course_date_id' });
SignInSheet.belongsTo(CourseDate, { foreignKey: 'course_date_id' });

// 設置 EJS 為模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 解析 JSON 和 URL-encoded 請求
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 提供靜態文件
app.use(express.static(path.join(__dirname, 'public')));

// 初始化資料庫並同步模型
(async () => {
    try {
        await sequelize.authenticate();
        console.log('資料庫連線成功');
        await sequelize.sync({ alter: true });
        console.log('資料庫同步完成');
    } catch (error) {
        console.error('無法連線到資料庫：', error);
        process.exit(1);
    }
})();

// 路由區域

// 新增課程頁面
app.get('/add-course', async (req, res) => {
    try {
        // 取得所有課程
        const courses = await Course.findAll();
        console.log("以下為輸出測試");
        console.log(courses);
        res.render('add-course', { courses });
    } catch (error) {
        console.error('取得課程失敗：', error);
        res.status(500).send('取得課程失敗');
    }
});

// 1. 新增課程
app.post('/add-course', async (req, res) => {
    const { name, description } = req.body;
    try {
        await Course.create({ name, description });
        res.redirect('/add-course');
    } catch (error) {
        console.error(error);
        res.status(500).send('新增課程失敗');
    }
});

// 2. 註冊使用者
app.post('/register', async (req, res) => {
    const { username, phone, courseId } = req.body;
    try {
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).send('課程未找到');

        await Participant.create({ course_id: courseId, username, phone });
        const token = jwt.sign({ username }, SECRET_KEY + courseId.toString().padStart(8, '0'));
        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).send('註冊失敗');
    }
});

// 3. 簽到檢查
app.post('/check', async (req, res) => {
    const { token, courseId, date, check_time } = req.body;
    console.log("token:"+token);
    try {
        const decoded = jwt.verify(token, SECRET_KEY + courseId.toString().padStart(8, '0'));

        const participant = await Participant.findOne({ where: { course_id: courseId, username: decoded.username } });
        if (!participant){
            console.log('使用者未找到');
            return res.status(404).json({ message: '使用者未找到' });
        }
        
        const courseDate = await CourseDate.findOne({ where: { course_id: courseId, date } });
        if (!courseDate){
            console.log('還未到簽到時間');
            return res.status(404).json({ message: '還未到簽到時間' });
        } 

        const alreadySignedIn = await SignInSheet.findOne({ where: { course_date_id: courseDate.id, username: decoded.username } });
        if (alreadySignedIn){
            console.log('已經簽到過了');
            return res.status(200).json({ message: '已經簽到過了' });
        }

        const checkdate=date+" "+check_time;
        console.log("checkdate:"+checkdate);
        // 顯示SignInSheet的資料
        console.log("以下為SignInSheet的資料");
        const SignInSheetData = await SignInSheet.findAll();
        console.log(SignInSheetData);
        await SignInSheet.create({ course_date_id: courseDate.id, username: decoded.username, check_time: checkdate });
        res.json({ message: '簽到成功' });
    } catch (error) {
        console.error(error);
        res.status(500).send('簽到失敗');
    }
});

// 4. 新增日期
app.post('/add-course-date', async (req, res) => {
    const { courseId, date } = req.body;
    try {
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).send('課程未找到');

        const existingDate = await CourseDate.findOne({ where: { course_id: courseId, date } });
        if (existingDate) return res.status(400).send('日期重複');

        await CourseDate.create({ course_id: courseId, date });
        res.redirect(`/admin/course/${courseId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('新增日期失敗');
    }
});

// 5. 管理者課程頁面
app.get('/admin/course/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const course = await Course.findByPk(id, {
            include: [
                {
                    model: CourseDate,
                    include: [SignInSheet]
                },
                Participant
            ],
        });
        console.log(course.toJSON());
        if (!course) return res.status(404).send('課程未找到');
        res.render('admin-course_sql', { course });
    } catch (error) {
        console.error(error);
        res.status(500).send('無法載入管理頁面');
    }
});

// 動態生成課程頁面
app.get('/course/:id',async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const course = await Course.findByPk(id, {
        include: [CourseDate, Participant],
    });
    if (course) {
        res.render('course', { course });
    } else {
        res.status(404).send('課程未找到');
    }
});

// 6. 建立課程 QR Code
app.get('/course/:id/qrcode', async (req, res) => {
    try {
        const courseId = parseInt(req.params.id, 10);
        const URL = `http://localhost:3000/course/${courseId}`;
        const qrCodeImage = await QRCode.toDataURL(URL);
        res.send(`<img src="${qrCodeImage}" alt="QR Code"/>`);
    } catch (error) {
        console.error(error);
        res.status(500).send('無法生成 QR Code');
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
