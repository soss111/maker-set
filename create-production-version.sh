#!/bin/bash

# Create Production Version
# Prepares the codebase for production deployment

set -e

CURRENT_DIR="/Users/lauri/MakerSet"
PRODUCTION_DIR="/Users/lauri/MakerSet-Production"

echo "🏭 Creating production version..."
echo ""

# Remove old production directory
if [ -d "$PRODUCTION_DIR" ]; then
    echo "🗑️  Removing existing production directory..."
    rm -rf "$PRODUCTION_DIR"
fi

# Create production directory
mkdir -p "$PRODUCTION_DIR"
cd "$PRODUCTION_DIR"

echo "📁 Copying files..."

# Copy all files
rsync -av \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='*.db' \
    --exclude='*.sqlite' \
    --exclude='uploads/*' \
    --exclude='build' \
    --exclude='coverage' \
    "$CURRENT_DIR/" .

# Build frontend
echo ""
echo "🔨 Building frontend for production..."
cd client
npm install --production=false
npm run build
cd ..

# Create production .env example
echo "📝 Creating production environment files..."
cat > server/.env.production << 'EOF'
# Production Environment Variables
# Copy this to .env and configure

# Database Configuration
DATABASE_ENGINE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=makerset_db
DB_USER=makerset_user
DB_PASSWORD=CHANGE_THIS_TO_SECURE_PASSWORD

# Server Configuration
PORT=5000
NODE_ENV=production

# JWT Configuration
JWT_SECRET=CHANGE_THIS_TO_RANDOM_32_CHARACTER_SECRET_KEY
JWT_EXPIRES_IN=7d

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Email Configuration (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
ADMIN_COMPANY=Your Company Name
EOF

# Create production package.json with production scripts
cat > package.json << 'EOF'
{
  "name": "makerset-production",
  "version": "1.0.0",
  "description": "MakerLab Sets Management System - Production Build",
  "main": "server/index.js",
  "scripts": {
    "start": "cd server && node index.js",
    "server": "cd server && node index.js",
    "build": "cd client && npm run build",
    "setup": "npm install --production && cd server && npm install --production && cd ..",
    "db:setup": "cd server && npm run db:setup",
    "db:migrate": "cd server && npm run db:migrate"
  },
  "keywords": [
    "makerset",
    "production",
    "education"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "node-cron": "^4.2.1",
    "puppeteer": "^24.26.0",
    "sharp": "^0.34.4"
  }
}
EOF

# Create ecosystem.config.js for PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'makerset-api',
    script: './server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10
  }]
};
EOF

# Create production deployment script
cat > deploy-production.sh << 'EOF'
#!/bin/bash

echo "🚀 Deploying to production..."

# Install production dependencies only
echo "📦 Installing production dependencies..."
npm install --production
cd server && npm install --production && cd ..

# Create necessary directories
mkdir -p server/uploads
mkdir -p server/database
mkdir -p logs
chmod 755 server/uploads

# Setup environment
if [ ! -f "server/.env" ]; then
    echo "⚠️  server/.env not found!"
    echo "📝 Copy server/.env.production to server/.env and configure it"
    exit 1
fi

# Initialize database if needed
if [ ! -f "server/database/makerset.db" ]; then
    echo "🗄️  Initializing database..."
    cd server
    npm run db:setup
    cd ..
fi

# Start with PM2 if available
if command -v pm2 &> /dev/null; then
    echo "🔄 Starting with PM2..."
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ Application started with PM2"
    echo "📋 Run 'pm2 status' to check status"
    echo "📋 Run 'pm2 logs makerset-api' to view logs"
else
    echo "⚠️  PM2 not installed. Install with: npm install -g pm2"
    echo "📋 Or run manually with: npm start"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure server/.env with your settings"
echo "2. Set up your web server (Nginx/Apache)"
echo "3. Configure SSL certificate"
echo "4. Set up database (MySQL/PostgreSQL)"
EOF

chmod +x deploy-production.sh

