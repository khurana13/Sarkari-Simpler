import { Env } from './types';

/**
 * Use Llama-3 to reason about eligibility and generate a helpful response
 */
export async function generateResponse(
    userQuery: string,
    context: string,
    env: Env,
    userContext?: {
        occupation?: string;
        location?: string;
        familySize?: number;
    }
): Promise<string> {
    try {
        // Build system prompt
        const systemPrompt = `You are a helpful assistant specializing in Indian Government welfare schemes. 
Your role is to help rural Indians understand which schemes they are eligible for and how to apply.

Guidelines:
- Provide clear, simple explanations
- Focus on eligibility criteria
- Explain application process step-by-step
- Be empathetic and encouraging
- If user doesn't qualify, suggest alternative schemes
- MANDATORY: Always provide official website redirect links in markdown format e.g. [Visit Official Website](URL)`;

        // Build user context string
        let contextStr = '';
        if (userContext) {
            contextStr = `\n\nUser Context:`;
            if (userContext.occupation) contextStr += `\n- Occupation: ${userContext.occupation}`;
            if (userContext.location) contextStr += `\n- Location: ${userContext.location}`;
            if (userContext.familySize) contextStr += `\n- Family Size: ${userContext.familySize}`;
        }

        const userMessage = `${context}\n\nUser Query: ${userQuery}${contextStr}

Please analyze the user's query and the scheme information provided. Give a helpful, accurate response about:
1. Which scheme(s) are most relevant
2. Basic eligibility requirements
3. Key benefits
4. How to apply or check eligibility
5. Any important warnings or notes`;

        // Call Llama-3 (optimized for speed)
        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 512,  // Reduced from 1024 for faster response
            temperature: 0.8   // Slightly higher for faster generation
        });

        return response.response || 'I apologize, but I could not generate a response at this time.';
    } catch (error) {
        console.error('LLM generation failed:', error);
        return 'I apologize, but I encountered an error processing your query. Please try again.';
    }
}

/**
 * Extract key points about relevant schemes from the context
 */
export function extractSchemeInsights(
    retrievedChunks: Array<{ metadata: any; score: number; text: string }>
): Array<{ name: string; relevance: number; keyPoints: string[]; officialWebsite?: string }> {
    const schemeMap = new Map<string, { relevance: number; points: Set<string>; website?: string }>();

    // Map of scheme names to their official websites
    const officialWebsites: Record<string, string> = {
        'PM-Kisan': 'https://pmkisan.gov.in/',
        'PMAY-Gramin': 'https://pmayg.nic.in/',
        'Ayushman Bharat': 'https://pmjay.gov.in/',
        'MGNREGA': 'https://nrega.nic.in/',
        'PM-GKAY': 'https://pib.gov.in/PressReleasePage.aspx?PRID=1658289',
        'PM-JAY': 'https://pmjay.gov.in/',
        'Pradhan Mantri Kisan Samman Nidhi': 'https://pmkisan.gov.in/',
        'Mahatma Gandhi National Rural Employment Guarantee Act': 'https://nrega.nic.in/'
    };

    for (const chunk of retrievedChunks) {
        const schemeName = chunk.metadata.schemeName;

        if (!schemeMap.has(schemeName)) {
            // Try to extract a URL from the chunk text if it contains "Official Portal" or "Website"
            let website = officialWebsites[schemeName];
            
            if (!website) {
                const urlMatch = chunk.text.match(/https?:\/\/[^\s)\]]+/);
                if (urlMatch && (chunk.text.toLowerCase().includes('official') || chunk.text.toLowerCase().includes('portal'))) {
                    website = urlMatch[0];
                }
            }

            schemeMap.set(schemeName, {
                relevance: chunk.score,
                points: new Set(),
                website: website
            });
        }

        // Extract key sentences (simple heuristic: sentences with keywords)
        const sentences = chunk.text.split(/[.!?]\s+/);
        const keywordPattern = /eligible|benefit|apply|₹|\d+|lakh|crore|assistance|support/i;

        for (const sentence of sentences) {
            if (keywordPattern.test(sentence) && sentence.length < 200) {
                schemeMap.get(schemeName)!.points.add(sentence.trim());
            }
        }
    }

    return Array.from(schemeMap.entries()).map(([name, data]) => ({
        name,
        relevance: data.relevance,
        keyPoints: Array.from(data.points).slice(0, 3), // Top 3 key points
        officialWebsite: data.website
    }));
}
