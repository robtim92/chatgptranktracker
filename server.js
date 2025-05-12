// server.js (Heroku Ready - Final Version)
require('dotenv').config(); // For local development, Heroku uses Config Vars
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path'); // Required for serving static files

const app = express();
// Heroku sets the PORT environment variable. For local dev, use 3000 or another port.
const port = process.env.PORT || 3000; 

// --- OpenAI Client Initialization ---
// On Heroku, OPENAI_API_KEY will be a Config Var, not from a .env file.
// This log helps confirm if the key is missing during runtime on Heroku.
if (!process.env.OPENAI_API_KEY) {
    console.log(`[${new Date().toISOString()}] Note: OPENAI_API_KEY not found in environment variables. This is expected if running locally without a .env file or if not set as a Config Var on Heroku. API calls will fail if the key is missing at runtime.`);
}
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// --- CORS Configuration ---
// Define allowed origins for CORS.
const allowedOrigins = [
    'https://chatgpt-rank-tracker-c1ca935dd7cf.herokuapp.com', // Your specific Heroku frontend URL
    // Add your local frontend URL if you test locally, e.g., 'http://127.0.0.1:5500' (from VS Code Live Server)
    // or 'http://localhost:YOUR_FRONTEND_PORT'
].filter(Boolean); // .filter(Boolean) removes any null/undefined entries if HEROKU_APP_NAME isn't set

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g., Postman, curl) or if origin is in allowedOrigins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            const msg = `CORS policy: Origin ${origin} not allowed. Allowed: ${allowedOrigins.join(', ')}`;
            console.error(`[${new Date().toISOString()}] ${msg}`);
            callback(new Error(msg), false);
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'], // Explicitly list allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Explicitly list allowed request headers
    credentials: true, // Set to true if you plan to use cookies or authorization headers
    optionsSuccessStatus: 204 // Sets the status for successful OPTIONS pre-flight requests
};

// Apply CORS middleware with the defined options.
// This should be one of the first middleware registered.
app.use(cors(corsOptions));

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// --- Static File Serving (for Heroku) ---
// Serve static files (index.html, and any CSS/JS you might add later)
// from the 'public' directory.
// This line allows Express to find and serve your frontend.
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---

// Health check endpoint (optional, but good for verifying the backend is responsive)
app.get('/health', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Health check path /health was hit from IP: ${req.ip}`);
    res.status(200).send(`[${timestamp}] Backend is running. API endpoint is at POST /api/analyze-prompt.`);
});

// API endpoint to handle prompt analysis
app.post('/api/analyze-prompt', async (req, res) => {
    const timestamp = new Date().toISOString();
    const { prompt } = req.body;
    console.log(`[${timestamp}] Received POST request to /api/analyze-prompt with prompt: "${prompt}" from IP: ${req.ip}`);

    // Runtime check for OpenAI API Key
    if (!process.env.OPENAI_API_KEY) {
        console.error(`[${timestamp}] FATAL ERROR (runtime): OpenAI API Key is not configured on the server for API call.`);
        return res.status(500).json({ error: 'Server configuration error: OpenAI API Key missing.' });
    }

    if (!prompt) {
        console.log(`[${timestamp}] Prompt is missing in request body, returning 400.`);
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        console.log(`[${timestamp}] Calling OpenAI with model "gpt-4o-search-preview" for prompt: "${prompt}"`);
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
            // Include OpenAI's error response if available, for more detailed debugging
            responseData: error.response ? error.response.data : null 
        });
    }
});

// --- Catch-all for Frontend (SPA-like behavior) ---
// This route MUST come AFTER your API routes and AFTER app.use(express.static(...)).
// It serves your public/index.html for any GET request that doesn't match an API route or an existing static file.
app.get('*', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Serving index.html (catch-all) for GET request to: ${req.path} from IP: ${req.ip}`);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- Server Start ---
app.listen(port, () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Backend server running on port ${port}`);
    // Filter out null/undefined from allowedOrigins before joining, in case HEROKU_APP_NAME isn't set
    console.log(`[${timestamp}] CORS enabled for origins: ${allowedOrigins.filter(Boolean).join(', ')}`);
    console.log(`[${timestamp}] OpenAI Model: gpt-4o-search-preview`);
    console.log(`[${timestamp}] Static files served from 'public' directory.`);
    console.log(`[${timestamp}] API endpoint POST /api/analyze-prompt is active.`);
    console.log(`[${timestamp}] Health check GET /health is available.`);
});
