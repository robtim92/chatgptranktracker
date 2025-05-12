// server.js (Minimal for Heroku Startup Debug)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// --- Minimal CORS ---
// Using the simplest form of CORS for now to rule out complex options as the cause.
app.use(cors()); 

// Middleware to parse JSON request bodies
app.use(express.json());

// --- Static File Serving ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Minimal API Routes ---

// Health check endpoint
app.get('/health', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Minimal: Health check path /health was hit from IP: ${req.ip}`);
    res.status(200).send(`[${timestamp}] Minimal Backend is running. API endpoint is at POST /api/analyze-prompt.`);
});

// API endpoint to handle prompt analysis - NO OPENAI CALL YET
app.post('/api/analyze-prompt', async (req, res) => {
    const timestamp = new Date().toISOString();
    const { prompt } = req.body;
    console.log(`[${timestamp}] Minimal: Received POST request to /api/analyze-prompt with prompt: "${prompt}" from IP: ${req.ip}`);

    if (!prompt) {
        console.log(`[${timestamp}] Minimal: Prompt is missing, returning 400.`);
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Just send a simple success response for now
    res.status(200).json({ 
        message: `[${timestamp}] Minimal: Backend received prompt successfully.`,
        receivedPrompt: prompt 
    });
});

// --- Catch-all for Frontend (Temporarily Commented Out for Debugging Startup) ---
/*
app.get('*', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Minimal: Serving index.html (catch-all) for GET request to: ${req.path} from IP: ${req.ip}`);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
*/

// --- Server Start ---
app.listen(port, () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Minimal Backend server running on port ${port}`);
    console.log(`[${timestamp}] Minimal: Static files served from 'public' directory.`);
    console.log(`[${timestamp}] Minimal: API endpoint POST /api/analyze-prompt is active (no OpenAI).`);
    console.log(`[${timestamp}] Minimal: Health check GET /health is available.`);
    // Note: OpenAI client and full CORS options are removed in this minimal version for debugging.
});
