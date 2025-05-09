// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const port = 3000; // Port for your backend server

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
    console.error("FATAL ERROR: OPENAI_API_KEY is not set in the .env file.");
    process.exit(1); // Exit if key is not found
}
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON request bodies

// Endpoint to handle prompt analysis
app.post('/api/analyze-prompt', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        console.log(`Received prompt for analysis with web search: "${prompt}"`);
        
        // MODIFIED PART: Using the new gpt-4o-search-preview model
        // This model is designed to incorporate web search results directly.
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-search-preview", // Changed from "gpt-4o"
            messages: [{ role: "user", content: prompt }],
            // You might be able to add other parameters here if needed,
            // such as 'temperature', 'max_tokens', etc.
            // The new "Web search" tool might also be configurable via `tools` and `tool_choice`
            // when using the standard gpt-4o model with the Responses API or if Chat Completions supports it this way.
            // For now, using the dedicated search-preview model is the simplest approach based on the announcement.
        });

        console.log("OpenAI API response (with web search) received.");
        
        if (completion.choices && completion.choices.length > 0 && completion.choices[0].message) {
            // The response should now ideally include information sourced from the web.
            // The announcement also mentions "clearly-cited answers", so you might see
            // citations or source information in the response content itself.
            res.json({ response: completion.choices[0].message.content });
        } else {
            console.error("Unexpected OpenAI API response structure:", completion);
            res.status(500).json({ error: 'Failed to get a valid response from OpenAI API' });
        }

    } catch (error) {
        console.error('Error calling OpenAI API:', error.response ? error.response.data : error.message);
        // More detailed error logging
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
    console.log(`Backend server running at http://localhost:${port}`);
    console.log("Using OpenAI model: gpt-4o-search-preview");
});
