'use client'; 

import { useState, FormEvent, ChangeEvent } from 'react';

// Defining the response type on the client side for type safety
interface ChatResponse {
    answer: string;
    contextUsed: string[];
}

// Helper to load Tailwind in the single-file environment (not standard Next.js practice, but needed here)
function TailwindLoader() {
    return (
        <script src="https://cdn.tailwindcss.com"></script>
    );
}

export default function Chatbot() {
    // State initializations
    const [input, setInput] = useState<string>('');
    const [response, setResponse] = useState<ChatResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        setLoading(true);
        setResponse(null); // Clear previous response

        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: input }),
            });

            if (!apiResponse.ok) {
                // Reading error message from API if available
                const errorData = await apiResponse.json();
                throw new Error(`API error: ${errorData.message || 'Unknown status'}`);
            }

            // Cast the JSON response to the ChatResponse type
            const data: ChatResponse = await apiResponse.json();
            setResponse(data);
            setInput('');

        } catch (error: any) {
            console.error('Fetch error:', error.message);
            setResponse({ 
                answer: `An error occurred: ${error.message}. Please check your XAMPP server and .env variables.`,
                contextUsed: []
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    return (
        <>
            <TailwindLoader />
            <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 font-sans">
                <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-8 mt-12 border-t-8 border-blue-600">
                    <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-2">
                        Contextual RAG Chatbot
                    </h1>
                    <p className="text-center text-gray-500 mb-8">
                        Powered by Gemini API.
                    </p>
                    
                    <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
                        <input
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="e.g., What are PODs?"
                            className="flex-grow p-4 border border-gray-300 rounded-xl shadow-inner text-gray-700 
                                focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                            disabled={loading}
                        />
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className={`px-6 py-4 font-bold text-white rounded-xl transition duration-200 shadow-lg 
                                ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 hover:shadow-xl'}`}
                        >
                            {loading ? 'Thinking...' : 'Ask'}
                        </button>
                    </form>

                    {loading && (
                        <div className="text-center mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-700 font-medium">
                            Searching Database and generating response with Gemini...
                        </div>
                    )}

                    {response && (
                        <div className="mt-8 border-t border-gray-200 pt-6">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Chatbot Response
                            </h2>
                            <div className="p-6 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg shadow-md whitespace-pre-wrap text-gray-700 leading-relaxed">
                                {/* Display response (use pre-wrap to respect newlines from the model) */}
                                {response.answer}
                            </div>
                            
                            {response.contextUsed && response.contextUsed.length > 0 && (
                                <p className="mt-4 text-sm text-gray-500 italic p-3 bg-gray-100 rounded-lg">
                                    **Contexts Used (from DB):** <span className="font-medium text-gray-700">{response.contextUsed.join(' | ')}</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
