const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = '5000';

// 設置 EJS 為模板引擎
app.set('view engine', 'ejs');

// 提供靜態文件
app.use(express.static(path.join(__dirname, 'public')));

// 模擬的使用者資料庫
const users = [];

// 註冊使用者
app.post('/register', (req, res) => {
    const { username, phone } = req.body;

    users.push({ username, phone });

    // 利用JWT對SECRET_KEY進行加密
    const token = jwt.sign({ username }, SECRET_KEY);
    users.push({ username, phone});
    // 將token回傳
    res.json({ token });
});
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

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
