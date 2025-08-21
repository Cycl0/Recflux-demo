import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import OpenAI from 'openai';
import axios from 'axios';
// Configure OpenAI SDK to point to OpenRouter when available
const useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
const openai = new OpenAI({
    apiKey: useOpenRouter ? process.env.OPENROUTER_API_KEY : process.env.OPENAI_API_KEY,
    baseURL: useOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
    defaultHeaders: useOpenRouter
        ? {
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://example.com',
            'X-Title': 'WhatsApp Codegen'
        }
        : undefined
});
// Base host/scheme for services
const SERVICES_SCHEME = process.env.SERVICES_SCHEME || 'http';
const SERVICES_HOST = process.env.SERVICES_HOST || 'localhost'; // set to '4.236.226.138' in prod
// Default ports (can be overridden via env)
const DEFAULT_TEST_PORT = Number(process.env.TEST_PORT || 3002);
const DEFAULT_CODE_DEPLOY_PORT = Number(process.env.CODE_DEPLOY_PORT || 3003); // set 3001 to match your mapping
const DEFAULT_ACCESSIBILITY_PORT = Number(process.env.ACCESSIBILITY_PORT || 3003);
const DEFAULT_DASHBOARD_PORT = Number(process.env.DASHBOARD_PORT || 3004);
const DEFAULT_AGENTIC_PORT = Number(process.env.AGENTIC_PORT || 3001);
// Construct service URLs (overridable via full URLs)
const AGENTIC_SERVICE_URL = process.env.AGENTIC_SERVICE_URL || `${SERVICES_SCHEME}://${SERVICES_HOST}:${DEFAULT_AGENTIC_PORT}`;
const TEST_SERVICE_URL = process.env.TEST_SERVICE_URL || `${SERVICES_SCHEME}://${SERVICES_HOST}:${DEFAULT_TEST_PORT}`;
const ACCESSIBILITY_SERVICE_URL = process.env.ACCESSIBILITY_SERVICE_URL || `${SERVICES_SCHEME}://${SERVICES_HOST}:${DEFAULT_ACCESSIBILITY_PORT}`;
const DEPLOY_SERVICE_URL = process.env.DEPLOY_SERVICE_URL || `${SERVICES_SCHEME}://${SERVICES_HOST}:${DEFAULT_CODE_DEPLOY_PORT}`;
const DASHBOARD_SERVICE_URL = process.env.DASHBOARD_SERVICE_URL || `${SERVICES_SCHEME}://${SERVICES_HOST}:${DEFAULT_DASHBOARD_PORT}`;
const server = new McpServer({ name: 'codegen-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
function logServiceRequest(service, url, payload) {
    try {
        console.log(`[SERVICE:${service}] POST ${url}`);
        console.log(`[SERVICE:${service}] payload=`, JSON.stringify(payload));
    }
    catch {
        console.log(`[SERVICE:${service}] payload=[unserializable]`);
    }
}
function logServiceResponse(service, status, data) {
    try {
        console.log(`[SERVICE:${service}] response status=${status}`);
        const preview = typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500);
        console.log(`[SERVICE:${service}] response preview=`, preview);
    }
    catch {
        console.log(`[SERVICE:${service}] response=[unserializable]`);
    }
}
// Call agentic-structured-service
server.tool('agentic_structured', {
    prompt: z.string(),
    actionType: z.string(),
    currentCode: z.string().optional(),
    fileName: z.string().optional(),
    userId: z.string()
}, async (args) => {
    const url = `${AGENTIC_SERVICE_URL}/api/agentic`;
    logServiceRequest('agentic_structured', url, args);
    try {
        const { data, status } = await axios.post(url, args, { timeout: 120000 });
        logServiceResponse('agentic_structured', status, data);
        const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        return { content: [{ type: 'text', text }] };
    }
    catch (err) {
        const text = `agentic_structured error: ${err?.response?.status || ''} ${err?.message || err}`;
        return { content: [{ type: 'text', text }] };
    }
});
// Call recflux-tools-accessibility-service
server.tool('accessibility_test', {
    urls: z.array(z.string()),
    resolution: z.object({ width: z.number(), height: z.number() }).partial().optional(),
    actions: z
        .array(z.object({
        action: z.string(),
        selector: z.string().optional(),
        text: z.string().optional(),
        duration: z.number().optional(),
        scrollType: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional()
    }))
        .optional()
}, async (args) => {
    const url = `${ACCESSIBILITY_SERVICE_URL}/test-accessibility`;
    try {
        const payload = {
            urls: args.urls,
            resolution: {
                width: args.resolution?.width ?? 1366,
                height: args.resolution?.height ?? 768
            },
            actions: args.actions || []
        };
        logServiceRequest('accessibility_test', url, payload);
        const { data, status } = await axios.post(url, payload, { timeout: 180000 });
        logServiceResponse('accessibility_test', status, data);
        const text = JSON.stringify(data, null, 2);
        return { content: [{ type: 'text', text }] };
    }
    catch (err) {
        const text = `accessibility_test error: ${err?.response?.status || ''} ${err?.message || err}`;
        return { content: [{ type: 'text', text }] };
    }
});
// Call code-deploy-service
server.tool('code_deploy', {
    reactCode: z.string()
}, async (args) => {
    const url = `${DEPLOY_SERVICE_URL}/deploy`;
    logServiceRequest('code_deploy', url, { reactCode: args.reactCode });
    try {
        const { data, status } = await axios.post(url, { reactCode: args.reactCode }, { timeout: 600000 });
        logServiceResponse('code_deploy', status, data);
        const text = JSON.stringify(data, null, 2);
        return { content: [{ type: 'text', text }] };
    }
    catch (err) {
        const text = `code_deploy error: ${err?.response?.status || ''} ${err?.message || err}`;
        return { content: [{ type: 'text', text }] };
    }
});
async function main() {
    await server.connect(new StdioServerTransport());
}
void main();
