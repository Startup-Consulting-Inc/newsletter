import * as functions from 'firebase-functions';
import { z, ZodError } from 'zod';
import fetch from 'node-fetch';

// Validation Schema
const generateNewsletterSchema = z.object({
    template: z.enum(['Professional', 'Creative', 'Newsletter', 'Promotional', 'Minimalist']),
    description: z.string().min(10).max(5000),
    tone: z.enum(['Formal', 'Casual', 'Friendly', 'Professional', 'Fun']).optional().nullable(),
    includeImages: z.boolean().optional().nullable(),
    targetAudience: z.string().max(200).optional().nullable(),
});

// Template-specific system prompts
const TEMPLATE_PROMPTS = {
    Professional: `Create a professional newsletter with a clean, formal layout. Use a corporate color scheme (blues, grays, whites). Include header, main content sections with headings, and footer. Structure should be clear and business-appropriate.`,

    Creative: `Create a creative, artistic newsletter with bold design elements. Use vibrant colors and interesting layouts. Include eye-catching headers, dynamic sections, and creative formatting. Make it visually engaging and unique.`,

    Newsletter: `Create a classic email newsletter format. Include a header with logo area, table of contents, multiple content sections with images, and footer with unsubscribe link. Use a traditional 2-column layout where appropriate.`,

    Promotional: `Create a promotional newsletter optimized for conversions. Include prominent call-to-action buttons, product highlights, special offers section, and urgency elements. Use attention-grabbing colors and persuasive copy structure.`,

    Minimalist: `Create a minimalist newsletter with clean, simple design. Use plenty of white space, simple typography, and minimal colors. Focus on readability and elegant simplicity. Less is more.`
};

export const generateNewsletter = functions.https.onCall(async (data, context) => {
    try {
        console.log('📥 Received data:', JSON.stringify(data));
        // Validate Input
        const validatedData = generateNewsletterSchema.parse(data);

        const { template, description, tone = 'Professional', includeImages = true, targetAudience } = validatedData;

        // Get OpenRouter API credentials
        const apiKey = process.env.OPENROUTER_API_KEY;
        const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';

        if (!apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        // Build the prompt
        const templatePrompt = TEMPLATE_PROMPTS[template as keyof typeof TEMPLATE_PROMPTS];
        const audienceContext = targetAudience ? `Target audience: ${targetAudience}` : '';
        const imageInstructions = includeImages
            ? 'Include image placeholders using <img> tags with descriptive alt text and placeholder src="https://via.placeholder.com/600x400?text=Image+Placeholder".'
            : 'Do not include any images.';

        const systemPrompt = `You are an expert HTML newsletter designer and content writer. You create professional, responsive email newsletters that work across all email clients.

IMPORTANT REQUIREMENTS:
1. Generate COMPLETE, VALID HTML (including <!DOCTYPE html>, <html>, <head>, <body> tags)
2. Use inline CSS only (no external stylesheets or <style> tags in head)
3. Use table-based layouts for email compatibility
4. Include proper meta tags for responsive design
5. All colors, fonts, and spacing should be inline CSS
6. Ensure the HTML is properly formatted and indented
7. Do NOT include markdown formatting, code blocks, or explanations
8. Return ONLY the HTML code, nothing else

${templatePrompt}

Tone: ${tone}
${audienceContext}
${imageInstructions}

RESEARCH INSTRUCTIONS:
- If the content requires current information, recent news, or factual data, indicate that research would be needed
- Use placeholder data if real-time information is not available
- Focus on creating high-quality, well-structured HTML

Email Compatibility:
- Use tables for layout (not divs/flexbox)
- Inline all CSS styles
- Use web-safe fonts
- Set explicit widths in pixels
- Include proper alt text for images`;

        const userPrompt = `Create a newsletter based on this description:

${description}

Remember to return ONLY the complete HTML code with inline styles. No markdown, no explanations, just the HTML.`;

        console.log('🚀 Calling OpenRouter API...');

        // Call OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://newsletter-app.com', // Replace with your actual domain
                'X-Title': 'Newsletter Generator'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OpenRouter API error:', errorText);
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }

        const result: any = await response.json();

        if (!result.choices || result.choices.length === 0) {
            throw new Error('No response from AI model');
        }

        let htmlContent = result.choices[0].message.content;

        // Clean up the response (remove markdown code blocks if present)
        htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
        htmlContent = htmlContent.trim();

        // Validate that we got HTML
        if (!htmlContent.includes('<html') && !htmlContent.includes('<body')) {
            console.warn('⚠️ Response does not appear to be valid HTML, wrapping in template');
            htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
    ${htmlContent}
</body>
</html>`;
        }

        console.log('✅ Newsletter generated successfully');

        return {
            success: true,
            htmlContent: htmlContent
        };

    } catch (error) {
        console.error('❌ Error generating newsletter:', error);

        if (error instanceof ZodError) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Invalid input data: ' + error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
            );
        }

        throw new functions.https.HttpsError(
            'internal',
            error instanceof Error ? error.message : 'Failed to generate newsletter'
        );
    }
});
