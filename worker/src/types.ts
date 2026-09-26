export interface Env {
    AI: Ai;
    VECTORIZE: VectorizeIndex;
    ENVIRONMENT: string;
}

export interface SchemeMetadata {
    schemeName: string;
    category: string;
    relevanceScore?: number;
    benefits?: string[];
    eligibility?: string[];
    officialWebsite?: string;
}

export interface QueryRequest {
    query: string;
    language?: string; // Any LanguageCode from SUPPORTED_LANGUAGES
    userContext?: {
        occupation?: string;
        location?: string;
        familySize?: number;
    };
}

export interface QueryResponse {
    answer: string;
    language: string;
    relevantSchemes: Array<{
        name: string;
        relevance: number;
        keyPoints: string[];
        officialWebsite?: string;
    }>;
    eligibilityInsights?: string;
}
