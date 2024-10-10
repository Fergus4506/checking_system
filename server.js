const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const SECRET_KEY = '5000';

// 設置 EJS 為模板引擎
app.set('view engine', 'ejs');

// 解析 JSON 和 URL-encoded 請求
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 提供靜態文件
app.use(express.static(path.join(__dirname, 'public')));

// 模擬的使用者資料庫
const users = [];

// 註冊使用者
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const existingUser = users.find(user => user.username === username);

    if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    users.push({ username, password });

    // 利用JWT對SECRET_KEY進行加密，並設定過期時間為1小時
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });

    res.json({ message: 'User registered successfully', token });
});

// 驗證使用者的 JWT Token
app.post('/verify-token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        res.json({ message: 'Token is valid', user: decoded.username });
    });
});

// 渲染後台管理頁面
app.get('/admin', (req, res) => {
    res.render('admin');
});

// 處理生成 HTML 文件的請求
app.post('/generate', (req, res) => {
    const { title, content, fileName } = req.body;

    // 動態生成的 HTML 內容
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
    </head>
    <body>
        <h1>${title}</h1>
        <p>${content}</p>
    </body>
    </html>
    `;

    // 將 HTML 寫入檔案
    const filePath = path.join(__dirname, 'public', 'generated-html', `${fileName}.html`);
    fs.writeFile(filePath, htmlContent, (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return res.status(500).send('Error generating HTML file');
        }
        res.redirect('/admin');
    });
});

// 處理刪除 HTML 文件的請求
app.post('/delete', (req, res) => {
    const { fileName } = req.body;
    const filePath = path.join(__dirname, 'public', 'generated-html', `${fileName}.html`);

    // 檢查檔案是否存在
    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                return res.status(500).send('Error deleting HTML file');
            }
            res.redirect('/admin');
        });
    } else {
        res.status(404).send('File not found');
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
