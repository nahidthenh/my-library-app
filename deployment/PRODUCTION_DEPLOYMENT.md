# Production Deployment Security Guide

This guide provides comprehensive instructions for securely deploying the Library Tracker application to production.

## 🔒 Pre-Deployment Security Checklist

### Environment Security
- [ ] All environment variables are properly configured
- [ ] Secrets are stored securely (not in plain text)
- [ ] Database credentials are rotated and secure
- [ ] API keys and tokens are properly managed
- [ ] SSL/TLS certificates are valid and properly configured
- [ ] Firewall rules are configured to allow only necessary traffic

### Application Security
- [ ] All security middleware is enabled
- [ ] Rate limiting is configured and active
- [ ] Input validation is implemented on all endpoints
- [ ] Authentication and authorization are properly configured
- [ ] File upload security measures are in place
- [ ] Security headers are configured
- [ ] CORS is properly configured for production domains

### Infrastructure Security
- [ ] Server is hardened and up to date
- [ ] Unnecessary services are disabled
- [ ] SSH is configured with key-based authentication
- [ ] Fail2ban or similar intrusion prevention is configured
- [ ] Log monitoring and alerting are set up
- [ ] Backup and disaster recovery plans are in place

## 🚀 Deployment Steps

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y nginx nodejs npm mongodb-server certbot python3-certbot-nginx fail2ban ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Harden SSH
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 2. SSL/TLS Certificate Setup

```bash
# Obtain SSL certificate with Let's Encrypt
sudo certbot --nginx -d library-tracker.com -d www.library-tracker.com

# Generate strong DH parameters
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048

# Set up automatic certificate renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Database Security

```bash
# Secure MongoDB installation
sudo systemctl start mongod
sudo systemctl enable mongod

# Create admin user
mongo admin --eval "
  db.createUser({
    user: 'admin',
    pwd: 'STRONG_ADMIN_PASSWORD',
    roles: ['userAdminAnyDatabase', 'dbAdminAnyDatabase', 'readWriteAnyDatabase']
  })
"

# Create application user
mongo library-tracker --eval "
  db.createUser({
    user: 'library_tracker_user',
    pwd: 'STRONG_APP_PASSWORD',
    roles: ['readWrite']
  })
"

# Enable authentication
sudo sed -i 's/#security:/security:\n  authorization: enabled/' /etc/mongod.conf
sudo systemctl restart mongod
```

### 4. Application Deployment

```bash
# Create application user
sudo useradd -m -s /bin/bash library-tracker
sudo usermod -aG sudo library-tracker

# Clone repository
sudo -u library-tracker git clone https://github.com/your-org/library-tracker.git /home/library-tracker/app
cd /home/library-tracker/app

# Install dependencies
sudo -u library-tracker npm install --production
cd frontend && sudo -u library-tracker npm install && sudo -u library-tracker npm run build

# Set up environment variables
sudo -u library-tracker cp backend/.env.example backend/.env
# Edit backend/.env with production values

# Set proper permissions
sudo chown -R library-tracker:library-tracker /home/library-tracker/app
sudo chmod 600 backend/.env
```

### 5. Process Management with PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
sudo -u library-tracker cat > /home/library-tracker/app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'library-tracker-api',
    script: './backend/server.js',
    cwd: '/home/library-tracker/app',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/library-tracker/error.log',
    out_file: '/var/log/library-tracker/out.log',
    log_file: '/var/log/library-tracker/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/library-tracker
sudo chown library-tracker:library-tracker /var/log/library-tracker

# Start application
sudo -u library-tracker pm2 start ecosystem.config.js
sudo -u library-tracker pm2 save
sudo pm2 startup
```

### 6. Nginx Configuration

```bash
# Copy nginx configuration
sudo cp deployment/nginx.conf /etc/nginx/sites-available/library-tracker
sudo ln -s /etc/nginx/sites-available/library-tracker /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 7. Security Monitoring Setup

```bash
# Configure fail2ban
sudo cp deployment/fail2ban-library-tracker.conf /etc/fail2ban/jail.d/
sudo systemctl restart fail2ban

