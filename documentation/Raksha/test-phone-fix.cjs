/**
 * Test script for phone validation fix (CommonJS)
 */
const phoneModule = require('./backend/dist/utils/phone.js');

const { normalizeIndianPhone, isValidIndianPhone } = phoneModule;

// Test cases
const testCases = [
  // Should PASS
  { input: '9136787194', expected: '+919136787194', desc: '10-digit Indian mobile starting with 9' },
  { input: '+919136787194', expected: '+919136787194', desc: '+91 format' },
  { input: '919136787194', expected: '+919136787194', desc: '91 prefix with 10 digits (12 digits total)' },
  { input: '+91 91367 87194', expected: '+919136787194', desc: '+91 with spaces' },
  { input: '+91-91367-87194', expected: '+919136787194', desc: '+91 with dashes' },
  { input: '91 91367 87194', expected: '+919136787194', desc: '91 prefix with spaces' },
  
  // Should FAIL
  { input: '123', expected: null, desc: 'Too short' },
  { input: 'abcdef', expected: null, desc: 'Letters' },
  { input: '0000000000', expected: null, desc: 'All zeros' },
  { input: '1234567890', expected: null, desc: 'Starts with 1 (invalid Indian mobile)' },
  { input: '913678719', expected: null, desc: '9 digits' },
  { input: '91367871945', expected: null, desc: '11 digits without 91 prefix' },
  { input: '911234567890', expected: '+911234567890', desc: '91 prefix with 10 digits (12 total)' },
]

console.log('Testing phone validation fix:\n')
let passed = 0
let failed = 0

for (const tc of testCases) {
  const result = normalizeIndianPhone(tc.input)
  const passed_test = result === tc.expected
  if (passed_test) {
    console.log(`✅ PASS: ${tc.desc}`)
    console.log(`   Input: "${tc.input}" => Output: "${result}"`)
    passed++
  } else {
    console.log(`❌ FAIL: ${tc.desc}`)
    console.log(`   Input: "${tc.input}" => Expected: "${tc.expected}", Got: "${result}"`)
    failed++
  }
}

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`)

if (failed > 0) {
  process.exit(1)
}