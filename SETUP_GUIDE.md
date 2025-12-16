# 🚀 HR System Setup Guide

## ขั้นตอนการตั้งค่าระบบ

### Phase 1: Environment Setup (ตั้งค่าสภาพแวดล้อม)

#### 1.1 ติดตั้ง Required Software
```bash
# Node.js 14+
https://nodejs.org/

# MySQL 8.0+
https://dev.mysql.com/downloads/mysql/

# Optional: Docker Desktop
https://www.docker.com/products/docker-desktop
```

#### 1.2 ตรวจสอบการติดตั้ง
```bash
node --version          # v14.0.0 or higher
npm --version           # 6.0.0 or higher
mysql --version         # 8.0.0 or higher
docker --version        # 20.0.0 or higher (optional)
```

---

### Phase 2: Database Setup

#### 2.1 Create MySQL User (เพื่อความปลอดภัย)
```sql
CREATE USER 'hr_user'@'localhost' IDENTIFIED BY 'hr_pass123';
GRANT ALL PRIVILEGES ON hr_system.* TO 'hr_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 2.2 Import Database Schema
```bash
# Option 1: Direct import
mysql -u root -p < database/schema.sql

# Option 2: Manual
mysql -u root -p
> CREATE DATABASE hr_system;
> USE hr_system;
> source database/schema.sql;
```

#### 2.3 ตรวจสอบ Database
```bash
mysql -u root -p hr_system
# ตรวจสอบว่า tables ถูกสร้างแล้ว
SHOW TABLES;
```

---

### Phase 3: Backend Setup

#### 3.1 ติดตั้ง Dependencies
```bash
cd bunny_hr
npm install
```

#### 3.2 ตั้งค่า Environment Variables
```bash
# Copy .env template
cp .env .env.local

# Edit .env.local
# DB_HOST=localhost
# DB_USER=hr_user
# DB_PASSWORD=hr_pass123
# DB_NAME=hr_system
# PORT=3000
# JWT_SECRET=your_secret_key_here
```

#### 3.3 ทดสอบ Database Connection
```bash
node backend/test-db.js
# Should output: Connected to database
```

#### 3.4 เริ่มต้น Backend Server
```bash
# Development mode
npm run dev

# Production mode
npm start

# Expected output: Server running on http://localhost:3000
```

---

### Phase 4: Frontend Setup

#### 4.1 ตั้งค่า API URL
Edit `frontend/js/app.js`:
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

#### 4.2 เปิด Frontend
```bash
# Simple HTTP Server
python -m http.server 8000
# หรือ
npx http-server frontend

# Access: http://localhost:8000/index.html
```

---

### Phase 5: Docker Setup (Alternative)

#### 5.1 Build Docker Images
```bash
docker-compose build
```

#### 5.2 Run Docker Containers
```bash
docker-compose up -d
```

#### 5.3 ตรวจสอบ Services
```bash
docker-compose ps
# ทั้ง 3 containers ควร running

docker-compose logs mysql     # Check DB logs
docker-compose logs backend   # Check API logs
```

#### 5.4 Access Services
- API: http://localhost:3000
- phpMyAdmin: http://localhost:8080

---

### Phase 6: Verification

#### 6.1 Test API Connection
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {"status":"OK"}
```

#### 6.2 Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Expected response:
# {"token":"jwt_token_here","user":{...}}
```

#### 6.3 Test Frontend
1. Open http://localhost:8000/index.html
2. Click "🔐 Login"
3. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
4. Should see dashboard

---

### Phase 7: Initial Configuration

#### 7.1 Create Admin User (if needed)
```bash
node backend/scripts/create-admin.js
```

#### 7.2 Import Initial Data
```bash
node backend/scripts/import-employees.js data/employees.csv
```

#### 7.3 Setup Departments
```sql
UPDATE employees SET department = 'HR' WHERE id = 2;
-- Configure departments as needed
```

---

## 📋 Checklist

### Pre-Launch
- [ ] Database schema created
- [ ] Backend server running
- [ ] Frontend accessible
- [ ] Login working
- [ ] Sample data imported
- [ ] Email configuration set
- [ ] Backup strategy defined

### Security
- [ ] JWT_SECRET changed in production
- [ ] Database password updated
- [ ] CORS origins restricted
- [ ] File upload limits set
- [ ] API rate limiting configured
- [ ] SSL/HTTPS enabled

### Testing
- [ ] Login test passed
- [ ] Create employee test
- [ ] Submit leave request test
- [ ] Approve leave request test
- [ ] Generate report test
- [ ] Data export test

### Deployment
- [ ] Staging environment verified
- [ ] Production database backed up
- [ ] Nginx/Apache configured
- [ ] SSL certificate installed
- [ ] Email service configured
- [ ] Monitoring setup

---

## 🔑 Default Credentials

| User | Username | Password | Role |
|------|----------|----------|------|
| Admin | admin | admin123 | Administrator |
| HR Manager | hrmanager | hr123 | HR |

⚠️ **CHANGE THESE IMMEDIATELY IN PRODUCTION**

---

## 🆘 Common Issues & Solutions

### Issue 1: "Connection refused" on port 3000
**Solution:**
```bash
# Check if port is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Try different port
PORT=3001 npm run dev
```

### Issue 2: "Cannot find module" errors
**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 3: Database connection fails
**Solution:**
```bash
# Check MySQL is running
mysql -u root -p
# If not running:
# On Mac: brew services start mysql
# On Windows: net start MySQL80
# On Linux: sudo systemctl start mysql
```

### Issue 4: CORS errors in browser
**Solution:**
```javascript
// In server.js, check CORS is enabled
app.use(cors({
  origin: 'http://localhost:8000',
  credentials: true
}));
```

### Issue 5: JWT errors on protected routes
**Solution:**
1. Check token is sent in headers
2. Verify JWT_SECRET matches in .env
3. Check token hasn't expired

---

## 📞 Support & Resources

### Documentation
- [API Documentation](./API.md)
- [Database Schema](./DATABASE.md)
- [Deployment Guide](./DEPLOYMENT.md)

### Useful Commands
```bash
# Development
npm run dev              # Start with auto-reload
npm run test            # Run tests

# Database
npm run db:migrate      # Create schema
npm run db:seed         # Import sample data
npm run db:backup       # Backup database

# Production
npm start               # Start server
NODE_ENV=production npm start

# Debugging
DEBUG=* npm run dev     # Enable debug logging
```

### Useful Links
- Node.js Docs: https://nodejs.org/docs
- Express.js: https://expressjs.com
- MySQL: https://dev.mysql.com
- JWT: https://jwt.io

---

## ✅ Next Steps After Setup

1. **Create Employee Data**
   - Import from CSV or create manually
   - Set up departments
   - Configure shifts

2. **Configure System**
   - Setup leave types and limits
   - Configure payroll settings
   - Set approval workflows

3. **User Training**
   - HR staff training
   - Manager training
   - Employee onboarding

4. **Go Live**
   - Final testing
   - Production deployment
   - Monitor and support

---

**Last Updated:** December 15, 2024
**Version:** 1.0.0
