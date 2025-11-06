# Realtime AI Voice Agent

A fully functional realtime AI voice agent built with the OpenAI Agents SDK. This application allows you to have natural voice conversations with an AI assistant that can use tools to help you with weather information, time, calculations, and more.

## Features

- 🎙️ **Real-time Voice Interaction** - Speak naturally with the AI using your microphone
- 🛠️ **Tool Calling** - The agent can use tools to:
  - Get weather information for any location
  - Tell you the current time and date
  - Perform mathematical calculations
- 📝 **Live Transcription** - See the conversation transcript in real-time
- 🔒 **Secure** - Uses ephemeral API keys generated server-side
- 🎨 **Modern UI** - Clean, responsive interface with live event logging

## Prerequisites

- Node.js 18+ (recommended: Node.js 20+)
- An OpenAI API key with access to the Realtime API
- A modern web browser with microphone access

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd eureka_test
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your OpenAI API key to the `.env` file:
```
OPENAI_API_KEY=your-api-key-here
PORT=3000
```

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Click "Connect & Start Talking" and allow microphone access when prompted

4. Start talking! Try asking:
   - "What's the weather in San Francisco?"
   - "What time is it?"
   - "Calculate 15 times 23"
   - Or just have a natural conversation!

## Project Structure

```
eureka_test/
├── src/
│   └── server.ts          # Express server for API key management
├── public/
│   ├── index.html         # Web interface
│   └── agent.js           # Voice agent implementation
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
├── .env                   # Environment variables (not in git)
└── README.md             # This file
```

## How It Works

1. **Backend Server** (`src/server.ts`):
   - Serves the web interface
   - Generates ephemeral API keys for secure client connections
   - Proxies requests to OpenAI's Realtime API

2. **Voice Agent** (`public/agent.js`):
   - Creates a `RealtimeAgent` with custom tools and instructions
   - Manages the `RealtimeSession` for audio streaming
   - Handles user speech and agent responses
   - Implements tool execution for weather, time, and calculations

3. **Web Interface** (`public/index.html`):
   - Provides controls for connecting/disconnecting
   - Displays conversation transcript
   - Shows event logs for debugging

## Available Tools

The agent comes with three built-in tools:

1. **get_weather** - Get weather information for any location
2. **get_current_time** - Get the current time and date
3. **calculate** - Perform mathematical calculations

You can easily add more tools by defining them in `public/agent.js` using the `tool()` function with Zod schemas.

## Customization

### Changing the Agent's Voice

Edit `public/agent.js` and modify the `voice` parameter:

```javascript
const agent = new RealtimeAgent({
  // ...
  voice: 'verse', // Options: 'alloy', 'echo', 'shimmer', 'verse', 'ash'
});
```

### Adding Custom Tools

Add new tools in `public/agent.js`:

```javascript
const myCustomTool = tool({
  name: 'my_tool',
  description: 'What this tool does',
  parameters: z.object({
    param: z.string().describe('Parameter description'),
  }),
  execute: async ({ param }) => {
    // Your tool logic here
    return { result: 'tool output' };
  },
});

// Add to the agent's tools array
const agent = new RealtimeAgent({
  // ...
  tools: [getWeatherTool, getCurrentTimeTool, calculateTool, myCustomTool],
});
```

### Modifying Agent Instructions

Edit the `instructions` field in `public/agent.js`:

```javascript
const agent = new RealtimeAgent({
  name: 'Helpful Assistant',
  instructions: `Your custom instructions here...`,
  // ...
});
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm run build` - Compile TypeScript to JavaScript
- `npm run type-check` - Check TypeScript types without building

## Troubleshooting

### Connection Issues

- Make sure your OpenAI API key is valid and has Realtime API access
- Check that the server is running on port 3000 (or your configured port)
- Ensure your browser allows microphone access

### No Audio

- Check browser microphone permissions
- Make sure your microphone is working in other applications
- Try refreshing the page and reconnecting

### Tool Calls Not Working

- Check the browser console for errors
- Make sure the tool parameters match the Zod schema
- Verify the tool execution function returns the expected format

## API Key Security

This implementation uses a secure pattern:

1. Your OpenAI API key is stored server-side in the `.env` file
2. The server generates ephemeral session tokens for each client connection
3. These tokens are temporary and limited in scope
4. Never expose your main API key to the client

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT

## Resources

- [OpenAI Agents SDK Documentation](https://openai.github.io/openai-agents-js/)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Voice Agents Quickstart](https://openai.github.io/openai-agents-js/guides/voice-agents/quickstart/)

## Acknowledgments

Built with the OpenAI Agents SDK and inspired by the official voice agents quickstart guide.
