import { Env, SchemeMetadata } from './types';

/**
 * Generate embedding for a text query using Cloudflare AI
 */
export async function generateEmbedding(text: string, env: Env): Promise<number[]> {
    try {
        const response: any = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
            text: [text]
        });

        // The response should contain embedding data
        if (response.data && response.data[0]) {
            return response.data[0];
        }

        throw new Error('No embedding generated');
    } catch (error) {
        console.error('Embedding generation failed:', error);
        throw error;
    }
}

/**
 * Query the Vectorize index for relevant scheme information
 */
export async function querySchemes(
    queryText: string,
    env: Env,
    topK: number = 5
): Promise<Array<{ metadata: SchemeMetadata; score: number; text: string }>> {
    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(queryText, env);

        // Query Vectorize index
        const results = await env.VECTORIZE.query(queryEmbedding, {
            topK: topK,
            returnValues: true,
            returnMetadata: 'all'
        });

        // Transform results
        return results.matches.map((match) => ({
            metadata: match.metadata as any as SchemeMetadata,
            score: match.score || 0,
            text: (match.metadata as any)?.text || ''
        }));
    } catch (error) {
        console.error('Vector query failed:', error);
        // Return empty results on failure
        return [];
    }
}

/**
 * Build context from retrieved scheme chunks for LLM
 */
export function buildContext(
    retrievedChunks: Array<{ metadata: SchemeMetadata; score: number; text: string }>
): string {
    if (retrievedChunks.length === 0) {
        return 'No relevant scheme information found.';
    }

    let context = 'Below are relevant details from Indian Government schemes:\n\n';

    // Group by scheme name
    const schemeGroups = new Map<string, string[]>();

    for (const chunk of retrievedChunks) {
        const schemeName = chunk.metadata.schemeName;
        if (!schemeGroups.has(schemeName)) {
            schemeGroups.set(schemeName, []);
        }
        schemeGroups.get(schemeName)!.push(chunk.text);
    }

    // Build context strings
    for (const [schemeName, texts] of schemeGroups) {
        context += `**${schemeName}**:\n`;
        context += texts.join('\n') + '\n\n';
    }

    return context;
}
