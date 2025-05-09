// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const port = 3000; // Port for your backend server

// Initialize OpenAI client
// Ensure your OPENAI_API_KEY is set in your .env file
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
        console.log(`Received prompt for analysis: "${prompt}"`);
        // Using GPT-4o as requested
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Or your preferred model
            messages: [{ role: "user", content: prompt }],
        });

        console.log("OpenAI API response received.");
        // Send the content of the response back to the frontend
        if (completion.choices && completion.choices.length > 0 && completion.choices[0].message) {
            res.json({ response: completion.choices[0].message.content });
        } else {
            console.error("Unexpected OpenAI API response structure:", completion);
            res.status(500).json({ error: 'Failed to get a valid response from OpenAI API' });
        }

    } catch (error) {
        console.error('Error calling OpenAI API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to analyze prompt with OpenAI', details: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});