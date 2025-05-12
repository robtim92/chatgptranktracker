   // server.js
   require('dotenv').config(); 
   const express = require('express');
   const OpenAI = require('openai');
   const cors = require('cors');

   const app = express();
   const port = process.env.PORT || 3000; 

   if (!process.env.OPENAI_API_KEY) {
       console.error("FATAL ERROR: OPENAI_API_KEY is not set in the .env file.");
       process.exit(1); 
   }
   const openai = new OpenAI({
       apiKey: process.env.OPENAI_API_KEY,
   });

   const allowedOrigins = [
       'https://chatgptranktracker-frm3.onrender.com',
       // Add your local development frontend URL if needed: e.g., 'http://localhost:5500'
       // (assuming you might run your HTML locally with a live server on a port like 5500)
   ];

   const corsOptions = {
       origin: function (origin, callback) {
           if (!origin || allowedOrigins.indexOf(origin) !== -1) {
               callback(null, true);
           } else {
               const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
               console.error(`CORS Error: Origin ${origin} not allowed.`); // Log CORS block
               callback(new Error(msg), false);
           }
       },
       methods: ['GET', 'POST', 'OPTIONS'], 
       allowedHeaders: ['Content-Type', 'Authorization'], 
       credentials: true 
   };

   app.use(cors(corsOptions));
   app.use(express.json()); 

   // --- ADDED: Simple root route for health check ---
   app.get('/', (req, res) => {
       console.log('Root path / was hit with a GET request.'); // Log when root is accessed
       res.status(200).send('Backend is running. API endpoint is at POST /api/analyze-prompt');
   });

   app.post('/api/analyze-prompt', async (req, res) => {
       const { prompt } = req.body;
       console.log(`Received POST request to /api/analyze-prompt with prompt: "${prompt}"`); // More specific log

       if (!prompt) {
           console.log('Prompt is missing, returning 400.');
           return res.status(400).json({ error: 'Prompt is required' });
       }

       try {
           console.log(`Calling OpenAI with model gpt-4o-search-preview for prompt: "${prompt}"`);
           const completion = await openai.chat.completions.create({
               model: "gpt-4o-search-preview", 
               messages: [{ role: "user", content: prompt }],
           });

           console.log("OpenAI API response received successfully.");
           
           if (completion.choices && completion.choices.length > 0 && completion.choices[0].message) {
               res.json({ response: completion.choices[0].message.content });
           } else {
               console.error("Unexpected OpenAI API response structure:", completion);
               res.status(500).json({ error: 'Failed to get a valid response from OpenAI API' });
           }

       } catch (error) {
           console.error('Error calling OpenAI API:', error.response ? error.response.data : error.message);
           if (error.response) {
               console.error('OpenAI Error Status:', error.response.status);
               console.error('OpenAI Error Headers:', error.response.headers);
               console.error('OpenAI Error Data:', error.response.data);
           }
           res.status(500).json({ 
               error: 'Failed to analyze prompt with OpenAI (web search)', 
               details: error.message,
               responseData: error.response ? error.response.data : null
           });
       }
   });

   app.listen(port, () => {
       console.log(`Backend server running on port ${port}`);
       console.log(`CORS enabled for origins: ${allowedOrigins.join(', ')}`);
       console.log("Using OpenAI model: gpt-4o-search-preview");
       console.log("Root GET path / is available for health check."); // New log
   });
   