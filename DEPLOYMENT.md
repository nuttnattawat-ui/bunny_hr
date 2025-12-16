# 🐰 Bunny HR - Human Resource Management System

ระบบบริหารจัดการทรัพยากรบุคคลแบบครบวงจร สำหรับธุรกิจขนาดกลางและขนาดเล็ก

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 📊 Core Features
- **Employee Management** - จัดการข้อมูลพนักงานแบบครบวงจร
- **Attendance System** - Check-in/Check-out พร้อม GPS Location
- **Shift Management** - จัดการกะการทำงานและวันหยุด
- **Leave Management** - ระบบขอลาและอนุมัติออนไลน์
- **Department Organization** - จัดการแผนกและโครงสร้างองค์กร
- **Calendar View** - ปฏิทินแสดงกะงานและการมาทำงาน
- **Employee Self-Service** - พนักงานแก้ไขข้อมูลส่วนตัวได้

### 🎨 UI/UX Features
- **Responsive Design** - รองรับมือถือ แท็บเล็ต และเดสก์ท็อป
- **Real-time Updates** - อัพเดทข้อมูลแบบ Real-time
- **Thai Language Support** - รองรับภาษาไทยเต็มรูปแบบ
- **24-Hour Time Format** - รูปแบบเวลา 24 ชั่วโมงแบบไทย
- **Keyboard Shortcuts** - ลัด Enter/Esc บนทุก Modal
- **GPS Location Tracking** - บันทึกตำแหน่งตอน Check-in

## 🛠️ Tech Stack

### Frontend
- **HTML5** + **CSS3**
- **Vanilla JavaScript** (No Framework)
- **SweetAlert2** - Beautiful alerts
- **Google Fonts** - Sarabun Thai font

### Backend
- **Node.js** + **Express.js**
- **MySQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-origin support

## 📋 Prerequisites

ก่อนติดตั้ง ต้องมีโปรแกรมเหล่านี้:

- [Node.js](https://nodejs.org/) (v14 หรือสูงกว่า)
- [MySQL](https://www.mysql.com/) (v5.7 หรือสูงกว่า)
- [Git](https://git-scm.com/)

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/bunny_hr.git
cd bunny_hr
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

สร้างฐานข้อมูล MySQL:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE hr_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

Import schema:

```bash
mysql -u root -p hr_system < database/schema.sql
```

หรือใช้ script setup:

```bash
node setup-db.js
```

### 4. Environment Configuration

คัดลอกไฟล์ `.env.example` เป็น `.env`:

```bash
cp .env.example .env
```

แก้ไขค่าต่างๆ ใน `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hr_system
DB_PORT=3306

PORT=3000
NODE_ENV=development

JWT_SECRET=your_random_secure_string_here
FRONTEND_URL=http://localhost:8000
SESSION_SECRET=your_session_secret_here
```

### 5. Start Servers

**Terminal 1 - Backend:**
```bash
node backend/server.js
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npx http-server -p 8000
```

### 6. Access Application

เปิดเบราว์เซอร์:
- Frontend: http://localhost:8000
- Backend API: http://localhost:3000

**Default Login:**
- Username: `admin`
- Password: `admin123`

## 📁 Project Structure

```
bunny_hr/
├── backend/
│   └── server.js              # Express API Server
├── frontend/
│   ├── index.html             # Main HTML
│   └── js/
│       └── app.js             # Frontend JavaScript
├── database/
│   └── schema.sql             # Database Schema
├── .env.example               # Environment Template
├── .gitignore                 # Git Ignore
├── package.json               # Node Dependencies
├── setup-db.js                # Database Setup Script
├── reset-password.js          # Password Reset Utility
└── README.md                  # This File
```

## 🔑 Default Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |

## 🌐 Deployment

### Deploy to Cloud (Railway / Render / Heroku)

#### 1. Set Environment Variables

ตั้งค่า Environment Variables ในแพลตฟอร์มของคุณ:

```
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=hr_system
PORT=3000
JWT_SECRET=your_secure_random_string
NODE_ENV=production
```

#### 2. Database Migration

อัพโหลด schema.sql ไปยัง MySQL cloud database

#### 3. Build & Deploy

```bash
# Railway
railway up

# Render
# Connect GitHub repository และตั้งค่า Build Command:
npm install

# Start Command:
node backend/server.js
```

### Deploy Frontend (Vercel / Netlify)

Frontend เป็น Static files สามารถ deploy ไปที่:
- **Vercel**: ลาก folder `frontend` ไปวาง
- **Netlify**: ลาก folder `frontend` ไปวาง
- **GitHub Pages**: Push ขึ้น gh-pages branch

อย่าลืมแก้ `API_BASE_URL` ในไฟล์ `frontend/js/app.js`:

```javascript
const API_BASE_URL = 'https://your-backend-url.com';
```

## 🔧 Configuration

### Change Database Settings

แก้ไขใน `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hr_system
```

### Change Port

แก้ไขใน `.env`:
```env
PORT=3000  # Backend port
```

Frontend port:
```bash
npx http-server -p 8000  # เปลี่ยน 8000 เป็นพอร์ตที่ต้องการ
```

## 📝 API Documentation

### Authentication

#### POST /api/auth/login
เข้าสู่ระบบ
```json
{
  "username": "admin",
  "password": "admin123"
}
```

#### POST /api/auth/signup
สมัครสมาชิก
```json
{
  "username": "newuser",
  "password": "password123",
  "first_name": "ชื่อ",
  "last_name": "นามสกุล",
  "nickname": "ชื่อเล่น",
  "email": "user@example.com",
  "department_id": 1,
  "position": "Staff"
}
```

### Employees

#### GET /api/employees
ดึงข้อมูลพนักงานทั้งหมด (ต้อง login)

#### POST /api/employees
เพิ่มพนักงานใหม่ (Admin/HR only)

#### PUT /api/employees/:id
แก้ไขข้อมูลพนักงาน

### Attendance

#### POST /api/attendance/checkin
Check-in เข้างาน
```json
{
  "employee_id": 1,
  "location": "13.736717, 100.523186"
}
```

#### POST /api/attendance/checkout/:id
Check-out ออกงาน

#### GET /api/attendance?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
ดูประวัติการมาทำงาน

### Departments

#### GET /api/departments
ดึงข้อมูลแผนกทั้งหมด (Public)

#### POST /api/departments
สร้างแผนกใหม่ (Admin only)

### Shifts

#### GET /api/shifts
ดูกะการทำงานทั้งหมด

#### POST /api/shifts
สร้างกะงานใหม่

## 🐛 Troubleshooting

### Backend ไม่สามารถเชื่อมต่อ Database

```bash
# ตรวจสอบ MySQL service
# Windows:
net start MySQL80

# ตรวจสอบ connection
mysql -u root -p
```

### Port ชนกัน

```bash
# Windows - หา process ที่ใช้พอร์ต 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID [PID_NUMBER] /F
```

### Reset Admin Password

```bash
node reset-password.js
```

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## 👥 Authors

- **Bunny Team** - *Initial work*

## 🙏 Acknowledgments

- SweetAlert2 for beautiful alerts
- Google Fonts for Sarabun font
- Express.js community
- MySQL community

## 📞 Support

หากมีปัญหาการใช้งาน:
- 📧 Email: support@bunnyphone.com
- 📱 Line: @bunnyphone
- 🐛 [Issue Tracker](https://github.com/YOUR_USERNAME/bunny_hr/issues)

---

Made with ❤️ by Bunny Team