# Set up log rotation
sudo cp deployment/logrotate-library-tracker /etc/logrotate.d/library-tracker

# Configure monitoring alerts
# Set up external monitoring service (e.g., UptimeRobot, Pingdom)
```

## 🔧 Production Environment Variables

Create `/home/library-tracker/app/backend/.env` with the following variables:

```bash
# Application
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://library_tracker_user:STRONG_APP_PASSWORD@localhost:27017/library-tracker?authSource=library-tracker

# Security
JWT_SECRET=GENERATE_STRONG_64_CHAR_SECRET
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
ENCRYPTION_KEY=GENERATE_STRONG_64_CHAR_KEY
SECRETS_ENCRYPTION_KEY=GENERATE_STRONG_64_CHAR_KEY

# Firebase (Production)
FIREBASE_PROJECT_ID=your-production-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRODUCTION_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id

# CORS
CORS_ORIGIN=https://library-tracker.com,https://www.library-tracker.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_RATE_LIMITING=true

# Security Configuration
TRUSTED_IPS=
ENABLE_SECURITY_LOGGING=true
ENABLE_REQUEST_LOGGING=false
ENABLE_ERROR_LOGGING=true

# Monitoring
LOG_LEVEL=warn
SECURITY_EVENT_WEBHOOK=https://your-monitoring-service.com/webhook
FAILED_LOGIN_THRESHOLD=5
SUSPICIOUS_REQUEST_THRESHOLD=10

# File Upload
MAX_UPLOAD_SIZE=10MB
ENABLE_VIRUS_SCANNING=false

# SSL/TLS
DB_SSL=true
DB_ENCRYPTION=true
```

## 🔍 Security Monitoring

### Log Monitoring
- Application logs: `/var/log/library-tracker/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`
- Security logs: `/var/log/auth.log`

### Key Metrics to Monitor
- Failed login attempts
- Rate limit violations
- Error rates
- Response times
- SSL certificate expiration
- Disk space and memory usage

### Alerting Setup
Configure alerts for:
- High error rates (>5%)
- Multiple failed login attempts
- SSL certificate expiration (30 days)
- High memory/CPU usage (>80%)
- Disk space usage (>85%)

## 🛡️ Ongoing Security Maintenance

### Daily Tasks
- [ ] Review security logs
- [ ] Check system resource usage
- [ ] Verify backup completion

### Weekly Tasks
- [ ] Update system packages
- [ ] Review access logs for anomalies
- [ ] Test backup restoration
- [ ] Check SSL certificate status

### Monthly Tasks
- [ ] Security vulnerability scan
- [ ] Review and rotate secrets
- [ ] Update dependencies
- [ ] Security configuration audit

### Quarterly Tasks
- [ ] Penetration testing
- [ ] Security policy review
- [ ] Disaster recovery testing
- [ ] Access control audit

## 🚨 Incident Response

### Security Incident Checklist
1. **Immediate Response**
   - Isolate affected systems
   - Preserve evidence
   - Notify stakeholders

2. **Investigation**
   - Analyze logs
   - Identify attack vectors
   - Assess damage

3. **Containment**
   - Block malicious IPs
   - Patch vulnerabilities
   - Update security measures

4. **Recovery**
   - Restore from clean backups
   - Verify system integrity
   - Monitor for reoccurrence

5. **Post-Incident**
   - Document lessons learned
   - Update security procedures
   - Implement additional controls

## 📞 Emergency Contacts

- System Administrator: [contact-info]
- Security Team: [contact-info]
- Hosting Provider: [contact-info]
- SSL Certificate Provider: [contact-info]

## 📚 Additional Resources

- [OWASP Production Security Guidelines](https://owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Nginx Security Guide](https://nginx.org/en/docs/http/securing_http.html)
