# HR System - Project Structure Guide

## 📁 Directory Structure

```
bunny_hr/
│
├── 📄 frontend/                    # Frontend Application
│   ├── index.html                  # Main HTML Page
│   ├── css/
│   │   └── styles.css             # (CSS embedded in HTML)
│   └── js/
│       └── app.js                 # JavaScript Logic & API Integration
│
├── 📄 backend/                     # Backend Application (Node.js/Express)
│   └── server.js                  # Main Server File with all Routes
│
├── 🗄️ database/                    # Database Files
│   └── schema.sql                 # Database Schema & Initial Data
│
├── 📋 Configuration Files
│   ├── package.json               # NPM Dependencies & Scripts
│   ├── .env                       # Environment Variables
│   ├── .gitignore                 # Git Ignore Rules
│   ├── docker-compose.yml         # Docker Compose Configuration
│   └── Dockerfile.backend         # Docker Image for Backend
│
├── 📚 Documentation
│   ├── README.md                  # Main Documentation
│   ├── SETUP_GUIDE.md            # Detailed Setup Instructions
│   └── INDEX.md                  # This File
│
└── 🔑 Key Features
    ├── Authentication & Authorization
    ├── Employee Management
    ├── Attendance Tracking
    ├── Leave Management
    ├── Payroll System
    ├── Reports & Analytics
    └── Responsive UI
```

---

## 🚀 Quick Start

### 1. **First Time Setup**
```bash
# Read setup guide
cat SETUP_GUIDE.md

# Install dependencies
npm install

# Setup database
npm run db:migrate

# Start backend
npm run dev

# In another terminal, open frontend
# Open frontend/index.html in browser
```

### 2. **Default Login**
- Username: `admin`
- Password: `admin123`

### 3. **API is Ready**
- Backend: http://localhost:3000
- API Docs: See README.md

---

## 📋 File Guide

### Frontend (`frontend/`)

#### `index.html`
- Single-page application
- Responsive design
- All CSS embedded
- Contains login, navigation, and page structures

#### `js/app.js`
- API integration
- Authentication handling
- User interface logic
- Data management

### Backend (`backend/`)

#### `server.js`
Complete Express.js server with:
- Authentication routes (`/api/auth/login`)
- Employee routes (`/api/employees`)
- Attendance routes (`/api/attendance`)
- Leave request routes (`/api/leave-requests`)
- Report routes (`/api/reports/*`)
- Error handling & middleware

### Database (`database/`)

#### `schema.sql`
Complete database schema including:
- `employees` - Employee data
- `attendance` - Attendance records
- `leave_requests` - Leave requests
- `shifts` - Work shifts
- `payroll` - Payroll data
- `warnings` - Discipline records
- `performance_reviews` - Performance data
- `leave_balance` - Leave tracking
- `audit_log` - System logs

### Configuration

#### `package.json`
- Express.js dependencies
- MySQL driver
- JWT & bcryptjs for security
- Useful npm scripts

#### `.env`
Environment variables:
- Database credentials
- Server port
- JWT secret
- Email settings

#### `docker-compose.yml`
Complete Docker setup:
- MySQL container
- phpMyAdmin container
- Backend container
- Networking between services

---

## 🔄 Development Workflow

### Making Changes to Frontend
1. Edit `frontend/index.html` or `frontend/js/app.js`
2. Refresh browser
3. Test functionality

### Making Changes to Backend
1. Edit `backend/server.js`
2. Backend will auto-reload if using `npm run dev`
3. Test with Postman or curl

### Making Changes to Database
1. Edit `database/schema.sql`
2. Run `npm run db:migrate` to update
3. Or restart Docker if using containers

---

## 🧪 Testing

### Test API Endpoints

```bash
# Test Health
curl http://localhost:3000/api/health

# Test Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test Get Employees
curl http://localhost:3000/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Frontend
1. Open http://localhost:8000/index.html
2. Click Login
3. Enter admin/admin123
4. Test each menu option

---

## 📊 System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    User's Browser                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Frontend (HTML/CSS/JS)                   │  │
│  │  - Login Form                                         │  │
│  │  - Navigation Tabs                                    │  │
│  │  - Pages (Leave, Attendance, Profile, etc)          │  │
│  │  - API Calls to Backend                              │  │
│  └──────────────────┬───────────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────┘
                      │ HTTP/JSON/JWT Token
┌─────────────────────▼──────────────────────────────────────┐
│                    Backend Server                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Express.js API Server                      │  │
│  │  - Authentication (/api/auth/login)                  │  │
│  │  - Employees (/api/employees)                        │  │
│  │  - Attendance (/api/attendance)                      │  │
│  │  - Leave Requests (/api/leave-requests)             │  │
│  │  - Reports (/api/reports/*)                         │  │
│  │  - Middleware: JWT, CORS, Error Handler             │  │
│  └──────────────────┬───────────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────┘
                      │ MySQL Connection
┌─────────────────────▼──────────────────────────────────────┐
│                   MySQL Database                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tables: employees, attendance, leave_requests, ...  │  │
│  │  - Employee Data Management                          │  │
│  │  - Attendance Tracking                               │  │
│  │  - Leave Request Processing                          │  │
│  │  - Payroll Data                                       │  │
│  │  - Audit Logging                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcryptjs for secure passwords
- **CORS Protection**: Controlled cross-origin requests
- **SQL Injection Prevention**: Parameterized queries
- **Role-Based Access**: admin, hr, manager, employee roles
- **Audit Logging**: Track all data changes

---

## 📈 Features by Module

### 🔐 Authentication
- Login/Logout
- Token-based session
- Password security

### 👥 Employee Management
- Create employees
- Update employee data
- Delete employees
- View employee list

### 📋 Attendance
- Record attendance
- View attendance history
- Generate reports

### 📝 Leave Management
- Submit leave requests
- Approve/Reject leaves
- View leave history
- Track leave balance

### 💰 Payroll
- View payslips
- Deduction management
- Salary calculations

### 📊 Reports
- Attendance reports
- Leave reports
- Payroll reports
- Data export

---

## 🔧 Useful Commands

```bash
# Development
npm install                # Install dependencies
npm run dev               # Start backend (auto-reload)
npm start                 # Start backend (production)

# Database
npm run db:migrate        # Create/update database
npm run db:backup         # Backup database

# Docker
docker-compose build      # Build images
docker-compose up -d      # Start containers
docker-compose down       # Stop containers
docker-compose logs       # View logs

# Debugging
DEBUG=* npm run dev       # Enable debug mode
npm run test             # Run tests
```

---

## 🆘 Troubleshooting

### Problem: "Cannot connect to database"
**Solution:** Check `.env` file and ensure MySQL is running

### Problem: "Port 3000 already in use"
**Solution:** Kill the process or use different port: `PORT=3001 npm run dev`

### Problem: "CORS error in browser"
**Solution:** Check frontend URL in CORS config

### Problem: "JWT token invalid"
**Solution:** Check JWT_SECRET in `.env` matches

---

## 📞 Support

- Check README.md for detailed docs
- Check SETUP_GUIDE.md for installation help
- Review server.js for API implementation details
- Check database/schema.sql for data structure

---

## 📅 Development Timeline

- **Phase 1**: Database setup ✅
- **Phase 2**: Backend API ✅
- **Phase 3**: Frontend UI ✅
- **Phase 4**: Integration testing (in progress)
- **Phase 5**: Production deployment (pending)

---

**Last Updated**: December 15, 2024
**Version**: 1.0.0
**Status**: Ready for Development
