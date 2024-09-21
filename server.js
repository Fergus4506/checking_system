const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = '5000';

app.use(bodyParser.json());

// 提供靜態文件
app.use(express.static(path.join(__dirname, 'public')));

// 模擬的使用者資料庫
const users = [];

app.post('/test', (req, res) => {
    res.json({ message: 'Hello World!' });
})

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const existingUser = users.find(user => user.username === username);

    if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    users.push({ username, password });
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });

    res.json({ message: 'User registered successfully', token });
});

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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});