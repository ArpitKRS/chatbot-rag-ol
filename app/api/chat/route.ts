import { GoogleGenAI } from '@google/genai';
import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';

// 1. Defining Typescript Interfaces for strong typing

/** Interface for the data structure retrieved from the MySQL database. **/
interface Article {
    title: string;
    content: string;
}

/** Interface for the incoming request body from the frontend. **/
interface ChatRequest {
    query: string;
}

// 2. Initializing and Configuring
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelName = "gemini-2.5-flash"; 

// Database Connection Pool using environment variables
// This configuration now expects the DB_PASSWORD and DB_PORT to be loaded correctly.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '3307'), 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 3. Retrieval-Augmented Generation (RAG) Functions

/**
 * Searches the MySQL database for articles relevant to the user's query.
 * @param query The user's input query string.
 * @returns A promise resolving to an array of relevant Article objects.
 */
async function retrieveContext(query: string): Promise<Article[]> {
    // Basic keyword extraction for simple SQL matching
    const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    if (keywords.length === 0) return [];

    // Constructing a dynamic SQL query to search across multiple columns
    // We search the keywords column, title, and content for relevance.
    const searchConditions = keywords.map(_ =>
        `(content LIKE ? OR title LIKE ? OR keywords LIKE ?)`
    ).join(' OR ');

    // Prepare values for the query - repeating keywords for each condition
    const searchValues = keywords.flatMap(keyword => [
        `%${keyword}%`, 
        `%${keyword}%`, 
        `%${keyword}%`  
    ]);

    const sql = `
        SELECT title, content 
        FROM help_articles 
        WHERE ${searchConditions} 
        ORDER BY last_updated DESC 
        LIMIT 3
    `;
    
    try {
        // Executing query 
        const [rows] = await pool.query(sql, searchValues);
        return rows as Article[]; 
    } catch (error) {
        // Logging the database error
        console.error("Database retrieval error:", error);
        return [];
    }
}

/**
 * Creates the complete prompt sent to the Gemini model, incorporating the context.
 * @param userQuery The original query.
 * @param contextArticles The relevant articles fetched from MySQL.
 * @returns The comprehensive system instruction string.
 */
function generateSystemPrompt(userQuery: string, contextArticles: Article[]): string {
    let contextString = '';
    if (contextArticles.length > 0) {
        contextString = contextArticles.map((article, index) =>
            `--- DOCUMENT ${index + 1}: ${article.title} ---\n${article.content}`
        ).join('\n\n');
    } else {
        contextString = 'No specific website help documentation was found for this query. Inform the user that specific help documentation is unavailable, and suggest they check the homepage or contact support.';
    }

    const prompt = `
        You are a friendly and helpful website support chatbot for Osmosis Learn. 
        Your primary task is to use the provided CONTEXT below to answer the user's query about the website. 
        
        RULES:
        1. Answer concisely, professionally, and in a natural, conversational tone.
        2. Base your response ONLY on the provided CONTEXT. Do not invent information.
        3. If the context is insufficient or irrelevant, state politely that the answer could not be found in the help documents, and suggest they check the homepage or contact support.

        --- CONTEXT ---
        ${contextString}

        --- USER QUERY ---
        ${userQuery}
    `;

    return prompt;
}

// 4. App Router POST Handler
export async function POST(request: Request) {
    // --- DEBUGGING BLOCK START ---
    const dbHost = process.env.DB_HOST;
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;
    const dbPort = process.env.DB_PORT;

    // Debugging Logs
    // console.log("--- ENV DEBUG LOG ---");
    // console.log(`DB_HOST: ${dbHost}`);
    // console.log(`DB_USER: ${dbUser}`);
    // console.log(`DB_PORT: ${dbPort}`);
    // console.log(`DB_PASSWORD (Length: ${dbPassword ? dbPassword.length : '0'}): ${dbPassword ? '[PASSWORD_FOUND]' : '[BLANK]'}`);
    // console.log("---------------------");
    // --- DEBUGGING BLOCK END ---

    let body: ChatRequest;
    try {
        body = await request.json() as ChatRequest;
    } catch (e) {
        return NextResponse.json({ message: 'Invalid JSON body format' }, { status: 400 });
    }

    const { query } = body;
    if (!query || typeof query !== 'string') {
        return NextResponse.json({ message: 'Query is required and must be a string.' }, { status: 400 });
    }

    try {
        // Step A: Retrieving Context from MySQL
        const contextArticles: Article[] = await retrieveContext(query);

        // Step B: Generating Dynamic System Prompt
        const fullPrompt: string = generateSystemPrompt(query, contextArticles);

        // Step C: Calling the Gemini API
        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
        });

        // Step D: Constructing the response payload
        const responsePayload = {
            answer: response.text,
            contextUsed: contextArticles.map(a => a.title)
        };

        return NextResponse.json(responsePayload, { status: 200 });

    } catch (error) {
        console.error("Gemini API or overall execution error:", error);
        return NextResponse.json({ message: 'An internal server error occurred during processing. Check server logs for details.' }, { status: 500 });
    }
}
