#!/usr/bin/env node

/**
 * Firebase Configuration Validator
 * 
 * This script validates Firebase configuration for both frontend and backend
 * to help identify and resolve authentication issues.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function loadEnvFile(filePath) {
  if (!checkFileExists(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return env;
}

function validateFrontendConfig() {
  log('\n🔍 Validating Frontend Configuration...', 'cyan');
  
  const frontendEnvPath = path.join(__dirname, '../frontend/.env');
  const env = loadEnvFile(frontendEnvPath);
  
  if (!env) {
    log('❌ Frontend .env file not found', 'red');
    return false;
  }
  
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_GOOGLE_CLIENT_ID'
  ];
  
  let allValid = true;
  
  requiredVars.forEach(varName => {
    if (env[varName] && env[varName] !== 'your-value-here') {
      log(`✅ ${varName}: Present`, 'green');
    } else {
      log(`❌ ${varName}: Missing or placeholder`, 'red');
      allValid = false;
    }
  });
  
  // Validate specific values
  if (env.VITE_FIREBASE_PROJECT_ID !== 'libeary-tracker') {
    log(`⚠️  Project ID should be 'libeary-tracker', got: ${env.VITE_FIREBASE_PROJECT_ID}`, 'yellow');
  }
  
  if (env.VITE_GOOGLE_CLIENT_ID && !env.VITE_GOOGLE_CLIENT_ID.includes('835678699315')) {
    log(`⚠️  Google Client ID might be incorrect`, 'yellow');
  }
  
  return allValid;
}

function validateBackendConfig() {
  log('\n🔍 Validating Backend Configuration...', 'cyan');
  
  const backendEnvPath = path.join(__dirname, '../backend/.env');
  const env = loadEnvFile(backendEnvPath);
  
  if (!env) {
    log('❌ Backend .env file not found', 'red');
    return false;
  }
  
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];
  
  let allValid = true;
  
  requiredVars.forEach(varName => {
    if (env[varName] && !env[varName].includes('YOUR_ACTUAL') && !env[varName].includes('xxxxx')) {
      log(`✅ ${varName}: Present`, 'green');
    } else {
      log(`❌ ${varName}: Missing or placeholder`, 'red');
      allValid = false;
    }
  });
  
  // Validate private key format
  if (env.FIREBASE_PRIVATE_KEY) {
    if (env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') && 
        env.FIREBASE_PRIVATE_KEY.includes('END PRIVATE KEY')) {
      log(`✅ Private key format: Valid`, 'green');
    } else {
      log(`❌ Private key format: Invalid`, 'red');
      allValid = false;
    }
  }
  
  // Validate client email format
  if (env.FIREBASE_CLIENT_EMAIL) {
    if (env.FIREBASE_CLIENT_EMAIL.includes('@') && 
        env.FIREBASE_CLIENT_EMAIL.includes('iam.gserviceaccount.com')) {
      log(`✅ Client email format: Valid`, 'green');
    } else {
      log(`❌ Client email format: Invalid`, 'red');
      allValid = false;
    }
  }
  
  return allValid;
}

function printSummary(frontendValid, backendValid) {
  log('\n📋 Configuration Summary', 'magenta');
  log('═'.repeat(50), 'magenta');
  
  if (frontendValid && backendValid) {
    log('🎉 All configurations are valid!', 'green');
    log('✅ You should be able to authenticate successfully', 'green');
  } else {
    log('⚠️  Configuration issues found:', 'yellow');
    
    if (!frontendValid) {
      log('  • Frontend Firebase config needs attention', 'red');
    }
    
    if (!backendValid) {
      log('  • Backend Firebase config needs attention', 'red');
    }
    
    log('\n📖 Next steps:', 'cyan');
    log('1. Follow the instructions in FIREBASE_SETUP_INSTRUCTIONS.md', 'cyan');
    log('2. Update the .env files with actual Firebase credentials', 'cyan');
    log('3. Restart both frontend and backend servers', 'cyan');
    log('4. Run this script again to verify', 'cyan');
  }
}

// Main execution
function main() {
  log('🔥 Firebase Configuration Validator', 'blue');
  log('═'.repeat(50), 'blue');
  
  const frontendValid = validateFrontendConfig();
  const backendValid = validateBackendConfig();
  
  printSummary(frontendValid, backendValid);
}

main();
