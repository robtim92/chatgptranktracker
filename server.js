// server.js (Reset to include OpenAI API calls with robust CORS)
require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; // Use Render's port or 3000 for local

// --- OpenAI Client Initialization ---
if (!process.env.OPENAI_API_KEY) {
    console.error(`[${new Date().toISOString()}] FATAL ERROR: OPENAI_API_KEY is not set in the .env file.`);
    process.exit(1); // Exit if key is not found
}
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// --- CORS Configuration ---
const allowedOrigins = [
    'https://chatgptranktracker-frm3.onrender.com', // Your deployed frontend URL
    // Add your local frontend URL if you test locally, e.g., 'http://127.0.0.1:5500' or 'http://localhost:xxxx'
    // Make sure the port matches if you use a live server extension for local HTML.
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like Postman, curl) or from allowed origins
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            const msg = `CORS policy: Origin ${origin} not allowed.`;
            console.error(`[${new Date().toISOString()}] ${msg}`);
            callback(new Error(msg), false);
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'], // Explicitly list allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Explicitly list allowed headers
    credentials: true, // Useful if you ever implement sessions/cookies
    optionsSuccessStatus: 204 // For pre-flight requests
};

// Apply CORS middleware. This should be among the first middleware.
// It handles pre-flight OPTIONS requests automatically.
app.use(cors(corsOptions));

// Middleware to parse JSON request bodies
app.use(express.json());

// --- Routes ---

// Root GET route for basic health check
app.get('/', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Root path / was hit with a GET request from IP: ${req.ip}`);
    res.status(200).send(`[${timestamp}] Backend is running. API endpoint is at POST /api/analyze-prompt.`);
});

// API endpoint to handle prompt analysis
app.post('/api/analyze-prompt', async (req, res) => {
    const timestamp = new Date().toISOString();
    const { prompt } = req.body;
    console.log(`[${timestamp}] Received POST request to /api/analyze-prompt with prompt: "${prompt}" from IP: ${req.ip}`);

    if (!prompt) {
        console.log(`[${timestamp}] Prompt is missing, returning 400.`);
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        console.log(`[${timestamp}] Calling OpenAI with model gpt-4o-search-preview for prompt: "${prompt}"`);
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-search-preview", // Using the web-search enabled model
            messages: [{ role: "user", content: prompt }],
        });

        console.log(`[${timestamp}] OpenAI API response received successfully for prompt: "${prompt}"`);
        
        if (completion.choices && completion.choices.length > 0 && completion.choices[0].message && completion.choices[0].message.content) {
            res.json({ response: completion.choices[0].message.content });
        } else {
            console.error(`[${timestamp}] Unexpected OpenAI API response structure for prompt: "${prompt}"`, JSON.stringify(completion, null, 2));
            res.status(500).json({ error: 'Failed to get a valid response content from OpenAI API' });
        }

    } catch (error) {
        console.error(`[${timestamp}] Error calling OpenAI API for prompt: "${prompt}":`, error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        if (error.response) {
            console.error(`[${timestamp}] OpenAI Error Status:`, error.response.status);
        }
        res.status(500).json({ 
            error: 'Failed to analyze prompt with OpenAI', 
            details: error.message,
            responseData: error.response ? error.response.data : null
        });
    }
});

// --- Server Start ---
app.listen(port, () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Backend server running on port ${port}`);
    console.log(`[${timestamp}] CORS enabled for origins: ${allowedOrigins.join(', ')}`);
    console.log(`[${timestamp}] OpenAI Model: gpt-4o-search-preview`);
    console.log(`[${timestamp}] Root GET path / is available for health check.`);
    console.log(`[${timestamp}] API endpoint POST /api/analyze-prompt is active.`);
});
