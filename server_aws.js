const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const QRCode = require('qrcode');
const { sign } = require('crypto');

// 初始化 Express 和資料庫
const app = express();
const PORT = 3000;
const SECRET_KEY = '5000';

// 設置 EJS 為模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 解析 JSON 和 URL-encoded 請求
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 提供靜態文件
app.use(express.static(path.join(__dirname, 'public')));


// 路由區域
const URL = 'https://7wms588ytb.execute-api.us-east-1.amazonaws.com';


//新增課程
app.post('/add-course', async (req, res) => {
    const { name, description,token } = req.body;
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log(decoded);
    try {
        // const admin = await Admin.findOne({ where: {  id: decoded.admin_id } });
        const admin = await fetch(`${URL}/admin/${decoded.admin_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(admin);
        if (!admin || !admin) {
            return res.status(404).send('管理者未找到');
        }
        // await Course.create({ name, description, admin_id: admin.id });
        const course = await fetch(`${URL}/Course/${decoded.admin_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, description}),
        }).then(res => res.json());
        console.log(course);
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
        // const course = await Course.findByPk(courseId);
        const course = await fetch(`${URL}/Course/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        if (!course || !course.course_sl.Item) {
            return res.status(404).send('課程未找到');
        }
        // const courseDate = await CourseDate.findAll({ where: { course_id: courseId } });
        // if (courseDate.length!=0) {
        //     await SignInSheet.destroy({ where: { course_date_id: courseDate.course_date_id } });
        //     await CourseDate.destroy({ where: { course_id: courseId } });
        // }
        // await Course.destroy({ where: { id: courseId } });
        await fetch(`${URL}/Course/delete/${courseId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
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
        // const course = await Course.findByPk(courseId);
        const course = await fetch(`${URL}/Course/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        if (!course || !course.course_sl.Item) {
            return res.status(404).send('課程未找到');
        }
        // course.name = name;
        // course.description = description;
        // await course.save();
        const edit=await fetch(`${URL}/Course/edit/${courseId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, description }),
        }).then(res => res.json());
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
        // const course = await Course.findByPk(courseId);
        // if (!course) return res.status(404).send('課程未找到');
        const course = await fetch(`${URL}/Course/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(course);
        if (!course || !course.course_sl.Item) {
            return res.status(404).send('課程未找到');
        }

        // await Participant.create({ course_id: courseId, username, phone });
        const participant = await fetch(`${URL}/Participant/${courseId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, phone }),
        }).then(res => res.json());
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
        console.log(decoded);
        // const participant = await Participant.findOne({ where: { course_id: courseId, username: decoded.username } });
        const participant = await fetch(`${URL}/Participant/name/${decoded.username}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(participant);
        //確認該參加者有沒有參加該課程
        if (!participant || !participant.participant_name.Items) {
            console.log('使用者未找到');
            return res.status(200).json({ message: '使用者未找到' });
        }
        let check_participant=false;
        for (let i = 0; i < participant.participant_name.Count; i++) {
            if (participant.participant_name.Items[i].course_id == courseId) {
                check_participant=true;
                break;
            }
        }
        if (!check_participant) {
            console.log('使用者沒有參加該課程');
            return res.status(200).json({ message: '使用者沒有參加該課程' });
        }
        // if (!participant){
        //     console.log('使用者未找到');
        //     return res.status(200).json({ message: '使用者未找到' });
        // }
        
        // const courseDate = await CourseDate.findOne({ where: { course_id: courseId, date } });
        const courseDate = await fetch(`${URL}/CourseDate/course/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(courseDate);
        if (!courseDate || !courseDate.course_course_date.Items) {
            console.log('還未到簽到時間');
            return res.status(200).json({ message: '還未到簽到時間' });
        } 
        let courseDate_check=false;
        let nowCourseDateID=null;
        for (let i = 0; i < courseDate.course_course_date.Count; i++) {
            if (courseDate.course_course_date.Items[i].date == date) {
                nowCourseDateID=courseDate.course_course_date.Items[i].course_date_id;
                courseDate_check=true;
                break;
            }
        }
        if (!courseDate_check) {
            console.log('還未到簽到時間');
            return res.status(200).json({ message: '還未到簽到時間' });
        }

        // const alreadySignedIn = await SignInSheet.findOne({ where: { course_date_id: courseDate.id, username: decoded.username } });
        const alreadySignedIn = await fetch(`${URL}/SignInSheet/CourseDate/${nowCourseDateID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(alreadySignedIn);
        let check_alreadySignedIn=false;
        for (let i = 0; i < alreadySignedIn.course_date_sign_in.Count; i++) {
            if (alreadySignedIn.course_date_sign_in.Items[i].username == decoded.username) {
                check_alreadySignedIn=true;
                break;
            }
        }
        if (check_alreadySignedIn) {
            console.log('已簽到');
            return res.status(200).json({ message: '已簽到' });
        }
        
        const checkdate=date+" "+check_time;
        console.log("checkdate:"+checkdate);
        // await SignInSheet.create({ course_date_id: courseDate.id, username: decoded.username, check_time: checkdate });
        await fetch(`${URL}/checkin/${nowCourseDateID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: decoded.username, check_time: checkdate }),
        }).then(res => res.json());
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
        const course = await fetch(`${URL}/Course/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(course);
        if (!course || !course.course_sl.Item) {
            return res.status(404).send('課程未找到');
        }

        // const existingDate = await CourseDate.findOne({ where: { course_id: courseId, date } });
        const existingDate = await fetch(`${URL}/CourseDate/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(existingDate);
        let check_existingDate=false;
        if(existingDate.course_date_sl.Items){
            for (let i = 0; i < existingDate.course_date_sl.Items.length; i++) {
                if (existingDate.Items[i].date == date) {
                    check_existingDate=true;
                    break;
                }
            }
        }
        if (check_existingDate) return res.status(400).send('日期重複');

        // await CourseDate.create({ course_id: courseId, date });
        await fetch(`${URL}/CourseDate/${courseId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ date }),
        }).then(res => res.json());
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
        // const course = await Course.findByPk(courseId, {
        //     include: [CourseDate]
        // });
        const course = await fetch(`${URL}/Course/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(course);
        if (!course || !course.course_sl.Item) {
            return res.status(404).send('課程未找到');
        }

        // const existingDate = await CourseDate.findOne({ where: { course_id: courseId, date: newDate } });
        const existingDate = await fetch(`${URL}/CourseDate/course/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        let check_existingDate=false;
        for (let i = 0; i < existingDate.course_course_date.Count; i++) {
            if (existingDate.course_course_date.Items[i].date == newDate) {
                check_existingDate=true;
                break;
            }
        }
        if (check_existingDate) {
            return res.status(400).send('日期重複');
        }
        // const courseDate = await CourseDate.findOne({ where: { course_id: courseId, date:oldDate } });
        let check_have_date=false;
        let changeDateID=null;
        for (let i = 0; i < existingDate.course_course_date.Count; i++) {
            if (existingDate.course_course_date.Items[i].date == oldDate) {
                check_have_date=true;
                changeDateID=existingDate.course_course_date.Items[i].course_date_id;
                break;
            }
        }
        if (!check_have_date) {
            return res.status(404).send('日期未找到');
        }

        // courseDate.date = newDate;
        // await courseDate.save();
        console.log(newDate);
        const change_check=await fetch(`${URL}/CourseDate/edit/${changeDateID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ newDate }),
        }).then(res => res.json());
        
        console.log(change_check);
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
        // const course = await Course.findByPk(courseId, {
        //     include: [CourseDate]
        // });

        // if (!course) {
        //     return res.status(404).send('課程未找到');
        // }
        const course = await fetch(`${URL}/Course/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(course);
        if (!course || !course.course_sl.Item) {
            return res.status(404).send('課程未找到');
        }


        // const courseDate = await CourseDate.findOne({ where: { course_id: courseId, date } });
        const courseDate = await fetch(`${URL}/CourseDate/course/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());;
        let check_have_date=false;
        let changeDateID=null;
        for (let i = 0; i < courseDate.course_course_date.Count; i++) {
            if (courseDate.course_course_date.Items[i].date == date) {
                check_have_date=true;
                changeDateID=courseDate.course_course_date.Items[i].course_date_id;
                break;
            }
        }
        if (!check_have_date) {
            return res.status(404).send('日期未找到');
        }

        // if (course) {
        //     const courseDate = await CourseDate.findOne({ where: { course_id: courseId, date } });
        //     if (courseDate) {
        //     await SignInSheet.destroy({ where: { course_date_id: courseDate.id } });
        //     }
        // }

        // await courseDate.destroy();

        const delete_check=await fetch(`${URL}/CourseDate/delete/${changeDateID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(delete_check);
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
        const course = await fetch(`${URL}/Course/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        // console.log(course);
        const participant = await fetch(`${URL}/Participant/course/${course.course_sl.Item.course_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(participant);
        let courseDate = await fetch(`${URL}/CourseDate/course/${course.course_sl.Item.course_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(courseDate);
        //抓取每個課程日期的參加人員
        let signInSheet_Array = [];
        if(courseDate.course_course_date.Items){
            console.log('have in');
            for (let i = 0; i < courseDate.course_course_date.Count; i++) {
                const signInSheet = await fetch(`${URL}/SignInSheet/CourseDate/${courseDate.course_course_date.Items[i].course_date_id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }).then(res => res.json());
                await console.log(signInSheet.course_date_sign_in.Items);
                signInSheet_Array.push(signInSheet.course_date_sign_in);
            }
        }else{
            courseDate.course_course_date.Items=[];
        }
        if(!participant.course_participant.Items){
            participant.participant_sl.Items=[];
        }

        
        console.log(signInSheet_Array);
        if (!course || !course.course_sl.Item) return res.status(404).send('課程未找到');
        res.render('admin-course_sql', { course, participant, courseDate ,signInSheet_Array});
    } catch (error) {
        console.error(error);
        res.status(500).send('無法載入管理頁面');
    }
});

// 管理者登入
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // const admin = await Admin.findOne({ where: { username, password } });
        const admin = await fetch(`${URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        }).then(res => res.json());
        if (!admin) return res.status(401).send('登入失敗');
        console.log(admin);
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
        // await Admin.create({ username, password });
        const admin_rg=await fetch(`${URL}/admin/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        }).then(res => res.json());
        console.log(admin_rg);
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
    console.log(token)
    try{
        const decoded = jwt.verify(token, SECRET_KEY);
        // const admin = await Admin.findOne({ where: {  id: decoded.admin_id } });
        console.log(decoded);
        const admin = await fetch(`${URL}/admin/${decoded.admin_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        if (!admin || !admin.admin_check.Item) {
            return res.status(404).send('管理者未找到');
        }
        // const courses = await Course.findAll({ where: { admin_id: admin.id } });
        const courses = await fetch(`${URL}/Course/admin/${admin.admin_check.Item.admin_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        console.log(courses);
        res.json({courses,admin});
    }catch (error) {
        console.error(error);
        res.status(401).send('登入超時請重新登入');
    }
});


// 管理者管理頁面確認
app.post('/admin', async (req, res) => {
    const { token } = req.body;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log(decoded);
        const admin = await fetch(`${URL}/admin/${decoded.admin_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        if (!admin || !admin.Item) {
            return res.status(404).send('管理者未找到');
        }
        // const courses = await Course.findAll({ where: { admin_id: admin.id } });
        const courses = await fetch(`${URL}/Course/admin/${admin.Item.admin_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        const coursesData = [];
        for (let i = 0; i < courses.Items.length; i++) {
            const courseDate = await fetch(`${URL}/CourseDate/${courses.Items[i].course_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then(res => res.json());
            coursesData.push(courseDate.Items);
        }
        res.json({admin,courses,courseData});
    } catch (error) {
        console.error(error);
        res.status(500).send('管理者登入失敗');
    }
});

// 動態生成課程頁面
app.get('/course/:id',async (req, res) => {
    const id = parseInt(req.params.id, 10);
    // const course = await Course.findByPk(id, {
    //     include: [CourseDate, Participant],
    // });
    const course = await fetch(`${URL}/Course/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(res => res.json());
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
        //搜尋課程名稱
        const course = await fetch(`${URL}/Course/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        if (!course || !course.course_sl.Item) {
            return res.status(404).send('課程未找到');
        }
        console.log(courseId);
        const creat_URL = `http://http://ec2-100-27-109-177.compute-1.amazonaws.com/course/${courseId}`;
        const qrCodeImage = await QRCode.toDataURL(creat_URL);
        res.send(`
            <html>
            <head>
            <title>${course.course_sl.Item.name}課程 QR Code</title>
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
            <h1>${course.course_sl.Item.name} QR Code</h1>
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

//利用course_date_id取得簽到資料
app.get('/get_sheet_date/:id', async (req, res) => {
    const course_date_id = parseInt(req.params.id, 10);
    // const signInSheet = await SignInSheet.findAll({ where: { course_date_id } });
    const signInSheet = await fetch(`${URL}/SignInSheet/CourseDate/${course_date_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(res => res.json());
    console.log(signInSheet);
    res.json(signInSheet);
});

app.get('/get_all_attendance/:id', async (req, res) => {
    const course_id = parseInt(req.params.id, 10);
    // const courseDate = await CourseDate.findAll({ where: { course_id } });
    const courseDate = await fetch(`${URL}/CourseDate/course/${course_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(res => res.json());
    console.log(courseDate);
    const signInSheet_Array = [];
    for (let i = 0; i < courseDate.course_course_date.Count; i++) {
        const signInSheet = await fetch(`${URL}/SignInSheet/CourseDate/${courseDate.course_course_date.Items[i].course_date_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json());
        signInSheet_Array.push({
            date: courseDate.course_course_date.Items[i].date,
            signInSheet: signInSheet.course_date_sign_in.Items,
        });
    }
    console.log(signInSheet_Array);
    res.json(signInSheet_Array);
});
// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
