# HR System - Bunny Phone

ระบบจัดการทรัพยากรบุคคล (Human Resource Management System) สำหรับบริษัท Bunny Phone

## 🎯 Features

### 1. Core HR / Employee Database
- ✅ จัดการข้อมูลพนักงาน (ส่วนตัว, งาน, เงินเดือน)
- ✅ จัดการเอกสาร (สัญญาจ้าง, บัตรประชาชน, ใบรับรอง)
- ✅ ตั้งค่าการเข้าถึง (Admin, HR, Manager, Employee)
- ✅ Organization Chart

### 2. Payroll & Compensation Management
- ✅ คำนวณเงินเดือนอัตโนมัติ
- ✅ จัดการการหัก (ประกันสังคม, ภาษี, กองทุนสำรอง)
- ✅ สร้างสลิปเงินเดือนอิเล็กทรอนิกส์
- ✅ Export เงินเดือนไปธนาคาร

### 3. Leave & Attendance Management
- ✅ Time Tracking (Check-in/Check-out)
- ✅ Shift Management
- ✅ Request Leave Online
- ✅ Leave Approval Workflow
- ✅ Automatic Leave Balance Tracking
- ✅ Team Calendar View

### 4. Employee Self-Service Portal
- ✅ ดูข้อมูลส่วนตัว
- ✅ ดูสลิปเงินเดือน
- ✅ ส่งคำขอลา
- ✅ Update ข้อมูลส่วนตัว

### 5. Reporting & Analytics
- ✅ Dashboard แสดงข้อมูล HR
- ✅ Reports สำเร็จรูป (พนักงาน, การลา, เงินเดือน)
- ✅ Export Data (CSV, Excel)
- ✅ Visual Dashboards

## 🏗️ Project Structure

```
bunny_hr/
├── frontend/
│   ├── index.html          # Main Frontend Page
│   ├── css/
│   │   └── styles.css      # Styles
│   └── js/
│       └── app.js          # JavaScript Logic
├── backend/
│   ├── server.js           # Express Server
│   ├── routes/             # API Routes
│   ├── controllers/        # Business Logic
│   └── middleware/         # Authentication, etc.
├── database/
│   ├── schema.sql          # Database Schema
│   └── migrations/         # DB Migrations
├── docker-compose.yml      # Docker Setup
├── package.json            # Dependencies
├── .env                    # Environment Variables
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 14+ (หรือ Docker)
- MySQL 8.0+
- npm or yarn

### Installation (Local Development)

1. **Clone the repository**
```bash
cd bunny_hr
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup Environment Variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Setup Database**
```bash
mysql -u root -p < database/schema.sql
# หรือ
npm run db:migrate
```

5. **Start Backend Server**
```bash
npm run dev
# Server will run on http://localhost:3000
```

6. **Open Frontend**
```
Open frontend/index.html in your browser
```

### Installation (Using Docker)

1. **Build and Run Containers**
```bash
docker-compose up -d
```

2. **Access Services**
- Frontend: http://localhost (ต้องตั้งค่า nginx/apache)
- API: http://localhost:3000
- phpMyAdmin: http://localhost:8080

## 📝 API Documentation

### Authentication
```
POST /api/auth/login
Headers: Content-Type: application/json
Body: {
  "username": "admin",
  "password": "admin123"
}

Response: {
  "token": "jwt_token",
  "user": { ... }
}
```

### Employees
```
GET    /api/employees              # Get all employees
GET    /api/employees/:id          # Get employee
POST   /api/employees              # Create employee
PUT    /api/employees/:id          # Update employee
DELETE /api/employees/:id          # Delete employee
```

### Attendance
```
GET    /api/attendance             # Get attendance records
POST   /api/attendance             # Record attendance
GET    /api/attendance/:id         # Get specific record
```

### Leave Requests
```
GET    /api/leave-requests         # Get leave requests
POST   /api/leave-requests         # Create leave request
PUT    /api/leave-requests/:id     # Update request
PUT    /api/leave-requests/:id/approve  # Approve/Reject
```

### Reports
```
GET    /api/reports/attendance     # Attendance report
GET    /api/reports/leave         # Leave report
GET    /api/reports/payroll       # Payroll report
```

## 🔐 Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| hrmanager | hr123 | HR |

⚠️ **IMPORTANT**: Change these credentials in production!

## 🗄️ Database Schema

### Main Tables
- **employees** - ข้อมูลพนักงาน
- **attendance** - บันทึกการมาทำงาน
- **leave_requests** - คำขอลางาน
- **shifts** - ตารางกะงาน
- **payroll** - เงินเดือนและค่าตอบแทน
- **warnings** - บันทึกการตักเตือน
- **performance_reviews** - การประเมินผลงาน
- **leave_balance** - สถานะวันลาคงเหลือ
- **audit_log** - บันทึก Log

## 🔧 Configuration

### Environment Variables (.env)
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=hr_system

PORT=3000
NODE_ENV=development

JWT_SECRET=your_secret_key
```

## 📊 System Architecture

```
┌─────────────────┐
│   Frontend      │
│  (HTML/CSS/JS)  │
└────────┬────────┘
         │
      HTTP/REST
         │
┌────────▼────────┐
│   Backend       │
│  (Node/Express) │
└────────┬────────┘
         │
    Database
         │
┌────────▼────────┐
│  MySQL DB       │
│  (Schema)       │
└─────────────────┘
```

## 🔐 Security Features

- ✅ JWT Token Authentication
- ✅ Password Hashing (bcryptjs)
- ✅ CORS Protection
- ✅ SQL Injection Prevention
- ✅ Role-Based Access Control
- ✅ Audit Logging

## 📱 Responsive Design

- ✅ Mobile-friendly Interface
- ✅ Tablet Optimized
- ✅ Desktop Full Features

## 🎓 User Roles

### Admin
- Full system access
- Manage all employees
- Manage system settings
- View all reports

### HR Manager
- Manage employee data
- Approve leave requests
- Generate reports
- View payroll

### Manager
- Approve subordinate leave requests
- View team reports
- Basic employee data

### Employee
- View own profile
- Request leave
- Record attendance
- View own payslip

## 🐛 Troubleshooting

### Database Connection Error
```
Solution: 
1. Check DB_HOST, DB_USER, DB_PASSWORD in .env
2. Ensure MySQL is running
3. Run npm run db:migrate
```

### API Not Responding
```
Solution:
1. Check if backend is running: npm run dev
2. Check port 3000 is available
3. Check console for errors
```

### Login Failed
```
Solution:
1. Check username/password are correct
2. Verify database has user data
3. Check JWT_SECRET in .env
```

## 📞 Support

For issues and questions:
- Email: hr@bunnyphone.com
- Internal Wiki: [Link]
- Slack Channel: #hr-system

## 📄 License

Proprietary - Bunny Phone Co., Ltd.

## 🎉 Version History

### v1.0.0 (2024-12-15)
- Initial Release
- Core HR Features
- Employee Management
- Attendance & Leave Management
- Basic Payroll
- Reporting

---

**Last Updated**: December 15, 2024
**Maintained By**: IT Department
