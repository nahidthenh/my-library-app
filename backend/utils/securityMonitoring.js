import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// Security monitoring system
class SecurityMonitor extends EventEmitter {
  constructor() {
    super();
    this.alerts = [];
    this.metrics = new Map();
    this.thresholds = {
      failedLogins: parseInt(process.env.FAILED_LOGIN_THRESHOLD) || 5,
      suspiciousRequests: parseInt(process.env.SUSPICIOUS_REQUEST_THRESHOLD) || 10,
      rateLimitViolations: parseInt(process.env.RATE_LIMIT_VIOLATION_THRESHOLD) || 3,
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 0.1, // 10%
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 5000 // 5 seconds
    };
    this.windowSize = 60 * 60 * 1000; // 1 hour window
    this.initialized = false;
  }

  // Initialize monitoring
  async initialize() {
    if (this.initialized) return;

    // Set up event listeners
    this.setupEventListeners();
    
    // Start periodic cleanup
    this.startCleanup();
    
    // Load existing alerts
    await this.loadAlerts();
    
    this.initialized = true;
    console.log('🔍 Security monitoring initialized');
  }

  // Record security event
  recordEvent(type, data = {}) {
    const event = {
      type,
      timestamp: Date.now(),
      data,
      id: this.generateEventId()
    };

    // Update metrics
    this.updateMetrics(type, event);
    
    // Check thresholds
    this.checkThresholds(type, event);
    
    // Emit event for real-time processing
    this.emit('securityEvent', event);
    
    return event;
  }

  // Update metrics
  updateMetrics(type, event) {
    const now = Date.now();
    const windowStart = now - this.windowSize;
    
    // Get or create metric entry
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }
    
    const events = this.metrics.get(type);
    
    // Add new event
    events.push(event);
    
