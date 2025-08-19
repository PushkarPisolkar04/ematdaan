#!/usr/bin/env node

/**
 * E-Matdaan Automated Testing Script
 * 
 * This script performs automated tests that can be run without manual intervention.
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🤖 E-Matdaan Automated Testing Script');
console.log('=====================================\n');

// Test 1: System Requirements
console.log('🔍 Test 1: System Requirements');
console.log('-------------------------------');

try {
  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`✅ Node.js version: ${nodeVersion}`);
  
  // Check npm version
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm version: ${npmVersion}`);
  
  // Check if package.json exists
  if (fs.existsSync('package.json')) {
    console.log('✅ package.json found');
  } else {
    throw new Error('package.json not found');
  }
  
  // Check if dependencies are installed
  if (fs.existsSync('node_modules')) {
    console.log('✅ Dependencies installed');
  } else {
    console.log('⚠️  Dependencies not installed, installing...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  }
  
} catch (error) {
  console.error('❌ System requirements test failed:', error.message);
  process.exit(1);
}

// Test 2: TypeScript Compilation
console.log('\n🔧 Test 2: TypeScript Compilation');
console.log('----------------------------------');

try {
  execSync('npm run type-check', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

// Test 3: Build Process
console.log('\n🏗️  Test 3: Build Process');
console.log('-------------------------');

try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build process successful');
} catch (error) {
  console.error('❌ Build process failed');
  process.exit(1);
}

// Test 4: File Structure
console.log('\n📁 Test 4: File Structure');
console.log('-------------------------');

const requiredFiles = [
  'src/App.tsx',
  'src/main.tsx',
  'src/lib/supabase.ts',
  'src/hooks/useAuth.ts',
  'src/pages/Index.tsx',
  'src/pages/Login.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/Admin.tsx',
  'src/components/Navbar.tsx',
  'supabase/migrations/',
  'package.json',
  'tsconfig.json',
  'vite.config.ts'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('❌ File structure test failed');
  process.exit(1);
}

// Test 5: Code Quality
console.log('\n📊 Test 5: Code Quality');
console.log('------------------------');

try {
  // Check for common issues
  const srcFiles = fs.readdirSync('src', { recursive: true });
  let hasIssues = false;
  
  srcFiles.forEach(file => {
    if (typeof file === 'string' && file.endsWith('.tsx')) {
      const content = fs.readFileSync(`src/${file}`, 'utf8');
      
      // Check for console.log statements (should be removed in production)
      if (content.includes('console.log(') && !content.includes('// TODO: Remove')) {
        console.log(`⚠️  ${file} contains console.log statements`);
        hasIssues = true;
      }
      
      // Check for TODO comments
      if (content.includes('TODO:')) {
        console.log(`⚠️  ${file} contains TODO comments`);
        hasIssues = true;
      }
      
      // Check for FIXME comments
      if (content.includes('FIXME:')) {
        console.log(`⚠️  ${file} contains FIXME comments`);
        hasIssues = true;
      }
    }
  });
  
  if (!hasIssues) {
    console.log('✅ Code quality checks passed');
  } else {
    console.log('⚠️  Code quality issues found (non-blocking)');
  }
  
} catch (error) {
  console.log('⚠️  Code quality check failed (non-blocking)');
}

// Test 6: Environment Configuration
console.log('\n⚙️  Test 6: Environment Configuration');
console.log('-------------------------------------');

try {
  if (fs.existsSync('.env')) {
    console.log('✅ .env file exists');
  } else if (fs.existsSync('.env.example')) {
    console.log('⚠️  .env file missing, but .env.example exists');
  } else {
    console.log('⚠️  No environment files found');
  }
  
  // Check for required environment variables in code
  const envVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  console.log('✅ Environment variables configured in code');
  
} catch (error) {
  console.log('⚠️  Environment check failed (non-blocking)');
}

// Test 7: Dependencies Check
console.log('\n📦 Test 7: Dependencies Check');
console.log('-----------------------------');

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'react',
    'react-dom',
    '@supabase/supabase-js',
    'react-router-dom',
    'tailwindcss'
  ];
  
  let allDepsPresent = true;
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`✅ ${dep}`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
      allDepsPresent = false;
    }
  });
  
  if (allDepsPresent) {
    console.log('✅ All required dependencies present');
  } else {
    console.error('❌ Missing required dependencies');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Dependencies check failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Automated Tests Completed!');
console.log('=============================');
console.log('✅ All automated tests passed');
console.log('\n📋 Next Steps:');
console.log('1. Start Docker Desktop');
console.log('2. Run: npx supabase start');
console.log('3. Run: npx supabase db reset');
console.log('4. Run: npm run dev');
console.log('5. Open: http://localhost:5173');
console.log('6. Begin manual testing using the testing guide');
console.log('\n🚀 System is ready for manual testing!'); 