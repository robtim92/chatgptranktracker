// server.js (For Heroku - Serves static files and API)
require('dotenv').config(); // For local development, Heroku uses Config Vars
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path'); // Required for serving static files

const app = express();
const port = process.env.PORT || 3000; // Heroku sets PORT environment variable

// --- OpenAI Client Initialization ---
// Check for API key. On Heroku, this will be a Config Var.
if (!process.env.OPENAI_API_KEY) {
    console.log(`[${new Date().toISOString()}] Note: OPENAI_API_KEY not found in .env. This is expected if running on Heroku and it's set as a Config Var. If not set on Heroku, API calls will fail.`);
    // We don't process.exit(1) here to allow Heroku deployment to proceed,
    // but API calls will fail if the Config Var isn't actually set on Heroku.
}
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// --- CORS Configuration ---
const allowedOrigins = [
    'https://chatgpt-rank-tracker.herokuapp.com', // Your Heroku app URL
    `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`, // Dynamic Heroku app URL (if HEROKU_APP_NAME is available)
    // Add your local frontend URL if you test locally, e.g., 'http://127.0.0.1:5500' or 'http://localhost:xxxx'
    // (Make sure the port matches if you use a live server for public/index.html)
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like Postman, curl) or from allowed origins
        // The .some() check handles the case where HEROKU_APP_NAME might not be defined yet during build
        if (!origin || allowedOrigins.some(allowedOrigin => allowedOrigin && origin && origin.startsWith(allowedOrigin))) {
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
app.use(cors(corsOptions));

// Middleware to parse JSON request bodies
app.use(express.json());

// --- Static File Serving (for Heroku) ---
// Serve static files (like index.html, css, js) from the 'public' directory
// This line should come before any catch-all routes like app.get('*', ...).
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---

// Root GET route for basic health check (will be overridden by static serving if index.html exists at root of public)
// However, if public/index.html is served, this specific / route handler might not be hit directly by browser.
// The static server will serve public/index.html for GET /.
// This is fine, the main purpose is that the server is up.
app.get('/health', (req, res) => { // Changed to /health to avoid conflict with static index.html
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Health check path /health was hit from IP: ${req.ip}`);
    res.status(200).send(`[${timestamp}] Backend is running. API endpoint is at POST /api/analyze-prompt.`);
});

// API endpoint to handle prompt analysis
app.post('/api/analyze-prompt', async (req, res) => {
    const timestamp = new Date().toISOString();
    const { prompt } = req.body;
    console.log(`[${timestamp}] Received POST request to /api/analyze-prompt with prompt: "${prompt}" from IP: ${req.ip}`);

    if (!process.env.OPENAI_API_KEY) {
        console.error(`[${timestamp}] FATAL ERROR (runtime): OpenAI API Key is not configured on the server.`);
        return res.status(500).json({ error: 'Server configuration error: OpenAI API Key missing.' });
    }
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

// --- Catch-all for Frontend (SPA-like behavior) ---
// This route MUST come AFTER your API routes and AFTER app.use(express.static(...)).
// It serves your index.html for any GET request that doesn't match an API route or an existing static file.
app.get('*', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Serving index.html (catch-all) for GET request to: ${req.path} from IP: ${req.ip}`);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- Server Start ---
app.listen(port, () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Backend server running on port ${port}`);
    console.log(`[${timestamp}] CORS enabled for origins: ${allowedOrigins.filter(Boolean).join(', ')} (Note: HEROKU_APP_NAME env var might not be available at build time, check runtime)`);
    console.log(`[${timestamp}] OpenAI Model: gpt-4o-search-preview`);
    console.log(`[${timestamp}] Static files served from 'public' directory.`);
    console.log(`[${timestamp}] API endpoint POST /api/analyze-prompt is active.`);
    console.log(`[${timestamp}] Health check GET /health is available.`);
});
