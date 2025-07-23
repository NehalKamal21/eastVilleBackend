# EastVille Backend Deployment Guide (Root User)

## ⚠️ Important Security Note

**Running as root is generally not recommended for security reasons.** However, if you must deploy as root, this guide provides the necessary steps while maintaining security best practices.

## Quick Start (Root User)

### 1. Switch to Root User
```bash
sudo su -
# or
sudo -i
```

### 2. Clone and Run Deployment Script
```bash
# Clone your repository
git clone https://github.com/your-username/eastVilleBackend.git
cd eastVilleBackend

# Make script executable
chmod +x deploy.sh

# Run deployment as root
./deploy.sh
```

## Manual Deployment Steps (Root User)

### 1. System Setup
```bash
# Update system
apt update && apt upgrade -y

# Install dependencies
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs nginx mongodb-org git

# Install PM2 globally
npm install -g pm2
```

### 2. MongoDB Security Setup
```bash
# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Create admin user
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

# Create application user
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

# Secure MongoDB configuration
nano /etc/mongod.conf
```

Add these security settings to `/etc/mongod.conf`:
```yaml
net:
  port: 27017
  bindIp: 127.0.0.1

security:
  authorization: enabled

storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
```

```bash
# Restart MongoDB
systemctl restart mongod
```

### 3. Application Deployment
```bash
# Create application directory
mkdir -p /var/www/eastville-backend
cd /var/www/eastville-backend

# Clone repository
git clone https://github.com/your-username/eastVilleBackend.git .

# Install dependencies
npm install --production

# Create logs directory
mkdir -p logs

# Set proper permissions
chown -R www-data:www-data /var/www/eastville-backend
chmod -R 755 /var/www/eastville-backend
```

### 4. Environment Configuration
```bash
# Create .env file
nano .env
```

Add your production environment variables:
```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb://eastville_user:YOUR_STRONG_APP_PASSWORD@localhost:27017/villasDB?authSource=villasDB
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_KEY_HERE
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### 5. PM2 Configuration
```bash
# Update ecosystem config for root deployment
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'eastville-backend',
      script: 'src/server.js',
      instances: 'max',
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
      // Root-specific settings
      uid: 'www-data',
      gid: 'www-data'
    }
  ]
};
```

### 6. Start Application
```bash
# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Setup PM2 to start on boot
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

### 7. Nginx Configuration
```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/eastville-backend
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

```bash
# Enable site
ln -sf /etc/nginx/sites-available/eastville-backend /etc/nginx/sites-enabled/

# Test and restart Nginx
nginx -t
systemctl restart nginx
```

### 8. Firewall Setup
```bash
# Install UFW
apt install ufw -y

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
echo "y" | ufw enable
```

### 9. SSL Certificate (Optional)
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## Security Considerations for Root Deployment

### 1. File Permissions
```bash
# Set proper ownership
chown -R www-data:www-data /var/www/eastville-backend
chmod -R 755 /var/www/eastville-backend
chmod 600 /var/www/eastville-backend/.env

# Secure MongoDB files
chown mongodb:mongodb /var/lib/mongodb/mongodb-keyfile
chmod 400 /var/lib/mongodb/mongodb-keyfile
```

### 2. Service Isolation
```bash
# Create dedicated user for application (recommended)
useradd -r -s /bin/false eastville
chown -R eastville:eastville /var/www/eastville-backend

# Update PM2 configuration to use dedicated user
# In ecosystem.config.js:
# uid: 'eastville',
# gid: 'eastville'
```

### 3. Network Security
```bash
# Block MongoDB from external access
ufw deny 27017/tcp

# Only allow necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
```

## Monitoring and Maintenance

### 1. Check Services Status
```bash
# Check all services
systemctl status mongod nginx
pm2 status
pm2 logs eastville-backend

# Check application health
curl http://localhost:5001/api/clusters
```

### 2. Log Management
```bash
# Setup log rotation
nano /etc/logrotate.d/eastville-backend
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

### 3. Backup Strategy
```bash
# Create backup script
nano /var/www/eastville-backend/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups"

# MongoDB backup
mongodump --db villasDB --out $BACKUP_DIR/mongodb_$DATE
tar -czf $BACKUP_DIR/mongodb_$DATE.tar.gz -C $BACKUP_DIR mongodb_$DATE
rm -rf $BACKUP_DIR/mongodb_$DATE

# Application backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='.git' \
    -C /var/www/eastville-backend .

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x /var/www/eastville-backend/backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /var/www/eastville-backend/backup.sh" | crontab -
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   # Fix ownership
   chown -R www-data:www-data /var/www/eastville-backend
   chmod -R 755 /var/www/eastville-backend
   ```

2. **MongoDB Connection Issues**
   ```bash
   # Check MongoDB status
   systemctl status mongod
   systemctl restart mongod
   
   # Test connection
   mongosh villasDB -u eastville_user -p YOUR_PASSWORD
   ```

3. **PM2 Process Issues**
   ```bash
   # Check PM2 status
   pm2 status
   pm2 logs eastville-backend
   
   # Restart application
   pm2 restart eastville-backend
   ```

4. **Nginx Configuration Errors**
   ```bash
   # Test configuration
   nginx -t
   
   # Check Nginx status
   systemctl status nginx
   systemctl restart nginx
   ```

## Post-Deployment Checklist

- [ ] MongoDB authentication enabled
- [ ] Application running with PM2
- [ ] Nginx reverse proxy configured
- [ ] Firewall rules applied
- [ ] SSL certificate installed (if using domain)
- [ ] Log rotation configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] File permissions secured
- [ ] Environment variables configured

## Security Recommendations

1. **Create a dedicated user** for the application instead of running as root
2. **Use strong passwords** for all database users
3. **Enable firewall** and only open necessary ports
4. **Regular security updates** for the system
5. **Monitor logs** for suspicious activity
6. **Backup regularly** and test restore procedures
7. **Use HTTPS** for all external communications
8. **Implement rate limiting** to prevent abuse

This guide provides a secure deployment approach even when running as root, but consider migrating to a dedicated user for production environments. 