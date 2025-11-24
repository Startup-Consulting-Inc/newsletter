/**
 * Test script for bounce email parsing logic with REAL data from screenshot
 * Run with: npx ts-node src/bounceParsing_real.test.ts
 */

const bounceBodyFromScreenshot = `
Address not found

Your message wasn't delivered to info@koreatous.com because the address couldn't be found, or is unable to receive mail.

LEARN MORE

The response was:

550 5.1.1 The email account that you tried to reach does not exist. Please try double-checking the recipient's email address for typos or unnecessary spaces. For more information, go to https://support.google.com/mail/?p=NoSuchUser 8926c6da1cb9f-5b9548c407dsor2757757173.0 - gsmtp
`;

function parseBounce(bodyText: string): string | null {
    // Regex from implementation
    const failedEmailMatch = bodyText.match(/Address not found\s+Your message wasn't delivered to\s+([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/i) ||
        bodyText.match(/failed permanently\s+([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/i);

    return failedEmailMatch ? failedEmailMatch[1] : null;
}

console.log('🧪 Testing Bounce Parsing with Screenshot Data...\n');

const result = parseBounce(bounceBodyFromScreenshot);
const expected = 'info@koreatous.com';

if (result === expected) {
    console.log(`✅ PASS: Extracted ${result}`);
} else {
    console.error(`❌ FAIL: Expected ${expected}, got ${result}`);
    console.log('Body text used:\n', bounceBodyFromScreenshot);
}
