const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
require('dotenv').config(); // 儲存 API Key 和 Secret 的 .env 檔案

const app = express();
app.use(bodyParser.json({ limit: '10mb' })); // 用於解析圖像的 base64 數據

// Face++ API 資訊
const FACE_API_KEY = process.env.FACE_API_KEY; // 你的 Face++ API Key
const FACE_API_SECRET = process.env.FACE_API_SECRET; // 你的 Face++ API Secret
const FACE_API_URL = 'https://api-us.faceplusplus.com/facepp/v3/detect';

// 處理前端發送過來的圖像
app.post('/recognize', async (req, res) => {
    const imageBase64 = req.body.image.replace(/^data:image\/\w+;base64,/, ""); // 去掉 base64 的前綴
    const imageBuffer = Buffer.from(imageBase64, 'base64'); // 將圖像轉為 Buffer

    try {
        // 發送請求到 Face++ API 進行人臉識別
        const response = await axios.post(FACE_API_URL, null, {
            params: {
                api_key: FACE_API_KEY,
                api_secret: FACE_API_SECRET,
                image_base64: imageBase64,
                return_attributes: 'gender,age,emotion', // 可以根據需求調整返回的屬性
            },
        });

        const faces = response.data.faces;
        if (faces.length > 0) {
            res.json({ message: `Detected ${faces.length} faces`, data: faces });
        } else {
            res.json({ message: 'No face detected' });
        }
    } catch (error) {
        console.error('Error calling Face++ API:', error);
        res.status(500).json({ message: 'Error processing the image' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// 啟動服務
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
