// server.js
const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // serve your HTML from /public folder

// Optional: simple rate limit
const requestCounts = new Map();

app.post('/api/ai', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Basic rate limiting — 20 requests per minute per IP
    const now     = Date.now();
    const windowMs = 60 * 1000;
    const limit    = 20;

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }

    const timestamps = requestCounts.get(ip).filter(t => now - t < windowMs);
    timestamps.push(now);
    requestCounts.set(ip, timestamps);

    if (timestamps.length > limit) {
        return res.status(429).json({ error: 'Too many requests. Wait a minute.' });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body.' });
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${PROCESS.ENV.GROQKEY}`,
            },
            body: JSON.stringify({
                model:       'moonshotai/kimi-k2-instruct',
                messages:    messages,
                temperature: 0.15,
                max_tokens:  2048,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'OpenAI error' });
        }

        res.json({ reply: data.choices[0].message.content });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
