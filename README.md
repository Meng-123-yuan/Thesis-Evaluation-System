# 论文评定系统

这是一个基于Web的论文评定系统，支持论文分配、专家评审和分数统计功能。

## 功能特点

- 用户注册和登录（支持普通用户和专家用户）
- 论文提交和管理
- 自动分配论文给专家（每篇论文分配给3位专家）
- 专家评审功能（每位专家可评审5-10篇论文）
- 论文评分（100分制）
- 自动计算平均分
- 评审意见查看

## 技术栈

- 后端：Python Flask
- 前端：HTML + JavaScript + Bootstrap
- 数据库：SQLite

## 安装和运行

### 后端设置

1. 进入后端目录：
```bash
cd backend
```

2. 创建虚拟环境（可选但推荐）：
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 运行后端服务器：
```bash
python app.py
```

服务器将在 http://localhost:5000 运行

### 前端设置

1. 进入前端目录：
```bash
cd frontend
```

2. 使用任意Web服务器托管前端文件，例如使用Python的简单HTTP服务器：
```bash
python -m http.server 8000
```

3. 在浏览器中访问 http://localhost:8000

## 使用说明

1. 注册账号
   - 普通用户：可以提交论文
   - 专家用户：可以评审论文

2. 登录系统

3. 提交论文
   - 填写论文标题和内容
   - 系统会自动分配给专家

4. 评审论文
   - 专家登录后可以看到分配的论文
   - 对每篇论文进行评分（0-100分）
   - 提交评审意见

5. 查看结果
   - 论文获得3位专家评审后自动计算平均分
   - 可以查看所有评审意见

## 注意事项

- 确保后端服务器在运行状态
- 专家用户最多可以评审10篇论文
- 每篇论文需要3位专家评审
- 评分范围为0-100分 