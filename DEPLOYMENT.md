# EastVille Backend Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [MongoDB Security Setup](#mongodb-security-setup)
3. [Backend Deployment](#backend-deployment)
4. [Environment Configuration](#environment-configuration)
5. [SSL/TLS Setup](#ssltls-setup)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup Strategy](#backup-strategy)
8. [Security Checklist](#security-checklist)

## Prerequisites

### System Requirements
- Ubuntu 20.04+ or CentOS 8+ (recommended)
- Node.js 18+ and npm
- PM2 (for process management)
- Nginx (for reverse proxy)
- MongoDB 6.0+
- Git

### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Install Git
sudo apt install git -y
```

## MongoDB Security Setup

### 1. Secure MongoDB Installation

```bash
# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create MongoDB admin user
mongosh admin --eval "
db.createUser({
  user: 'admin',
  pwd: 'YOUR_STRONG_ADMIN_PASSWORD',
  roles: [
    { role: 'userAdminAnyDatabase', db: 'admin' },
    { role: 'readWriteAnyDatabase', db: 'admin' },
    { role: 'dbAdminAnyDatabase', db: 'admin' }
  ]
})
"

# Create application database and user
mongosh admin -u admin -p YOUR_STRONG_ADMIN_PASSWORD --eval "
use villasDB
db.createUser({
  user: 'eastville_user',
  pwd: 'YOUR_STRONG_APP_PASSWORD',
  roles: [
    { role: 'readWrite', db: 'villasDB' },
    { role: 'dbAdmin', db: 'villasDB' }
  ]
})
"
```

### 2. Configure MongoDB Security

Edit MongoDB configuration:
```bash
sudo nano /etc/mongod.conf
```

Add/update these security settings:
```yaml
# Network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1  # Only allow local connections

# Security
security:
  authorization: enabled
  keyFile: /var/lib/mongodb/mongodb-keyfile

# Storage
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# Logging
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
```

### 3. Create MongoDB Keyfile
```bash
# Generate keyfile
sudo openssl rand -base64 756 > /var/lib/mongodb/mongodb-keyfile
sudo chmod 400 /var/lib/mongodb/mongodb-keyfile
sudo chown mongodb:mongodb /var/lib/mongodb/mongodb-keyfile

# Restart MongoDB
sudo systemctl restart mongod
```

### 4. Test MongoDB Connection
```bash
# Test admin connection
mongosh admin -u admin -p YOUR_STRONG_ADMIN_PASSWORD

# Test application connection
mongosh villasDB -u eastville_user -p YOUR_STRONG_APP_PASSWORD
```

## Backend Deployment

### 1. Server Setup

```bash
# Create application directory
sudo mkdir -p /var/www/eastville-backend
sudo chown $USER:$USER /var/www/eastville-backend

# Clone repository
cd /var/www/eastville-backend
git clone https://github.com/your-username/eastVilleBackend.git .

# Install dependencies
npm install --production

# Create logs directory
mkdir -p logs
```

### 2. Environment Configuration

Create production environment file:
```bash
nano .env
```

```env
# Server Configuration
NODE_ENV=production
PORT=5001

# MongoDB Configuration
MONGODB_URI=mongodb://eastville_user:YOUR_STRONG_APP_PASSWORD@localhost:27017/villasDB?authSource=villasDB

# JWT Configuration
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_KEY_HERE
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (if using)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Logging
LOG_LEVEL=info
```

### 3. PM2 Configuration

Update the ecosystem config for production:
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'eastville-backend',
      script: 'src/server.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Security settings
      uid: 'www-data',
      gid: 'www-data'
    }
  ]
};
```

### 4. Start Application with PM2

```bash
# Start in production mode
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

# Enable PM2 to start on boot
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## Environment Configuration

### 1. Nginx Reverse Proxy Setup

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/eastville-backend
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # API Routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health Check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~* \.(env|log|conf)$ {
        deny all;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/eastville-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Firewall Configuration

```bash
# Install UFW
sudo apt install ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 27017/tcp  # MongoDB port (internal only)

# Enable firewall
sudo ufw enable
```

## SSL/TLS Setup

### 1. Install Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 2. Setup Auto-renewal

```bash
# Add to crontab
sudo crontab -e

# Add this line
0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring & Logging

### 1. Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/eastville-backend
```

```
/var/www/eastville-backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Setup Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Setup PM2 monitoring
pm2 install pm2-server-monit
pm2 install pm2-logrotate
```

### 3. Health Check Script

Create a health check script:
```bash
nano /var/www/eastville-backend/health-check.sh
```

```bash
#!/bin/bash

# Health check script
HEALTH_URL="https://your-domain.com/health"
LOG_FILE="/var/www/eastville-backend/logs/health-check.log"

# Check if application is responding
if curl -f -s $HEALTH_URL > /dev/null; then
    echo "$(date): Health check passed" >> $LOG_FILE
    exit 0
else
    echo "$(date): Health check failed" >> $LOG_FILE
    # Restart application
    pm2 restart eastville-backend
    exit 1
fi
```

Make it executable:
```bash
chmod +x health-check.sh

# Add to crontab for monitoring
crontab -e

# Add this line (check every 5 minutes)
*/5 * * * * /var/www/eastville-backend/health-check.sh
```

## Backup Strategy

### 1. MongoDB Backup

Create backup script:
```bash
nano /var/www/eastville-backend/backup-mongo.sh
```

```bash
#!/bin/bash

# MongoDB backup script
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="villasDB"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
mongodump --db $DB_NAME --out $BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/$DATE.tar.gz -C $BACKUP_DIR $DATE

# Remove uncompressed backup
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/$DATE.tar.gz"
```

### 2. Application Backup

```bash
nano /var/www/eastville-backend/backup-app.sh
```

```bash
#!/bin/bash

# Application backup script
BACKUP_DIR="/var/backups/eastville-backend"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/eastville-backend"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup (exclude node_modules and logs)
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='.git' \
    -C $APP_DIR .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "app_*.tar.gz" -mtime +7 -delete

echo "Application backup completed: $BACKUP_DIR/app_$DATE.tar.gz"
```

### 3. Setup Automated Backups

```bash
chmod +x backup-mongo.sh backup-app.sh

# Add to crontab
crontab -e

# Add these lines (daily backups at 2 AM)
0 2 * * * /var/www/eastville-backend/backup-mongo.sh
30 2 * * * /var/www/eastville-backend/backup-app.sh
```

## Security Checklist

### ✅ Server Security
- [ ] Firewall configured (UFW)
- [ ] SSH key-based authentication only
- [ ] Fail2ban installed and configured
- [ ] Regular system updates enabled
- [ ] Unnecessary services disabled

### ✅ MongoDB Security
- [ ] Authentication enabled
- [ ] Strong passwords set
- [ ] Network access restricted (bindIp: 127.0.0.1)
- [ ] Keyfile authentication configured
- [ ] Regular backups scheduled

### ✅ Application Security
- [ ] Environment variables properly set
- [ ] JWT secrets are strong and unique
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] HTTPS enforced

### ✅ SSL/TLS
- [ ] SSL certificate installed
- [ ] Auto-renewal configured
- [ ] Strong cipher suites used
- [ ] Security headers implemented

### ✅ Monitoring
- [ ] Application monitoring (PM2)
- [ ] Health checks configured
- [ ] Log rotation enabled
- [ ] Backup strategy implemented

## Deployment Commands Summary

```bash
# 1. Initial setup
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx mongodb-org git

# 2. Install PM2
sudo npm install -g pm2

# 3. Setup MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
# Create users (see MongoDB Security Setup section)

# 4. Deploy application
cd /var/www/eastville-backend
git clone https://github.com/your-username/eastVilleBackend.git .
npm install --production
mkdir logs

# 5. Configure environment
nano .env  # Add production environment variables

# 6. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 7. Configure Nginx
sudo nano /etc/nginx/sites-available/eastville-backend
sudo ln -s /etc/nginx/sites-available/eastville-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 8. Setup SSL
sudo certbot --nginx -d your-domain.com

# 9. Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 10. Setup monitoring and backups
# (See Monitoring & Logging and Backup Strategy sections)
```

## Troubleshooting

### Common Issues

1. **Port 5001 already in use**
   ```bash
   pm2 stop eastville-backend
   pm2 start ecosystem.config.js --env production
   ```

2. **MongoDB connection issues**
   ```bash
   sudo systemctl status mongod
   sudo systemctl restart mongod
   ```

3. **Nginx configuration errors**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **PM2 process not starting**
   ```bash
   pm2 logs eastville-backend
   pm2 restart eastville-backend
   ```

### Useful Commands

```bash
# Check application status
pm2 status
pm2 logs eastville-backend

# Check system resources
htop
df -h
free -h

# Check MongoDB status
sudo systemctl status mongod
mongosh --eval "db.adminCommand('ping')"

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# View logs
tail -f /var/www/eastville-backend/logs/pm2-combined.log
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

This deployment guide provides a comprehensive approach to securely deploying your EastVille backend with proper MongoDB security, SSL/TLS, monitoring, and backup strategies. 