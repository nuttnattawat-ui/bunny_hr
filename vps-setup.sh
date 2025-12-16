#!/bin/bash

# ============================================
# Bunny HR - VPS Auto Setup Script
# Ubuntu 22.04/24.04 LTS
# ============================================

set -e  # Exit on error

echo "======================================"
echo "🚀 Bunny HR System - VPS Setup"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="bunny_hr"
APP_DIR="/var/www/$APP_NAME"
GITHUB_REPO="https://github.com/nuttnattawat-ui/bunny_hr.git"
NODE_VERSION="20"

echo -e "${YELLOW}📋 กรุณาใส่ข้อมูลสำหรับติดตั้ง:${NC}"
echo ""

# Get database password
read -sp "🔐 MySQL Root Password (สร้างใหม่): " MYSQL_ROOT_PASS
echo ""
read -sp "🔐 MySQL Root Password (ยืนยัน): " MYSQL_ROOT_PASS_CONFIRM
echo ""

if [ "$MYSQL_ROOT_PASS" != "$MYSQL_ROOT_PASS_CONFIRM" ]; then
    echo -e "${RED}❌ Password ไม่ตรงกัน!${NC}"
    exit 1
fi

read -sp "🔐 Database Password สำหรับ HR System: " DB_PASSWORD
echo ""
echo ""

echo -e "${GREEN}✅ เริ่มติดตั้ง...${NC}"
echo ""

# ============================================
# 1. Update System
# ============================================
echo -e "${YELLOW}[1/10]${NC} 🔄 อัพเดทระบบ..."
apt update && apt upgrade -y

# ============================================
# 2. Install Node.js
# ============================================
echo -e "${YELLOW}[2/10]${NC} 📦 ติดตั้ง Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

# ============================================
# 3. Install MySQL
# ============================================
echo -e "${YELLOW}[3/10]${NC} 🗄️ ติดตั้ง MySQL..."
export DEBIAN_FRONTEND=noninteractive
debconf-set-selections <<< "mysql-server mysql-server/root_password password $MYSQL_ROOT_PASS"
debconf-set-selections <<< "mysql-server mysql-server/root_password_again password $MYSQL_ROOT_PASS"
apt install -y mysql-server

# Start MySQL
systemctl start mysql
systemctl enable mysql

# Secure MySQL installation
mysql -uroot -p"$MYSQL_ROOT_PASS" <<EOF
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
EOF

# ============================================
# 4. Install Nginx
# ============================================
echo -e "${YELLOW}[4/10]${NC} 🌐 ติดตั้ง Nginx..."
apt install -y nginx

# ============================================
# 5. Install Git
# ============================================
echo -e "${YELLOW}[5/10]${NC} 📚 ติดตั้ง Git..."
apt install -y git

# ============================================
# 6. Install PM2
# ============================================
echo -e "${YELLOW}[6/10]${NC} 🔧 ติดตั้ง PM2..."
npm install -g pm2

# ============================================
# 7. Clone Repository
# ============================================
echo -e "${YELLOW}[7/10]${NC} 📥 ดาวน์โหลด Code จาก GitHub..."
mkdir -p /var/www
cd /var/www
if [ -d "$APP_DIR" ]; then
    rm -rf "$APP_DIR"
fi
git clone "$GITHUB_REPO" "$APP_NAME"
cd "$APP_DIR"

# ============================================
# 8. Setup Application
# ============================================
echo -e "${YELLOW}[8/10]${NC} ⚙️ ติดตั้ง Dependencies..."
npm install --production

# Create .env file
echo -e "${YELLOW}[8/10]${NC} 📝 สร้างไฟล์ Configuration..."
cat > .env <<EOL
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=$DB_PASSWORD
DB_NAME=hr_system
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# CORS
FRONTEND_URL=http://103.76.182.195
EOL

# ============================================
# 9. Setup Database
# ============================================
echo -e "${YELLOW}[9/10]${NC} 🗄️ สร้าง Database..."

# Create database and user
mysql -uroot -p"$MYSQL_ROOT_PASS" <<EOF
CREATE DATABASE IF NOT EXISTS hr_system;
GRANT ALL PRIVILEGES ON hr_system.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
EOF

# Update DB password in MySQL
mysql -uroot -p"$MYSQL_ROOT_PASS" <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
EOF

# Import schema
mysql -uroot -p"$DB_PASSWORD" hr_system < database/schema.sql

# Setup initial data
node setup-db.js

# ============================================
# 10. Configure Nginx
# ============================================
echo -e "${YELLOW}[10/10]${NC} 🌐 ตั้งค่า Nginx..."

cat > /etc/nginx/sites-available/$APP_NAME <<'NGINXCONF'
server {
    listen 80;
    server_name 103.76.182.195;

    # Frontend
    location / {
        root /var/www/bunny_hr/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/bunny_hr/frontend;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINXCONF

# Enable site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# ============================================
# Start Application with PM2
# ============================================
echo -e "${GREEN}🚀 เริ่มระบบ...${NC}"

cd "$APP_DIR"
pm2 start backend/server.js --name "$APP_NAME"
pm2 save
pm2 startup systemd -u root --hp /root

# ============================================
# Setup Firewall
# ============================================
echo -e "${GREEN}🔒 ตั้งค่า Firewall...${NC}"
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS (for future)
ufw reload

# ============================================
# Create Update Script
# ============================================
echo -e "${GREEN}📝 สร้าง Script อัปเดท...${NC}"

cat > /root/update-hr.sh <<'UPDATESCRIPT'
#!/bin/bash
cd /var/www/bunny_hr
echo "🔄 ดึง code ใหม่จาก GitHub..."
git pull
echo "📦 อัปเดท dependencies..."
npm install --production
echo "🔄 Restart server..."
pm2 restart bunny_hr
echo "✅ อัปเดทเสร็จสิ้น!"
pm2 status
UPDATESCRIPT

chmod +x /root/update-hr.sh

# ============================================
# Completion
# ============================================
echo ""
echo "======================================"
echo -e "${GREEN}✅ ติดตั้งเสร็จสมบูรณ์!${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}📋 ข้อมูลการเข้าใช้งาน:${NC}"
echo ""
echo "🌐 เว็บไซต์: http://103.76.182.195"
echo "👤 Username: admin"
echo "🔐 Password: admin123"
echo ""
echo -e "${YELLOW}📝 คำสั่งที่มีประโยชน์:${NC}"
echo ""
echo "ดูสถานะ:        pm2 status"
echo "ดู log:          pm2 logs bunny_hr"
echo "Restart:         pm2 restart bunny_hr"
echo "อัปเดทระบบ:     /root/update-hr.sh"
echo ""
echo -e "${GREEN}🎉 สามารถใช้งานได้แล้ว!${NC}"
echo ""
