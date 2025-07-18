# Deployment Guide

This guide covers different deployment options for Design Diary.

## 🚀 Quick Deployment Options

### Option 1: Local Development
Perfect for testing and development:

```bash
# Clone and setup
git clone https://github.com/your-username/design-diary.git
cd design-diary
npm install
cd server && npm install && cd ..

# Start development servers
./start-dev.sh
```

### Option 2: Production Build
For hosting on static file servers:

```bash
# Build the React app
npm run build

# Serve the built files
npx serve -s build -l 3000
```

### Option 3: Docker Deployment
Using Docker for containerized deployment:

```bash
# Build and run with Docker
docker-compose up --build
```

## 🏗️ Production Deployment

### Prerequisites
- Node.js 16+ and Python 3.8+
- Process manager (PM2 recommended)
- Reverse proxy (nginx recommended)

### Step 1: Build the Application

```bash
# Install dependencies
npm ci --production
cd server && npm ci --production && cd ..

# Build React app
npm run build
```

### Step 2: Configure Environment

Create `.env.production`:
```env
NODE_ENV=production
REACT_APP_API_URL=http://your-domain.com:3001
PORT=3000
PYTHON_SERVER_PORT=3001
```

### Step 3: Start Services

```bash
# Start Python execution server
cd server
pm2 start npm --name "design-diary-server" -- start
cd ..

# Serve React build
pm2 start npx --name "design-diary-frontend" -- serve -s build -l 3000
```

### Step 4: Configure Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐳 Docker Deployment

### Dockerfile (Frontend)
```dockerfile
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Dockerfile (Backend)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
RUN apk add --no-cache python3 py3-pip
EXPOSE 3001
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
```

## ☁️ Cloud Deployment

### Vercel (Frontend Only)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Note: You'll need to deploy the Python server separately.

### Heroku (Full Stack)
```bash
# Create Heroku apps
heroku create design-diary-frontend
heroku create design-diary-backend

# Deploy backend
cd server
git subtree push --prefix=server heroku main

# Deploy frontend
cd ..
heroku config:set REACT_APP_API_URL=https://design-diary-backend.herokuapp.com
git push heroku main
```

### AWS EC2
1. Launch EC2 instance (Ubuntu 20.04 LTS)
2. Install Node.js and Python
3. Clone repository and build
4. Configure nginx and SSL
5. Use PM2 for process management

### DigitalOcean Droplet
Similar to EC2, but with DigitalOcean's one-click Node.js app.

## 🔧 Environment Configuration

### Frontend Environment Variables
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_VERSION=$npm_package_version
```

### Backend Environment Variables
```env
NODE_ENV=production
PORT=3001
PYTHON_PATH=/usr/bin/python3
CORS_ORIGIN=http://localhost:3000
```

## 📊 Monitoring and Logging

### PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs design-diary-server
pm2 logs design-diary-frontend
```

### Log Configuration
```javascript
// server/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 🔒 Security Considerations

### HTTPS Setup
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Security Headers
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using the port
   lsof -i :3000
   lsof -i :3001
   ```

2. **Python path issues**
   ```bash
   # Check Python installation
   which python3
   python3 --version
   ```

3. **Build failures**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Remove node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Memory issues**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

### Health Checks
```bash
# Frontend health check
curl http://localhost:3000

# Backend health check
curl http://localhost:3001/health
```

## 📈 Performance Optimization

### Frontend Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement code splitting
- Optimize bundle size

### Backend Optimization
- Use clustering for Node.js
- Implement caching
- Optimize Python execution
- Monitor memory usage

## 🔄 Updates and Maintenance

### Update Process
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm update
cd server && npm update && cd ..

# Rebuild and restart
npm run build
pm2 restart all
```

### Backup Strategy
- Regular database backups (if applicable)
- Code repository backups
- Configuration file backups
- User data backups

This deployment guide should help you get Design Diary running in various environments. Choose the option that best fits your needs and infrastructure.
