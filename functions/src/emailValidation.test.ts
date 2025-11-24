/**
 * Test script for email validation
 * Run with: npx ts-node src/emailValidation.test.ts
 */

// Mock the emailService internals since we can't easily import non-exported functions
// We'll just test the regex logic directly here to verify our assumption

function isValidEmail(email: string): boolean {
    // Strict email regex copied from implementation
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
}

const testCases = [
    { email: 'valid@example.com', expected: true },
    { email: 'user.name@domain.co.uk', expected: true },
    { email: 'user+tag@example.com', expected: true }, // Should be valid now
    { email: 'invalid-email', expected: false },
    { email: 'missing@domain', expected: false },
    { email: '@domain.com', expected: false },
    { email: 'user@.com', expected: false },
    { email: 'user@domain.', expected: false },
];

console.log('🧪 Testing Email Validation Logic...\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ email, expected }) => {
    const result = isValidEmail(email);
    const isPass = result === expected;

    if (isPass) {
        passed++;
        console.log(`✅ PASS: "${email}" -> ${result}`);
    } else {
        failed++;
        console.error(`❌ FAIL: "${email}" -> ${result} (Expected: ${expected})`);
    }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
    console.error('⚠️  Some test cases failed. Regex might need adjustment.');
    process.exit(1);
} else {
    console.log('🎉 All tests passed!');
}
