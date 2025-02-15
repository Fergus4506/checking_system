const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const QRCode = require('qrcode');
const { Sequelize, DataTypes } = require('sequelize');

// 初始化 Express 和資料庫
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || '5000';

// 從環境變數取得資料庫連線資訊，若無設定則採用預設值
const DB_NAME     = process.env.DB_DATABASE || 'courses_app';
const DB_USER     = process.env.DB_USER     || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Fergus5211';
const DB_HOST     = process.env.DB_HOST     || '127.0.0.1';

// 使用 Sequelize 設定 MySQL 資料庫連線
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
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

// 定義管理者模型
const Admin = sequelize.define('Admin', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
});

// 課程模型新增關聯
Course.belongsTo(Admin, { foreignKey: 'admin_id', as: 'publisher' });
Admin.hasMany(Course, { foreignKey: 'admin_id', as: 'publishedCourses' });

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

// 檢查資料庫和表格是否存在並同步模型
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('資料庫連接成功');

        // 檢查資料表是否存在
        const tableNames = await sequelize.getQueryInterface().showAllTables();
        console.log('資料表清單：', tableNames);
        if (!tableNames.includes('courses') || !tableNames.includes('coursedates') || !tableNames.includes('participants') || !tableNames.includes('signinsheets') || !tableNames.includes('admins')) {
            await sequelize.sync({ force: true });
            console.log('資料表已同步');
        } else {
            console.log('資料表已存在，無需同步');
        }
    } catch (error) {
        console.error('資料庫初始化失敗：', error);
    }
}

// 呼叫初始化資料庫的函數
initializeDatabase();

// 路由區域

// 新增課程頁面
app.get('/add-course', async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    try {
        // 取得所有該管理者所建立的課程
        const decoded = jwt.verify(token, SECRET_KEY);
        const admin = await Admin.findOne({ where: { username: decoded.username } });
        if (!admin) {
            return res.status(404).send('管理者未找到');
        }
        const courses = await Course.findAll({ where: { admin_id: admin.id } });
        console.log("-----------------");
        console.log("新增一門課程");
        console.log("courses:"+courses);
        res.render('add-course', { courses });
    } catch (error) {
        console.error('取得課程失敗：', error);
        res.status(500).send('取得課程失敗');
    }
});

//新增課程
app.post('/add-course', async (req, res) => {
    const { name, description,token } = req.body;
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log(decoded);
    try {
        const admin = await Admin.findOne({ where: {  id: decoded.admin_id } });
        if (!admin) {
            return res.status(404).send('管理者未找到');
        }
        await Course.create({ name, description, admin_id: admin.id });
        res.json({ message: '新增課程成功' });
    } catch (error) {
        console.error(error);
        res.status(500).send('新增課程失敗');
    }
});

//刪除課程
app.post('/delete-course', async (req, res) => {
    const { courseId } = req.body;
    try {
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).send('課程未找到');
        }
        const courseDate = await CourseDate.findAll({ where: { course_id: courseId } });
        if (courseDate.length!=0) {
            await SignInSheet.destroy({ where: { course_date_id: courseDate.course_date_id } });
            await CourseDate.destroy({ where: { course_id: courseId } });
        }
        await Course.destroy({ where: { id: courseId } });
        res.json({ message: '刪除課程成功' });
    } catch (error) {
        console.error(error);
        res.status(500).send('刪除課程失敗');
    }
});

// 修改課程
app.post('/edit-course', async (req, res) => {
    const { courseId, name, description } = req.body;
    try {
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).send('課程未找到');
        }
        course.name = name;
        course.description = description;
        await course.save();
        res.json({ message: '更新課程成功' });
    } catch (error) {
        console.error(error);
        res.status(500).send('更新課程失敗');
    }
});

// 註冊參加者
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

