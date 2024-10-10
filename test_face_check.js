const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // 確保你已經設定好 .env 文件來存放 API_KEY 和 SECRET

const app = express();
app.use(bodyParser.json({ limit: '10mb' })); // 處理 base64 圖像數據

// Face++ API 資訊
const FACE_API_KEY = process.env.FACE_API_KEY;
const FACE_API_SECRET = process.env.FACE_API_SECRET;
const FACE_COMPARE_URL = 'https://api-us.faceplusplus.com/facepp/v3/compare';

// 你的已有照片的 base64 或 URL (此處為示例的圖片)
// 讀取圖片並轉換成 base64 編碼
const imagePath = path.join(__dirname, 'image', 'myphoto.jpg');
const imageBuffer = fs.readFileSync(imagePath);
const STORED_IMAGE_BASE64 = imageBuffer.toString('base64');

// 處理前端發送的圖像並進行比對
app.post('/compare', async (req, res) => {
    const capturedImageBase64 = req.body.image.replace(/^data:image\/\w+;base64,/, ""); // 去掉 base64 的前綴

    try {
        // 發送到 Face++ 進行人臉比對
        const response = await axios.post(FACE_COMPARE_URL, null, {
            params: {
                api_key: FACE_API_KEY,
                api_secret: FACE_API_SECRET,
                image_base64_1: capturedImageBase64, // 用戶捕捉的圖像
                image_base64_2: STORED_IMAGE_BASE64, // 你的基準圖片
            },
        });

        // 處理 API 的返回結果
        const result = response.data;
        if (result.confidence) {
            res.json({ message: `Confidence score: ${result.confidence}` });
        } else {
            res.json({ message: 'Face comparison failed' });
        }
    } catch (error) {
        console.error('Error during face comparison:', error);
        res.status(500).json({ message: 'Error processing the comparison' });
    }
});

app.use(express.static(path.join(__dirname, 'public'))); // 設置靜態文件夾

// 啟動服務
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
