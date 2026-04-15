#!/usr/bin/env node

/**
 * Budget API Testing Script
 * 
 * Tests the fixed budget creation API to verify the fixes work correctly
 * 
 * Usage:
 *   node scripts/test-budget-api.js [departmentId] [amount] [fiscalYear]
 * 
 * Example:
 *   node scripts/test-budget-api.js 03a995c1-f64a-48b4-acda-3c6b252e8c41 5916200 2026
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Set if needed

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testBudgetCreation(departmentId, amount, fiscalYear) {
  log('\n' + '='.repeat(60), 'blue');
  log('  Budget API - Creation Test', 'blue');
  log('='.repeat(60), 'blue');

  const testBudgetId = uuidv4();

  const payload = {
    departmentId: departmentId || uuidv4(),
    amount: amount || 5916200,
    remaining: amount || 5916200,
    fiscalYear: fiscalYear || 2026,
  };

  log(`\n📋 Test Parameters:`, 'cyan');
  log(`   Department ID: ${payload.departmentId}`);
  log(`   Amount: Ksh ${(payload.amount / 100).toLocaleString()}`);
  log(`   Fiscal Year: ${payload.fiscalYear}`);

  try {
    log(`\n🔄 Creating budget...`, 'yellow');

    const response = await axios.post(
      `${API_URL}/api/budgets/create`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
        },
        timeout: 10000,
      }
    );

    if (response.status === 200 && response.data.id) {
      log(`\n✅ Budget Created Successfully!`, 'green');
      log(`   Budget ID: ${response.data.id}`);
      log(`   Status: ${response.data.status || 'draft'}`);
      
      if (response.data.createdAt) {
        log(`   Created: ${response.data.createdAt}`);
      }

      return {
        success: true,
        budgetId: response.data.id,
        data: response.data,
      };
    } else {
      log(`\n⚠️  Unexpected response:`, 'yellow');
      log(JSON.stringify(response.data, null, 2));
      return { success: false, error: 'Unexpected response' };
    }
  } catch (error) {
    log(`\n❌ Budget Creation Failed`, 'red');

    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${error.response.data?.message || error.response.data?.error}`, 'red');

      // Check for known issues
      if (error.response.data?.message?.includes('parameter')) {
        log(`\n   ⚠️  Parameter Mismatch Error - Schema may not be updated`, 'yellow');
        log(`      Run: npm run db:generate && npm run migrate`, 'cyan');
      }

      if (error.response.data?.message?.includes('permission')) {
        log(`\n   ⚠️  Permission Denied - User may lack required role`, 'yellow');
        log(`      Required: budgets:create`, 'cyan');
      }

      if (error.response.data?.message?.includes('Department')) {
        log(`\n   ⚠️  Department Not Found`, 'yellow');
        log(`      Verify department ID exists in database`, 'cyan');
      }
    } else if (error.code === 'ECONNREFUSED') {
      log(`   Connection Refused`, 'red');
      log(`   API Server not running at ${API_URL}`, 'red');
      log(`   Start server with: npm run dev`, 'cyan');
    } else {
      log(`   ${error.message}`, 'red');
    }

    return { success: false, error: error.message };
  }
}

async function testProfessionalBudget(departmentId, fiscalYear) {
  log('\n' + '='.repeat(60), 'blue');
  log('  Professional Budgeting API - Creation Test', 'blue');
  log('='.repeat(60), 'blue');

  const payload = {
    budgetName: `Professional Budget FY${fiscalYear}`,
    budgetDescription: 'Test professional budget with line items',
    departmentId: departmentId || uuidv4(),
    fiscalYear: fiscalYear || 2026,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budgetLines: [
      {
        accountId: uuidv4(),
        budgeted: 1000000,
        description: 'Salaries',
      },
      {
        accountId: uuidv4(),
        budgeted: 500000,
        description: 'Operations',
      },
    ],
    approvalRequired: true,
  };

  log(`\n📋 Test Parameters:`, 'cyan');
  log(`   Budget Name: ${payload.budgetName}`);
  log(`   Department ID: ${payload.departmentId}`);
  log(`   Fiscal Year: ${payload.fiscalYear}`);
  log(`   Budget Lines: ${payload.budgetLines.length}`);

  try {
    log(`\n🔄 Creating professional budget...`, 'yellow');

    const response = await axios.post(
      `${API_URL}/api/budgets/professional/create`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
        },
        timeout: 10000,
      }
    );

    if (response.status === 200 && response.data.budgetId) {
      log(`\n✅ Professional Budget Created Successfully!`, 'green');
      log(`   Budget ID: ${response.data.budgetId}`);
      log(`   Total Budgeted: Ksh ${(response.data.totalBudgeted / 100).toLocaleString()}`);
      log(`   Status: ${response.data.status}`);
      log(`   Budget Lines: ${response.data.budgetLines?.length || 0}`);

      return {
        success: true,
        budgetId: response.data.budgetId,
        data: response.data,
      };
    } else {
      log(`\n⚠️  Unexpected response:`, 'yellow');
      log(JSON.stringify(response.data, null, 2));
      return { success: false, error: 'Unexpected response' };
    }
  } catch (error) {
    log(`\n❌ Professional Budget Creation Failed`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${error.response.data?.message}`, 'red');
    } else {
      log(`   ${error.message}`, 'red');
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  const departmentId = process.argv[2];
  const amount = parseInt(process.argv[3]) || 5916200;
  const fiscalYear = parseInt(process.argv[4]) || 2026;

  log(`\n🔍 Testing Budget API Fixes\n`, 'cyan');
  log(`API URL: ${API_URL}`, 'cyan');

  // Test basic budget creation
  const basicTest = await testBudgetCreation(departmentId, amount, fiscalYear);

  // Test professional budget creation
  // const professionalTest = await testProfessionalBudget(departmentId, fiscalYear);

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('  Test Summary', 'blue');
  log('='.repeat(60), 'blue');

  const results = [
    { name: 'Basic Budget Creation', result: basicTest },
    // { name: 'Professional Budget Creation', result: professionalTest },
  ];

  let passed = 0;
  let failed = 0;

  results.forEach(({ name, result }) => {
    if (result.success) {
      log(`✅ ${name}`, 'green');
      passed++;
    } else {
      log(`❌ ${name}: ${result.error}`, 'red');
      failed++;
    }
  });

  log(`\n📊 Results: ${passed} passed, ${failed} failed\n`, 'cyan');

  if (failed === 0) {
    log('🎉 All tests passed! Budget API fixes are working correctly.\n', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Check the errors above.\n', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
