# Nouns Fill in the Blanks

一个交互式的英语名词填空练习应用。用户需要识别句子中的名词并正确填写。

## 功能特点

- 随机显示英语句子
- 自动识别句子中的名词
- 提供填空练习界面
- 实时检查答案
- 最多允许5次尝试
- 显示正确答案

## 技术栈

- 前端：React + Material-UI
- 后端：Python Flask
- NLP：NLTK

## 安装说明

### 后端设置

1. 进入后端目录：
```bash
cd backend
```

2. 创建虚拟环境（可选但推荐）：
```bash
python -m venv venv
source venv/bin/activate  # 在 Windows 上使用: venv\Scripts\activate
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 运行后端服务器：
```bash
python app.py
```

### 前端设置

1. 进入前端目录：
```bash
cd frontend
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm start
```

## 使用说明

1. 确保后端服务器在运行（默认端口：5000）
2. 打开浏览器访问前端应用（默认地址：http://localhost:3000）
3. 在空白处填写你认为的名词
4. 点击提交按钮检查答案
5. 如果答案错误，可以继续尝试（最多5次）
6. 使用"Next Sentence"按钮获取新的句子

## 注意事项

- 确保后端服务器在运行状态
- 所有输入都会被转换为小写进行比较
- 答案必须完全匹配才能被认为是正确的 