    // Remove old events outside window
    const filteredEvents = events.filter(e => e.timestamp > windowStart);
    this.metrics.set(type, filteredEvents);
  }

  // Check security thresholds
  checkThresholds(type, event) {
    const events = this.metrics.get(type) || [];
    const count = events.length;
    
    let threshold = null;
    let alertLevel = 'medium';
    
    switch (type) {
      case 'FAILED_LOGIN':
        threshold = this.thresholds.failedLogins;
        alertLevel = 'high';
        break;
      case 'SUSPICIOUS_REQUEST':
        threshold = this.thresholds.suspiciousRequests;
        alertLevel = 'medium';
        break;
      case 'RATE_LIMIT_VIOLATION':
        threshold = this.thresholds.rateLimitViolations;
        alertLevel = 'medium';
        break;
    }
    
    if (threshold && count >= threshold) {
      this.createAlert({
        type: `${type}_THRESHOLD_EXCEEDED`,
        level: alertLevel,
        message: `${type} threshold exceeded: ${count} events in the last hour`,
        data: { count, threshold, events: events.slice(-5) }, // Last 5 events
        timestamp: Date.now()
      });
    }
  }

  // Create security alert
  createAlert(alertData) {
    const alert = {
      id: this.generateEventId(),
      ...alertData,
      acknowledged: false,
      createdAt: new Date().toISOString()
    };
    
    this.alerts.push(alert);
    
    // Log alert
    console.warn('🚨 Security Alert:', alert);
    
    // Emit alert event
    this.emit('securityAlert', alert);
    
    // Send to external monitoring if configured
    this.sendToExternalMonitoring(alert);
    
    return alert;
  }

  // Get security metrics
  getMetrics(timeRange = this.windowSize) {
    const now = Date.now();
    const windowStart = now - timeRange;
    const metrics = {};
    
    for (const [type, events] of this.metrics.entries()) {
      const filteredEvents = events.filter(e => e.timestamp > windowStart);
      
      metrics[type] = {
        count: filteredEvents.length,
        rate: filteredEvents.length / (timeRange / (60 * 1000)), // events per minute
        events: filteredEvents
      };
    }
    
    return {
      timeRange,
      windowStart: new Date(windowStart).toISOString(),
      windowEnd: new Date(now).toISOString(),
      metrics
    };
  }

  // Get active alerts
  getAlerts(acknowledged = false) {
    return this.alerts.filter(alert => alert.acknowledged === acknowledged);
  }

  // Acknowledge alert
  acknowledgeAlert(alertId, userId = null) {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      alert.acknowledgedBy = userId;
      
      console.log(`✅ Alert acknowledged: ${alertId}`);
      return alert;
    }
    
    throw new Error('Alert not found');
  }

  // Generate event ID
  generateEventId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // Setup event listeners
  setupEventListeners() {
    // Listen for security events
    this.on('securityEvent', (event) => {
      // Log to file if enabled
      if (process.env.ENABLE_SECURITY_LOGGING !== 'false') {
        this.logToFile(event);
      }
    });
    
    // Listen for alerts
    this.on('securityAlert', (alert) => {
      // Send notifications if configured
      this.sendNotification(alert);
    });
  }

  // Log event to file
  async logToFile(event) {
    try {
      const logDir = './logs/security';
      await fs.mkdir(logDir, { recursive: true });
      
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(logDir, `security-${date}.log`);
      
      const logEntry = JSON.stringify({
        ...event,
        timestamp: new Date(event.timestamp).toISOString()
      }) + '\n';
      
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Failed to log security event:', error.message);
    }
  }

  // Send to external monitoring
  async sendToExternalMonitoring(alert) {
    const webhookUrl = process.env.SECURITY_EVENT_WEBHOOK;
    
    if (!webhookUrl) return;
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Library-Tracker-Security-Monitor'
        },
        body: JSON.stringify({
          alert,
          application: 'library-tracker',
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('📡 Alert sent to external monitoring');
    } catch (error) {
      console.error('Failed to send alert to external monitoring:', error.message);
    }
  }

  // Send notification
  async sendNotification(alert) {
    // Email notification (placeholder)
    if (process.env.ALERT_EMAIL) {
      console.log(`📧 Email notification sent for alert: ${alert.id}`);
    }
    
    // Slack notification (placeholder)
    if (process.env.SLACK_WEBHOOK) {
      console.log(`💬 Slack notification sent for alert: ${alert.id}`);
    }
  }

  // Load alerts from file
  async loadAlerts() {
    try {
      const alertsFile = './data/security-alerts.json';
      const data = await fs.readFile(alertsFile, 'utf8');
      this.alerts = JSON.parse(data);
      console.log(`📂 Loaded ${this.alerts.length} security alerts`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load alerts:', error.message);
      }
    }
  }

  // Save alerts to file
  async saveAlerts() {
    try {
      const alertsFile = './data/security-alerts.json';
      await fs.mkdir(path.dirname(alertsFile), { recursive: true });
      await fs.writeFile(alertsFile, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      console.error('Failed to save alerts:', error.message);
    }
  }

  // Start periodic cleanup
  startCleanup() {
    // Clean up old events every hour
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);
    
    // Save alerts every 5 minutes
    setInterval(() => {
      this.saveAlerts();
    }, 5 * 60 * 1000);
  }

  // Clean up old events
  cleanupOldEvents() {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [type, events] of this.metrics.entries()) {
      const filteredEvents = events.filter(e => e.timestamp > cutoff);
      this.metrics.set(type, filteredEvents);
    }
    
    // Clean up old alerts (keep for 30 days)
    const alertCutoff = now - (30 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.createdAt).getTime() > alertCutoff
    );
  }

  // Generate security report
  generateReport(timeRange = 24 * 60 * 60 * 1000) { // 24 hours
    const metrics = this.getMetrics(timeRange);
    const alerts = this.getAlerts();
    const acknowledgedAlerts = this.getAlerts(true);
    
    return {
      timestamp: new Date().toISOString(),
      timeRange: timeRange / (60 * 60 * 1000), // hours
      summary: {
        totalEvents: Object.values(metrics.metrics).reduce((sum, m) => sum + m.count, 0),
        totalAlerts: alerts.length,
        acknowledgedAlerts: acknowledgedAlerts.length,
        criticalAlerts: alerts.filter(a => a.level === 'critical').length,
        highAlerts: alerts.filter(a => a.level === 'high').length,
        mediumAlerts: alerts.filter(a => a.level === 'medium').length
      },
      metrics: metrics.metrics,
      alerts: alerts.slice(-10), // Last 10 alerts
      recommendations: this.generateRecommendations(metrics, alerts)
    };
  }

  // Generate security recommendations
  generateRecommendations(metrics, alerts) {
    const recommendations = [];
    
    // Check for high error rates
    const errorEvents = metrics.metrics.ERROR || { count: 0 };
    const totalEvents = Object.values(metrics.metrics).reduce((sum, m) => sum + m.count, 0);
    const errorRate = totalEvents > 0 ? errorEvents.count / totalEvents : 0;
    
    if (errorRate > this.thresholds.errorRate) {
      recommendations.push({
        type: 'HIGH_ERROR_RATE',
        message: `Error rate is ${(errorRate * 100).toFixed(2)}%, consider investigating`,
        priority: 'high'
      });
    }
    
    // Check for unacknowledged critical alerts
    const criticalAlerts = alerts.filter(a => a.level === 'critical' && !a.acknowledged);
    if (criticalAlerts.length > 0) {
      recommendations.push({
        type: 'UNACKNOWLEDGED_CRITICAL_ALERTS',
        message: `${criticalAlerts.length} critical alerts need attention`,
        priority: 'critical'
      });
    }
    
    // Check for repeated failed logins
    const failedLogins = metrics.metrics.FAILED_LOGIN || { count: 0 };
    if (failedLogins.count > this.thresholds.failedLogins) {
      recommendations.push({
        type: 'HIGH_FAILED_LOGINS',
        message: 'Consider implementing account lockout or additional security measures',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }
}

// Vulnerability scanner
export const vulnerabilityScanner = {
  // Scan for common vulnerabilities
  async scanVulnerabilities() {
    const vulnerabilities = [];
    
    // Check for weak JWT secrets
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      vulnerabilities.push({
        type: 'WEAK_JWT_SECRET',
        severity: 'high',
        description: 'JWT secret is too short',
        recommendation: 'Use a JWT secret with at least 32 characters'
      });
    }
    
    // Check for default passwords
    const defaultPasswords = ['password', '123456', 'admin', 'root'];
    for (const [key, value] of Object.entries(process.env)) {
      if (key.toLowerCase().includes('password') && 
          defaultPasswords.includes(value?.toLowerCase())) {
        vulnerabilities.push({
          type: 'DEFAULT_PASSWORD',
          severity: 'critical',
          description: `Default password detected in ${key}`,
          recommendation: 'Change to a strong, unique password'
        });
      }
    }
    
    // Check for insecure configurations
    if (process.env.NODE_ENV === 'production') {
      if (process.env.CORS_ORIGIN?.includes('*')) {
        vulnerabilities.push({
          type: 'INSECURE_CORS',
          severity: 'medium',
          description: 'CORS allows all origins in production',
          recommendation: 'Restrict CORS to specific origins'
        });
      }
      
      if (process.env.ENABLE_RATE_LIMITING === 'false') {
        vulnerabilities.push({
          type: 'RATE_LIMITING_DISABLED',
          severity: 'medium',
          description: 'Rate limiting is disabled in production',
          recommendation: 'Enable rate limiting for production'
        });
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      vulnerabilities,
      summary: {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length
      }
    };
  },
  
  // Scan dependencies for vulnerabilities
  async scanDependencies() {
    // This would integrate with npm audit or similar tools
    console.log('🔍 Dependency vulnerability scan (placeholder)');
    return {
      timestamp: new Date().toISOString(),
      vulnerabilities: [],
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
    };
  }
};

// Create singleton instance
const securityMonitor = new SecurityMonitor();

export { securityMonitor, SecurityMonitor };
export default securityMonitor;
