import { RealtimeAgent, RealtimeSession, tool } from 'https://cdn.jsdelivr.net/npm/@openai/agents-realtime@0.1.0/+esm';
import { z } from 'https://cdn.jsdelivr.net/npm/zod@3.23.8/+esm';

// Define some example tools for the agent
const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the current weather for a location',
  parameters: z.object({
    location: z.string().describe('The city and state, e.g. San Francisco, CA'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().default('fahrenheit'),
  }),
  execute: async ({ location, unit }) => {
    // Simulated weather data - in production, you'd call a real weather API
    const temp = unit === 'celsius' ? 22 : 72;
    return {
      location,
      temperature: temp,
      unit,
      conditions: 'Sunny',
      humidity: 65,
    };
  },
});

const getCurrentTimeTool = tool({
  name: 'get_current_time',
  description: 'Get the current time',
  parameters: z.object({}),
  execute: async () => {
    return {
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
});

const calculateTool = tool({
  name: 'calculate',
  description: 'Perform a mathematical calculation',
  parameters: z.object({
    expression: z.string().describe('The mathematical expression to evaluate, e.g. "2 + 2" or "10 * 5"'),
  }),
  execute: async ({ expression }) => {
    try {
      // Simple safe evaluation for basic math
      const result = Function('"use strict"; return (' + expression + ')')();
      return {
        expression,
        result,
      };
    } catch (error) {
      return {
        expression,
        error: 'Invalid expression',
      };
    }
  },
});

// Create the voice agent with tools
const agent = new RealtimeAgent({
  name: 'Helpful Assistant',
  instructions: `You are a helpful voice assistant. You can help users with:
- Getting weather information
- Telling the current time
- Performing calculations
- Having natural conversations

Be friendly, concise, and helpful. When users ask about the weather, time, or calculations, use your tools to provide accurate information.`,
  tools: [getWeatherTool, getCurrentTimeTool, calculateTool],
  voice: 'verse', // Options: 'alloy', 'echo', 'shimmer', 'verse', 'ash'
  temperature: 0.8,
});

// UI elements
let session = null;
let isConnected = false;

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusDiv = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const eventsDiv = document.getElementById('events');

// Update UI status
function updateStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

// Add transcript message
function addTranscript(role, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  messageDiv.innerHTML = `<strong>${role}:</strong> ${text}`;
  transcriptDiv.appendChild(messageDiv);
  transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
}

// Add event log
function logEvent(event) {
  const eventDiv = document.createElement('div');
  eventDiv.className = 'event';
  eventDiv.textContent = `[${new Date().toLocaleTimeString()}] ${event}`;
  eventsDiv.appendChild(eventDiv);
  eventsDiv.scrollTop = eventsDiv.scrollHeight;
}

// Connect to the voice agent
async function connect() {
  try {
    updateStatus('Connecting...', 'info');
    connectBtn.disabled = true;
    logEvent('Requesting session token from server...');

    // Get session token from backend
    const response = await fetch('http://localhost:3000/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get session token');
    }

    const sessionData = await response.json();
    logEvent('Session token received');

    // Create and connect the session
    session = new RealtimeSession(agent);

    // Set up event listeners
    session.on('connected', () => {
      isConnected = true;
      updateStatus('Connected - Start talking!', 'success');
      disconnectBtn.disabled = false;
      logEvent('Connected to OpenAI Realtime API');
    });

    session.on('disconnected', () => {
      isConnected = false;
      updateStatus('Disconnected', 'error');
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      logEvent('Disconnected from OpenAI Realtime API');
    });

    session.on('error', (error) => {
      console.error('Session error:', error);
      updateStatus(`Error: ${error.message}`, 'error');
      logEvent(`Error: ${error.message}`);
    });

    session.on('user_transcript', (text) => {
      addTranscript('User', text);
      logEvent(`User spoke: ${text.substring(0, 50)}...`);
    });

    session.on('agent_transcript', (text) => {
      addTranscript('Agent', text);
      logEvent(`Agent responded: ${text.substring(0, 50)}...`);
    });

    session.on('tool_call', (toolCall) => {
      logEvent(`Tool called: ${toolCall.name}`);
    });

    // Connect with the session token
    await session.connect({
      clientSecret: sessionData.client_secret,
    });

    logEvent('Starting audio...');

  } catch (error) {
    console.error('Connection error:', error);
    updateStatus(`Connection failed: ${error.message}`, 'error');
    connectBtn.disabled = false;
    logEvent(`Connection error: ${error.message}`);
  }
}

// Disconnect from the voice agent
async function disconnect() {
  if (session) {
    await session.disconnect();
    session = null;
    logEvent('Disconnected by user');
  }
}

// Event listeners
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);

// Log initial state
logEvent('Voice agent initialized');
updateStatus('Ready to connect', 'info');
