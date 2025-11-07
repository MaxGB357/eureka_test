import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in Vercel environment variables'
      });
    }

    console.log('[Backend] Requesting ephemeral key from OpenAI...');

    const sessionConfig = {
      session: {
        type: 'realtime',
        model: 'gpt-4o-realtime-preview-2024-12-17'
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
    res.status(200).json(data);
  } catch (error) {
    console.error('[Backend] Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