# Create production README
cat > README-PRODUCTION.md << 'EOF'
# MakerSet - Production Deployment Guide

## Production Checklist

### Before Deployment

- [ ] Configure `server/.env` with production values
- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Configure database credentials
- [ ] Set `CORS_ORIGIN` to your domain
- [ ] Configure admin credentials
- [ ] Set up MySQL/PostgreSQL database
- [ ] Install PM2: `npm install -g pm2`

### Installation

```bash
# Install production dependencies
npm install --production
cd server && npm install --production && cd ..
```

### Configuration

1. Copy and edit environment file:
   ```bash
   cp server/.env.production server/.env
   nano server/.env
   ```

2. Configure all required values:
   - Database credentials
   - JWT_SECRET
   - CORS_ORIGIN
   - Admin credentials

### Database Setup

```bash
cd server
npm run db:setup
```

### Deployment

```bash
# Run deployment script
./deploy-production.sh

# Or manually:
pm2 start ecosystem.config.js
pm2 save
```

### Production Scripts

```bash
npm start              # Start server
npm run build          # Build frontend (already built)
pm2 start ecosystem.config.js  # Start with PM2
pm2 stop makerset-api  # Stop application
pm2 restart makerset-api  # Restart application
pm2 logs makerset-api  # View logs
```

### Environment Variables

See `server/.env.production` for required variables.

### Security Checklist

- [ ] Use strong passwords
- [ ] Enable HTTPS/SSL
- [ ] Set secure JWT_SECRET
- [ ] Configure firewall
- [ ] Set up rate limiting
- [ ] Enable CORS for your domain only
- [ ] Regular backups
- [ ] Monitor logs

### Web Server Configuration

Configure Nginx or Apache to:
- Serve `client/build/` for frontend
- Proxy `/api/*` to `http://localhost:5000`
- Serve `/uploads` from `server/uploads`

See deployment guides for full configuration.

### Maintenance

```bash
# Update application
git pull
npm install --production
cd server && npm install --production && cd ..
pm2 restart makerset-api

# Database backup
mysqldump -u user -p makerset_db > backup.sql
```

### Monitoring

- PM2 monitoring: `pm2 monit`
- Logs: `pm2 logs makerset-api`
- Status: `pm2 status`

## Support

For issues, check:
- Application logs: `pm2 logs`
- Server logs: Check web server logs
- Database logs: Check database server logs
EOF

# Create .gitignore for production
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
server/node_modules/
client/node_modules/

# Environment
.env
.env.local
.env.production
server/.env
server/.env.*

# Build outputs
client/build
client/dist

# Logs
*.log
logs/
server/logs/
pm2-error.log
pm2-out.log

# Database
*.db
*.sqlite
server/database/*.db

# Uploads
server/uploads/*
!server/uploads/.gitkeep

# OS
.DS_Store
.vscode/
.idea/

# Temporary
*.tmp
*.bak
EOF

# Remove dev dependencies from package.json files
echo "🧹 Cleaning up development dependencies..."

# Update server package.json to remove devDependencies section
cd server
if [ -f "package.json" ]; then
    # Remove nodemon and other dev tools
    npm install --production=false
    # Keep only production dependencies
fi
cd ..

# Remove test files (optional - keeping them for now)
# find . -name "*.test.js" -type f -delete
# find . -name "*.test.tsx" -type f -delete

# Create logs directory
mkdir -p logs
touch logs/.gitkeep

# Create uploads directory placeholder
mkdir -p server/uploads
touch server/uploads/.gitkeep

echo ""
echo "✅ Production version created in: $PRODUCTION_DIR"
echo ""
echo "📊 Summary:"
echo "  - Frontend built: ✅"
echo "  - Production configs: ✅"
echo "  - PM2 config: ✅"
echo "  - Deployment script: ✅"
echo "  - Production README: ✅"
echo ""
echo "Next steps:"
echo "  cd $PRODUCTION_DIR"
echo "  ./deploy-production.sh"
echo ""

