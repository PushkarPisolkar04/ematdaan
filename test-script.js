#!/usr/bin/env node

/**
 * E-Matdaan System Testing Script
 * 
 * This script helps test the E-Matdaan voting system systematically.
 * Run this script to check system health and guide through testing.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🎯 E-Matdaan System Testing Script');
console.log('=====================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Check system requirements
console.log('🔍 Checking system requirements...');

try {
  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`✅ Node.js version: ${nodeVersion}`);
  
  // Check if npm is available
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm version: ${npmVersion}`);
  
  // Check if Docker is running
  try {
    execSync('docker --version', { encoding: 'utf8' });
    console.log('✅ Docker is available');
  } catch (error) {
    console.log('⚠️  Docker not found. Please install Docker Desktop.');
  }
  
  // Check if Supabase CLI is available
  try {
    const supabaseVersion = execSync('npx supabase --version', { encoding: 'utf8' }).trim();
    console.log(`✅ Supabase CLI: ${supabaseVersion}`);
  } catch (error) {
    console.log('⚠️  Supabase CLI not found. Installing...');
    try {
      execSync('npm install -g supabase', { stdio: 'inherit' });
      console.log('✅ Supabase CLI installed');
    } catch (installError) {
      console.log('❌ Failed to install Supabase CLI');
    }
  }
  
} catch (error) {
  console.error('❌ Error checking system requirements:', error.message);
  process.exit(1);
}

console.log('\n📋 System Status Check');
console.log('=====================');

// Check TypeScript compilation
console.log('\n🔧 Checking TypeScript compilation...');
try {
  execSync('npm run type-check', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  console.log('Please fix the compilation errors before testing.');
  console.log('Run: npm run type-check');
  process.exit(1);
}

// Check if dependencies are installed
console.log('\n📦 Checking dependencies...');
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.log('❌ Failed to install dependencies');
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed');
}

// Check build
console.log('\n🏗️  Checking build...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build successful');
} catch (error) {
  console.log('❌ Build failed');
  console.log('Please fix build errors before testing.');
  process.exit(1);
}

console.log('\n🚀 System is ready for testing!');
console.log('================================');

console.log('\n📝 Testing Instructions:');
console.log('1. Start the system:');
console.log('   npx supabase start');
console.log('   npx supabase db reset');
console.log('   npm run dev');
console.log('');
console.log('2. Access the application:');
console.log('   Frontend: http://localhost:5173');
console.log('   Supabase Dashboard: http://localhost:54323');
console.log('');
console.log('3. Follow the testing scenarios in SYSTEM_COMPLETION_CHECKLIST.md');
console.log('');
console.log('4. Common test scenarios:');
console.log('   - Create organization with duplicate names');
console.log('   - Test access code system');
console.log('   - Test invitation system');
console.log('   - Test multi-organization isolation');
console.log('   - Test voting and results');
console.log('');

console.log('🔧 Quick Commands:');
console.log('npm run dev          - Start development server');
console.log('npm run build        - Build for production');
console.log('npm run type-check   - Check TypeScript');
console.log('npx supabase start   - Start Supabase');
console.log('npx supabase stop    - Stop Supabase');
console.log('npx supabase db reset - Reset database');

console.log('\n✅ System check completed successfully!');
console.log('Ready to start testing the E-Matdaan voting system.'); 