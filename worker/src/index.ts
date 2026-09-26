import { Env, QueryRequest, QueryResponse } from './types';
import { isHindi, isEnglish, translateToEnglish, translateFromEnglish } from './translation';
import { querySchemes, buildContext } from './rag';
import { generateResponse, extractSchemeInsights } from './reasoning';

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        // Health check endpoint
        if (url.pathname === '/health') {
            return new Response(JSON.stringify({ status: 'healthy', timestamp: Date.now() }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Root path - API documentation
        if (url.pathname === '/') {
            return new Response(JSON.stringify({
                message: 'Sarkari-Simpler AI Agent API',
                version: '1.0.0',
                endpoints: {
                    'GET /health': 'Health check',
                    'POST /api/query': 'Query government schemes (body: { query, language, userContext })',
                    'POST /api/translate': 'Translate text (body: { text, targetLanguage })'
                },
                status: 'operational'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Main query endpoint
        if (url.pathname === '/api/query' && request.method === 'POST') {
            try {
                const body = await request.json() as QueryRequest;
                const { query, language = 'hi', userContext } = body;

                if (!query) {
                    return new Response(JSON.stringify({ error: 'Query is required' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // Step 1: Translate query to English for processing
                const inputLanguage = isEnglish(query) ? 'en' : (language || 'hi');

                // Only translate if not already in English
                const englishQuery = inputLanguage !== 'en'
                    ? await translateToEnglish(query, env, inputLanguage as any)
                    : query;

                console.log(`Query (${inputLanguage}): ${query} -> English: ${englishQuery}`);

                // Step 2: Perform RAG - retrieve relevant scheme information (top 3 for speed)
                const retrievedChunks = await querySchemes(englishQuery, env, 3);

                if (retrievedChunks.length === 0) {
                    const noResultsMessage = 'I could not find relevant scheme information for your query. Please try rephrasing or contact your local authorities.';

                    // Translate back to user's language if needed
                    const translatedMessage = (language && language !== 'en')
                        ? await translateFromEnglish(noResultsMessage, language as any, env)
                        : noResultsMessage;

                    return new Response(JSON.stringify({
                        answer: translatedMessage,
                        language: language || 'hi',
                        relevantSchemes: []
                    } as QueryResponse), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // Step 3: Build context for LLM
                const context = buildContext(retrievedChunks);

                // Step 4: Use Llama-3 to generate response
                const englishResponse = await generateResponse(englishQuery, context, env, userContext);

                // Step 5: Translate response back to user's preferred language
                const finalResponse = (language && language !== 'en')
                    ? await translateFromEnglish(englishResponse, language as any, env)
                    : englishResponse;

                // Step 6: Extract scheme insights
                const relevantSchemes = extractSchemeInsights(retrievedChunks);

                const response: QueryResponse = {
                    answer: finalResponse,
                    language,
                    relevantSchemes
                };

                return new Response(JSON.stringify(response), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });

            } catch (error) {
                console.error('Query processing error:', error);
                return new Response(JSON.stringify({
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // Translation test endpoint
        if (url.pathname === '/api/translate' && request.method === 'POST') {
            try {
                const body = await request.json() as { text: string; targetLanguage: string; sourceLanguage?: string };
                const { text, targetLanguage, sourceLanguage } = body;

                const translated = await translateFromEnglish(text, targetLanguage as any, env);

                return new Response(JSON.stringify({
                    original: text,
                    translated,
                    targetLanguage
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: 'Translation failed' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // 404 for unknown routes
        return new Response('Not Found', {
            status: 404,
            headers: corsHeaders
        });
    },
};
