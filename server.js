// server.js (Revised CORS Setup for Debugging)
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- Specific CORS Configuration ---
const allowedOrigins = [
    'https://chatgptranktracker-frm3.onrender.com',
    // Add local dev URL if needed, e.g., 'http://localhost:5500' or your specific local port
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            const msg = `CORS policy: Origin ${origin} not allowed.`;
            console.error(`[${new Date().toISOString()}] ${msg}`);
            callback(new Error(msg), false);
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'], // Ensure OPTIONS is listed
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false, // Pass the OPTIONS request to the next handler if needed (usually false)
    optionsSuccessStatus: 204 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Apply CORS middleware with options. This should be one of the first middleware.
// It will handle OPTIONS pre-flight requests automatically for routes defined after it.
app.use(cors(corsOptions));

// Middleware to parse JSON request bodies - should come after CORS if CORS needs to inspect headers first,
// but generally safe here.
app.use(express.json());

// Root GET route for basic health check
app.get('/', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Root path / was hit with a GET request from IP: ${req.ip}`);
    res.status(200).send(`[${timestamp}] Backend is running. API endpoint is at /api/analyze-prompt (accepts POST).`);
});

// Ultra-simplified /api/analyze-prompt for debugging
app.all('/api/analyze-prompt', (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Request received for /api/analyze-prompt with METHOD: ${req.method} from IP: ${req.ip}`);
    console.log(`[${timestamp}] Request Headers:`, JSON.stringify(req.headers, null, 2));
    if (req.method === 'POST') {
        console.log(`[${timestamp}] Request Body:`, JSON.stringify(req.body, null, 2));
    } else if (req.method === 'GET') {
        console.log(`[${timestamp}] Request Query:`, JSON.stringify(req.query, null, 2));
    }

    res.status(200).json({
        message: `[${timestamp}] Request to /api/analyze-prompt with method ${req.method} received successfully.`,
        receivedPrompt: req.body.prompt || req.query.prompt || "No prompt found"
    });
});

app.listen(port, () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Backend server running on port ${port}`);
    console.log(`[${timestamp}] CORS enabled for origins: ${allowedOrigins.join(', ')}`);
    console.log(`[${timestamp}] Root GET path / is available for health check.`);
    console.log(`[${timestamp}] Path /api/analyze-prompt now accepts ALL methods for debugging and will log details.`);
});
