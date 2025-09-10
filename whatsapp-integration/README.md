## WhatsApp + MCP Codegen Integration

This service wires the WhatsApp Cloud API to an MCP server tool `generate_code` and replies with generated code blocks.

### Structure
- `src/index.ts`: Express webhook server that connects to MCP and sends replies via WhatsApp.
- `src/mcp-server.ts`: Minimal MCP server exposing `generate_code` using OpenAI.

### Setup
1) Install dependencies
```bash
npm install
```

2) Create `.env` based on the following keys:
```
PORT=3000
WHATSAPP_TOKEN=EAAG...
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_VERIFY_TOKEN=some-verify-string
MCP_COMMAND=node
MCP_ARGS=dist/mcp-server.js
OPENROUTER_API_KEY=sk-...  # Preferred - OpenRouter API key for vision analysis, video selection
OPENAI_API_KEY=sk-...      # Fallback - Can also be used for OpenRouter access
OPENAI_MODEL=gpt-4o-mini
```

**Note**: Video analysis and vision features use OpenRouter API. The system checks for API keys in this order: `OPENROUTER_API_KEY` → `OPENAI_API_KEY` → `OPEN_ROUTER_API_KEY`.

3) Build and run
```bash
npm run build && npm start
```
Or run in dev (ts-node):
```bash
npm run dev
```

4) Expose webhook (local):
```bash
ngrok http 3000
```
Configure the webhook URL and verify token in the Meta app dashboard and subscribe your phone number to message events.

### Notes
- Long replies are chunked.
- Keep the MCP process alive; the client auto-connects on startup.
- Adjust `generate_code` to your preferred model/provider.


