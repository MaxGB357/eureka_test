import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Endpoint to generate ephemeral API key for client
app.post('/api/session', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file'
      });
    }

    console.log('[Backend] Requesting ephemeral key from OpenAI...');

    // Note: input_audio_transcription cannot be set here - it's configured automatically
    // by OpenAI or needs to be set via the WebSocket connection after session starts
    const sessionConfig = {
      session: {
        type: 'realtime',
        model: 'gpt-4o-realtime-preview'
      }
    };

    console.log('[Backend] Session config being sent:', JSON.stringify(sessionConfig, null, 2));

    // Create an ephemeral key by calling OpenAI's realtime client_secrets endpoint
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Backend] OpenAI API error (status:', response.status, '):', errorText);

      try {
        const errorJson = JSON.parse(errorText);
        return res.status(response.status).json(errorJson);
      } catch (e) {
        return res.status(response.status).json({
          error: 'OpenAI API error',
          details: errorText,
          status: response.status
        });
      }
    }

    const data = await response.json();
    console.log('[Backend] Ephemeral key received:', data.value ? `${data.value.substring(0, 10)}...` : 'NO VALUE');

    // Return the complete response which contains the 'value' field with the ephemeral key
    res.json(data);
  } catch (error) {
    console.error('[Backend] Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to use the voice agent`);
});
