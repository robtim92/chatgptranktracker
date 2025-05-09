// server.js
require('dotenv').config(); 
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; // Use Render's port if available, otherwise 3000

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
    console.error("FATAL ERROR: OPENAI_API_KEY is not set in the .env file.");
    process.exit(1); 
}
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// --- Specific CORS Configuration ---
const allowedOrigins = [
    'https://chatgptranktracker-frm3.onrender.com', // Your frontend URL
    // You can add 'http://localhost:YOUR_LOCAL_FRONTEND_PORT' if you test locally
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'], // Explicitly allow POST and OPTIONS
    allowedHeaders: ['Content-Type', 'Authorization'], // Ensure Content-Type is allowed
    credentials: true // If you were using cookies or auth headers
};

// Use CORS middleware with options
// This will apply to all routes defined after it.
app.use(cors(corsOptions));

// Middleware to parse JSON request bodies
app.use(express.json()); 

// Handle preflight OPTIONS requests for all routes
// It's good practice to handle this explicitly, though cors(corsOptions) on app.use should cover it.
// app.options('*', cors(corsOptions)); // You can uncomment this if app.use(cors(corsOptions)) alone isn't enough for OPTIONS

// Endpoint to handle prompt analysis
app.post('/api/analyze-prompt', async (req, res) => {
    // This route will now use the CORS settings defined above
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        console.log(`Received prompt for analysis with web search: "${prompt}"`);
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-search-preview", 
            messages: [{ role: "user", content: prompt }],
        });

        console.log("OpenAI API response (with web search) received.");
        
        if (completion.choices && completion.choices.length > 0 && completion.choices[0].message) {
            res.json({ response: completion.choices[0].message.content });
        } else {
            console.error("Unexpected OpenAI API response structure:", completion);
            res.status(500).json({ error: 'Failed to get a valid response from OpenAI API' });
        }

    } catch (error) {
        console.error('Error calling OpenAI API:', error.response ? error.response.data : error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            console.error('Data:', error.response.data);
        }
        res.status(500).json({ 
            error: 'Failed to analyze prompt with OpenAI (web search)', 
            details: error.message,
            responseData: error.response ? error.response.data : null
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
    console.log(`Allowing CORS for origin: https://chatgptranktracker-frm3.onrender.com`);
    console.log("Using OpenAI model: gpt-4o-search-preview");
});
