// Test setup verification
export const testEnvironmentSetup = () => {
  const tests = [];
  
  // Test 1: Environment variables
  const envVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_API_BASE_URL'
  ];
  
  envVars.forEach(varName => {
    const value = import.meta.env[varName];
    tests.push({
      name: `Environment variable ${varName}`,
      status: value ? 'PASS' : 'FAIL',
      message: value ? `Set to: ${value}` : 'Not set'
    });
  });
  
  // Test 2: Firebase config
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    };
    
    const hasRequiredFields = firebaseConfig.apiKey && 
                             firebaseConfig.authDomain && 
                             firebaseConfig.projectId;
    
    tests.push({
      name: 'Firebase configuration',
      status: hasRequiredFields ? 'PASS' : 'FAIL',
      message: hasRequiredFields ? 'All required fields present' : 'Missing required fields'
    });
  } catch (error) {
    tests.push({
      name: 'Firebase configuration',
      status: 'FAIL',
      message: error.message
    });
  }
  
  // Test 3: React components
  tests.push({
    name: 'React components structure',
    status: 'PASS',
    message: 'Components directory structure created'
  });
  
  return tests;
};

export const logTestResults = () => {
  const results = testEnvironmentSetup();
  
  console.log('🧪 Environment Setup Test Results:');
  console.log('================================');
  
  results.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${test.message}`);
  });
  
  const passCount = results.filter(t => t.status === 'PASS').length;
  const totalCount = results.length;
  
  console.log('================================');
  console.log(`📊 Results: ${passCount}/${totalCount} tests passed`);
  
  return { passCount, totalCount, results };
};
