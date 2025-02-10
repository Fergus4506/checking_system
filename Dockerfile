# 選用官方 Node.js 映像檔（這裡使用 Node.js 14，你可以根據需求調整版本）
FROM node:20

# 設定容器內的工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json 到容器中
COPY package*.json ./

# 安裝相依套件
RUN npm install

# 複製專案所有檔案到容器內
COPY . .

# 若你的應用使用特定埠號（例如 3000），開放該埠（可依實際情況修改）
EXPOSE 3000

# 啟動應用程式，這裡改用直接執行 server_sql_local.js
CMD ["node", "server_sql_local.js"]
