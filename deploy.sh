#!/bin/bash

# EastVille Backend Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="eastville-backend"
APP_DIR="/var/www/eastville-backend"
DOMAIN="your-domain.com"  # Change this to your actual domain
DB_NAME="villasDB"
DB_USER="eastville_user"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# Function to update system
update_system() {
    print_status "Updating system packages..."
    apt update && apt upgrade -y
    print_success "System updated successfully"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install Node.js 18+
    if ! command_exists node; then
        print_status "Installing Node.js 18+..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    else
        print_status "Node.js already installed"
    fi
    
    # Install PM2
    if ! command_exists pm2; then
        print_status "Installing PM2..."
        npm install -g pm2
    else
        print_status "PM2 already installed"
    fi
    
    # Install Nginx
    if ! command_exists nginx; then
        print_status "Installing Nginx..."
        apt install nginx -y
    else
        print_status "Nginx already installed"
    fi
    
    # Install MongoDB
    if ! command_exists mongod; then
        print_status "Installing MongoDB..."
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        apt update
        apt install -y mongodb-org
    else
        print_status "MongoDB already installed"
    fi
    
    # Install Git
    if ! command_exists git; then
        print_status "Installing Git..."
        apt install git -y
    else
        print_status "Git already installed"
    fi
    
    print_success "All dependencies installed"
}

# Function to setup MongoDB
setup_mongodb() {
    print_status "Setting up MongoDB..."
    
    # Start and enable MongoDB
    systemctl start mongod
    systemctl enable mongod
    
    # Check if MongoDB is running
    if systemctl is-active --quiet mongod; then
        print_success "MongoDB is running"
    else
        print_error "Failed to start MongoDB"
        exit 1
    fi
    
    print_warning "Please manually create MongoDB users as described in DEPLOYMENT.md"
    print_warning "Run: mongosh admin --eval \"db.createUser({user: 'admin', pwd: 'YOUR_STRONG_ADMIN_PASSWORD', roles: [{role: 'userAdminAnyDatabase', db: 'admin'}, {role: 'readWriteAnyDatabase', db: 'admin'}, {role: 'dbAdminAnyDatabase', db: 'admin'}]})\""
}

# Function to deploy application
deploy_app() {
    print_status "Deploying application..."
    
    # Create application directory
    mkdir -p $APP_DIR
    chown www-data:www-data $APP_DIR
    
    # Clone or update repository
    if [ -d "$APP_DIR/.git" ]; then
        print_status "Updating existing repository..."
        cd $APP_DIR
        git pull origin main
    else
        print_status "Cloning repository..."
        cd $APP_DIR
        git clone https://github.com/NehalKamal21/eastVilleBackend.git .
    fi
    
    # Install dependencies
    print_status "Installing npm dependencies..."
    npm install --production
    
    # Create logs directory
    mkdir -p logs
    chown www-data:www-data logs
    
    print_success "Application deployed successfully"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    if [ ! -f "$APP_DIR/.env" ]; then
        print_status "Creating .env file..."
        cat > $APP_DIR/.env << EOF
# Server Configuration
NODE_ENV=production
PORT=5001

# MongoDB Configuration
MONGODB_URI=mongodb://$DB_USER:Admin@#$5050Ajna@localhost:27017/$DB_NAME?authSource=$DB_NAME

# JWT Configuration
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_KEY_HERE
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=https://$DOMAIN

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
EOF
        print_warning "Please update the .env file with your actual values"
    else
        print_status ".env file already exists"
    fi
}

# Function to start application
start_app() {
    print_status "Starting application with PM2..."
    
    cd $APP_DIR
    
    # Stop existing process if running
    if pm2 list | grep -q $APP_NAME; then
        print_status "Stopping existing process..."
        pm2 stop $APP_NAME
        pm2 delete $APP_NAME
    fi
    
    # Start application
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup
    
    print_success "Application started successfully"
}

# Function to setup Nginx
setup_nginx() {
    print_status "Setting up Nginx..."
    
    # Create Nginx configuration
    tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # Test and restart Nginx
    nginx -t
    systemctl restart nginx
    
    print_success "Nginx configured successfully"
}

# Function to setup firewall
setup_firewall() {
    print_status "Setting up firewall..."
    
    # Install UFW if not installed
    if ! command_exists ufw; then
        apt install ufw -y
    fi
    
    # Configure firewall
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Enable firewall
    echo "y" | ufw enable
    
    print_success "Firewall configured successfully"
}

# Function to check deployment
check_deployment() {
    print_status "Checking deployment..."
    
    # Check PM2 status
    if pm2 list | grep -q $APP_NAME; then
        print_success "PM2 process is running"
    else
        print_error "PM2 process is not running"
    fi
    
    # Check Nginx status
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
    
    # Check MongoDB status
    if systemctl is-active --quiet mongod; then
        print_success "MongoDB is running"
    else
        print_error "MongoDB is not running"
    fi
    
    # Test API endpoint
    if curl -f -s http://localhost:5001/api/clusters > /dev/null; then
        print_success "API is responding"
    else
        print_error "API is not responding"
    fi
}

# Main deployment function
main() {
    print_status "Starting EastVille Backend deployment..."
    
    # Check if not running as root
    check_root
    
    # Update system
    update_system
    
    # Install dependencies
    install_dependencies
    
    # Setup MongoDB
    setup_mongodb
    
    # Deploy application
    deploy_app
    
    # Setup environment
    setup_environment
    
    # Start application
    start_app
    
    # Setup Nginx
    setup_nginx
    
    # Setup firewall
    setup_firewall
    
    # Check deployment
    check_deployment
    
    print_success "Deployment completed successfully!"
    print_warning "Don't forget to:"
    print_warning "1. Update the .env file with your actual values"
    print_warning "2. Create MongoDB users"
    print_warning "3. Setup SSL certificate with: sudo certbot --nginx -d $DOMAIN"
    print_warning "4. Configure your domain DNS to point to this server"
}

# Run main function
main "$@" 