// 簽到檢查
app.post('/check', async (req, res) => {
    const { token, courseId, date, check_time } = req.body;
    console.log("token:"+token);
    try {
        const decoded = jwt.verify(token, SECRET_KEY + courseId.toString().padStart(8, '0'));

        const participant = await Participant.findOne({ where: { course_id: courseId, username: decoded.username } });
        if (!participant){
            console.log('使用者未找到');
            return res.status(200).json({ message: '使用者未找到' });
        }
        
        const courseDate = await CourseDate.findOne({ where: { course_id: courseId, date } });
        if (!courseDate){
            console.log('還未到簽到時間');
            return res.status(200).json({ message: '還未到簽到時間' });
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

// 新增日期課程日期
app.post('/add-course-date', async (req, res) => {
    const { courseId, date,admin_id } = req.body;
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

// 修改課程日期
app.post('/edit-course-date', async (req, res) => {
    const { courseId, oldDate, newDate } = req.body;
    console.log(oldDate,newDate);
    try {
        const course = await Course.findByPk(courseId, {
            include: [CourseDate]
        });
        if (!course) {
            return res.status(404).send('課程未找到');
        }

        const existingDate = await CourseDate.findOne({ where: { course_id: courseId, date: newDate } });
        if (existingDate) {
            return res.status(400).send('日期重複');
        }

        const courseDate = await CourseDate.findOne({ where: { course_id: courseId, date:oldDate } });
        if (!courseDate) {
            return res.status(404).send('日期未找到');
        }

        courseDate.date = newDate;
        await courseDate.save();

        console.log(course);
        res.redirect(`/admin/course/${courseId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('更新日期失敗');
    }
});

// 刪除課程日期
app.post('/delete-course-date', async (req, res) => {
    const { courseId, date } = req.body;
    try {
        const course = await Course.findByPk(courseId, {
            include: [CourseDate]
        });

        if (!course) {
            return res.status(404).send('課程未找到');
        }

        const courseDate = await CourseDate.findOne({ where: { course_id: courseId, date } });
        if (!courseDate) {
            return res.status(404).send('日期未找到');
        }

        if (course) {
            const courseDate = await CourseDate.findOne({ where: { course_id: courseId, date } });
            if (courseDate) {
            await SignInSheet.destroy({ where: { course_date_id: courseDate.id } });
            }
        }

        await courseDate.destroy();
        res.redirect(`/admin/course/${courseId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('刪除日期失敗');
    }
});

// 管理者課程頁面
app.get('/admin/course/:id', async (req, res) => {
    const { id } = req.params;
    console.log("id:"+id);
    try {
        const course_file = await Course.findByPk(id, {
            include: [
                {
                    model: CourseDate,
                    include: [SignInSheet]
                },
                Participant
            ],
        });
        const course = course_file.toJSON();
        console.log(course);
        if (!course) return res.status(404).send('課程未找到');
        res.render('admin-course_sql', { course });
    } catch (error) {
        console.error(error);
        res.status(500).send('無法載入管理頁面');
    }
});

// 管理者登入
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ where: { username, password } });
        if (!admin) return res.status(401).send('登入失敗');
        admin_id = admin.id;
        const token = jwt.sign({ admin_id }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).send('登入失敗');
    }
});

//管理者註冊
app.post('/admin/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        await Admin.create({ username, password });
        res.redirect('/admin/login');
    } catch (error) {
        console.error(error);
        res.status(500).send('註冊失敗');
    }
});

app.get('/admin/login', async (req, res) => {
    res.render('admin-login_sql');
});


// 管理者登入後的頁面
app.get('/admin', async (req, res) => {
    res.render('add-course_sql');
});
// 顯示目前管理者所建立的課程
app.post('/admin/get_course',async (req, res) => {
    const {token} = req.body;
    try{
        const decoded = jwt.verify(token, SECRET_KEY);
        const admin = await Admin.findOne({ where: {  id: decoded.admin_id } });
        if (!admin) {
            return res.status(404).send('管理者未找到');
        }
        const courses = await Course.findAll({ where: { admin_id: admin.id } });
        res.json({courses,admin});
    }catch (error) {
        console.error(error);
        res.message('登入超時請重新登入');
    }
});


// 管理者管理頁面確認
app.post('/admin', async (req, res) => {
    const { token } = req.body;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log(decoded);
        const admin = await Admin.findOne({ where: { id: decoded.admin_id } });
        if (!admin) return res.status(404).send('管理者未找到');
        const courses = await Course.findAll({ where: { admin_id: admin.id } });
        const courseData = await CourseDate.findAll({where: {course_id: courses.id}});
        res.json({admin,courses,courseData});
    } catch (error) {
        console.error(error);
        res.status(500).send('管理者登入失敗');
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

app.get('/get_all_attendance/:id', async (req, res) => {
    const course_id = parseInt(req.params.id, 10);
    try {
        const courseDates = await CourseDate.findAll({ where: { course_id } });
        const signInSheet_Array = [];

        for (const courseDate of courseDates) {
            const signInSheets = await SignInSheet.findAll({ where: { course_date_id: courseDate.id } });
            signInSheet_Array.push({
                date: courseDate.date,
                signInSheet: signInSheets,
            });
        }

        res.json(signInSheet_Array);
    } catch (error) {
        console.error(error);
        res.status(500).send('無法取得簽到資料');
    }
});

app.get('/get_sheet_date/:course_id/:id', async (req, res) => {
    const course_id = parseInt(req.params.course_id, 10);
    const id = parseInt(req.params.id, 10);
    try {
        const courseDate = await CourseDate.findByPk(id);
        if (!courseDate) {
            return res.status(404).send('課程日期未找到');
        }
        const signInSheets = await SignInSheet.findAll({ where: { course_date_id: id } });
        res.json({ course_id, courseDate, signInSheets });
    } catch (error) {
        console.error(error);
        res.status(500).send('無法取得簽到資料');
    }
});

// 6. 建立課程 QR Code
app.get('/course/:id/qrcode', async (req, res) => {
    try {
        const courseId = parseInt(req.params.id, 10);
        //搜尋課程名稱
        const course = await Course.findByPk(courseId);
        if (!course) {
            return res.status(404).send('課程未找到');
        }
        const URL = `http://localhost:3000/course/${courseId}`;
        const qrCodeImage = await QRCode.toDataURL(URL);
        res.send(`
            <html>
            <head>
            <title>${course.name}課程 QR Code</title>
            <style>
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background-color: #f0f0f0;
                font-family: Arial, sans-serif;
            }
            .container {
                text-align: center;
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            img {
                margin-top: 20px;
            }
            </style>
            </head>
            <body>
            <div class="container">
            <h1>${course.name} QR Code</h1>
            <img src="${qrCodeImage}" alt="QR Code"/>
            </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('無法生成 QR Code');
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
