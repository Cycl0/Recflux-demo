import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import FormData from 'form-data';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { configureAuth, getUserByWhatsApp } from './auth.js';
import { createClient } from '@supabase/supabase-js';
// Simple in-memory idempotency cache for WhatsApp message IDs
const processedMessageIds = new Map();
const SEEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
function pruneProcessed() {
    const now = Date.now();
    for (const [id, ts] of processedMessageIds.entries()) {
        if (now - ts > SEEN_TTL_MS)
            processedMessageIds.delete(id);
    }
}
function shouldProcessMessage(uniqueId) {
    pruneProcessed();
    if (processedMessageIds.has(uniqueId))
        return false;
    processedMessageIds.set(uniqueId, Date.now());
    return true;
}
function getSupabaseForIdempotency() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url)
        return null;
    if (serviceKey)
        return createClient(url, serviceKey);
    if (anonKey)
        return createClient(url, anonKey);
    return null;
}
async function ensureFirstProcessDistributed(uniqueId) {
    const supabase = getSupabaseForIdempotency();
    if (!supabase)
        return shouldProcessMessage(uniqueId);
    try {
        const { error } = await supabase
            .from('processed_messages')
            .insert({ id: uniqueId })
            .single();
        if (error) {
            const code = error?.code || '';
            if (code === '23505')
                return false;
            console.warn('[IDEMPOTENCY] Supabase insert failed, using in-memory fallback:', error.message || error);
            return shouldProcessMessage(uniqueId);
        }
        return true;
    }
    catch (e) {
        console.warn('[IDEMPOTENCY] Supabase error, using in-memory fallback:', e?.message || e);
        return shouldProcessMessage(uniqueId);
    }
}
const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, MCP_COMMAND, MCP_ARGS, PUBLIC_BASE_URL, SERVICES_SCHEME: ENV_SERVICES_SCHEME, SERVICES_HOST: ENV_SERVICES_HOST, CODE_DEPLOY_PORT: ENV_CODE_DEPLOY_PORT, DEPLOY_SERVICE_URL: ENV_DEPLOY_SERVICE_URL } = process.env;
// Build deploy service URL (mirror mcp-server.ts logic)
const SERVICES_SCHEME = ENV_SERVICES_SCHEME || 'http';
const SERVICES_HOST = ENV_SERVICES_HOST || 'localhost';
const DEFAULT_CODE_DEPLOY_PORT = Number(ENV_CODE_DEPLOY_PORT || 3003);
const DEPLOY_SERVICE_URL = ENV_DEPLOY_SERVICE_URL || `${SERVICES_SCHEME}://${SERVICES_HOST}:${DEFAULT_CODE_DEPLOY_PORT}`;
const DEFAULT_AGENTIC_PORT = Number(process.env.AGENTIC_PORT || 3001);
const AGENTIC_SERVICE_URL = process.env.AGENTIC_SERVICE_URL || `${SERVICES_SCHEME}://${SERVICES_HOST}:${DEFAULT_AGENTIC_PORT}`;
function isValidUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_VERIFY_TOKEN) {
    throw new Error('Missing WhatsApp env vars');
}
if (!MCP_COMMAND || !MCP_ARGS) {
    throw new Error('Missing MCP_COMMAND/MCP_ARGS env vars');
}
const transport = new StdioClientTransport({
    command: MCP_COMMAND,
    args: MCP_ARGS.split(/\s+/).filter(Boolean)
});
const mcpClient = new Client({ name: 'whatsapp-codegen-bot', version: '1.0.0' }, { capabilities: { tools: {} }, requestTimeoutMs: 600000 });
async function startMcp() {
    await mcpClient.connect(transport);
    console.log('Connected to MCP server');
}
async function callMcpTool(name, args) {
    const timeoutMs = 600000;
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`MCP tool call timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    const callPromise = mcpClient.callTool({ name, arguments: args });
    const response = await Promise.race([callPromise, timeoutPromise]);
    const part = response?.content?.find((c) => c.type === 'text');
    return part?.text || 'No content returned.';
}
async function callCodeDeployHttp(reactCode) {
    const url = `${DEPLOY_SERVICE_URL}/deploy`;
    console.log('[CODE-DEPLOY:HTTP] POST', url);
    const { data, status } = await axios.post(url, { reactCode }, { timeout: 600000 });
    console.log('[CODE-DEPLOY:HTTP] status=', status);
    return typeof data === 'string' ? data : JSON.stringify(data);
}
async function callCodeDeploy(reactCode) {
    try {
        return await callCodeDeployHttp(reactCode);
    }
    catch (httpErr) {
        console.warn('[CODE-DEPLOY] HTTP path failed, falling back to MCP:', httpErr?.message || httpErr);
        return callMcpTool('code_deploy', { reactCode });
    }
}
async function callAgenticHttp(payload) {
    const url = `${AGENTIC_SERVICE_URL}/api/agentic`;
    console.log('[AGENTIC:HTTP] POST', url);
    const { data, status } = await axios.post(url, payload, { timeout: 600000, headers: { 'Content-Type': 'application/json' } });
    console.log('[AGENTIC:HTTP] status=', status);
    return typeof data === 'string' ? data : JSON.stringify(data);
}
async function callAccessibility(urls) {
    const resolution = { width: 1366, height: 768 };
    return callMcpTool('accessibility_test', { urls, resolution });
}
async function callAgenticStructured(params) {
    // Prefer HTTP to avoid MCP 60s SDK timeout
    try {
        return await callAgenticHttp(params);
    }
    catch (httpErr) {
        console.warn('[AGENTIC] HTTP path failed, falling back to MCP:', httpErr?.message || httpErr);
        return callMcpTool('agentic_structured', params);
    }
}
function extractCodeFromAgentic(raw) {
    try {
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        const candidate = jsonStart >= 0 && jsonEnd > jsonStart ? raw.slice(jsonStart, jsonEnd + 1) : raw;
        const parsed = JSON.parse(candidate);
        const changes = parsed?.changes;
        if (Array.isArray(changes) && changes.length) {
            for (let i = changes.length - 1; i >= 0; i--) {
                const c = changes[i];
                if (typeof c?.code === 'string' && c.code.trim().length > 0) {
                    return c.code;
                }
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
async function buildAndDeployFromPrompt(nlPrompt, whatsappFrom) {
    const mappedUser = getUserByWhatsApp(whatsappFrom);
    let userId = 'dev-user';
    if (mappedUser?.email) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const { data: user, error } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', mappedUser.email)
                    .single();
                if (!error && user?.id) {
                    userId = user.id;
                }
            }
            catch (e) {
                console.warn('[SUPABASE] resolve uuid failed:', e.message);
            }
        }
    }
    if (!isValidUuid(userId)) {
        const fallback = process.env.DEFAULT_USER_ID;
        if (fallback && isValidUuid(fallback))
            userId = fallback;
    }
    if (!isValidUuid(userId)) {
        return { text: 'Por favor, faça /login para atribuirmos créditos, ou configure DEFAULT_USER_ID (UUID) no servidor.' };
    }
    const agenticRaw = await callAgenticStructured({ prompt: nlPrompt, actionType: 'GERAR', userId });
    const code = extractCodeFromAgentic(agenticRaw);
    if (!code) {
        return { text: 'Could not extract generated code from the AI response. Please retry with a clearer prompt.' };
    }
    const deployRaw = await callCodeDeploy(code);
    console.log('[DEPLOY] Raw deployment response:', deployRaw.substring(0, 500) + '...');
    try {
        const parsed = JSON.parse(deployRaw);
        console.log('[DEPLOY] Parsed response keys:', Object.keys(parsed));
        const url = parsed?.deploymentUrl;
        const screenshot = parsed?.screenshot;
        console.log('[DEPLOY] URL found:', typeof url, url ? 'YES' : 'NO');
        console.log('[DEPLOY] Screenshot found:', typeof screenshot, screenshot ? `YES (${screenshot.length} chars)` : 'NO');
        if (typeof url === 'string' && url.startsWith('http')) {
            const response = {
                text: `🚀 Deploy concluído!\n\n🔗 URL público: ${url}\n\n📱 Enviarei um screenshot do seu app em seguida...`,
                shouldSendImage: false
            };
            // If we have a screenshot, prepare to send it
            if (typeof screenshot === 'string' && screenshot.length > 0) {
                response.shouldSendImage = true;
                response.imageData = screenshot;
                response.imageCaption = `📸 Screenshot do seu app publicado: ${url}`;
            }
            return response;
        }
    }
    catch (parseError) {
        console.warn('[DEPLOY] Failed to parse deployment response:', parseError);
        // Try to extract URL from raw text as fallback
        const match = deployRaw.match(/https?:\/\/\S+/);
        if (match) {
            return { text: `🚀 Publicado: ${match[0]}` };
        }
    }
    return { text: deployRaw };
}
async function sendWhatsappText(to, body) {
    const chunks = [];
    const maxLen = 3500;
    for (let i = 0; i < body.length; i += maxLen) {
        chunks.push(body.slice(i, i + maxLen));
    }
    console.log(`[WHATSAPP_API] Sending ${chunks.length} chunk(s) to ${to}`);
    for (const [idx, chunk] of chunks.entries()) {
        const url = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: chunk }
        };
        try {
            console.log(`[WHATSAPP_API] POST ${url} (chunk ${idx + 1}/${chunks.length})`);
            const resp = await axios.post(url, payload, {
                headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
            });
            const preview = typeof resp.data === 'string' ? resp.data.slice(0, 500) : JSON.stringify(resp.data).slice(0, 500);
            console.log(`[WHATSAPP_API] status=${resp.status} body=${preview}`);
        }
        catch (err) {
            const status = err?.response?.status;
            const dataPreview = err?.response?.data ? (typeof err.response.data === 'string' ? err.response.data.slice(0, 500) : JSON.stringify(err.response.data).slice(0, 500)) : '';
            console.error(`[WHATSAPP_API] error status=${status} message=${err?.message}`);
            if (dataPreview)
                console.error(`[WHATSAPP_API] error body=${dataPreview}`);
            throw err;
        }
    }
}
async function sendWhatsappImage(to, base64Image, caption) {
    try {
        console.log(`[WHATSAPP_API] Sending image to ${to} (${Math.round(base64Image.length / 1024)}KB)`);
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Image, 'base64');
        // First, upload the media
        const uploadUrl = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/media`;
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', imageBuffer, {
            filename: 'screenshot.png',
            contentType: 'image/png'
        });
        formData.append('type', 'image/png');
        const uploadResp = await axios.post(uploadUrl, formData, {
            headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                ...formData.getHeaders()
            }
        });
        const mediaId = uploadResp.data.id;
        console.log(`[WHATSAPP_API] Media uploaded successfully, ID: ${mediaId}`);
        // Then send the image message
        const messageUrl = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            to,
            type: 'image',
            image: {
                id: mediaId,
                caption: caption || ''
            }
        };
        const resp = await axios.post(messageUrl, payload, {
            headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
        });
        console.log(`[WHATSAPP_API] Image sent successfully, status=${resp.status}`);
        return resp.data;
    }
    catch (err) {
        const status = err?.response?.status;
        const dataPreview = err?.response?.data ? (typeof err.response.data === 'string' ? err.response.data.slice(0, 500) : JSON.stringify(err.response.data).slice(0, 500)) : '';
        console.error(`[WHATSAPP_API] Image send error status=${status} message=${err?.message}`);
        if (dataPreview)
            console.error(`[WHATSAPP_API] Image send error body=${dataPreview}`);
        throw err;
    }
}
const app = express();
app.use(bodyParser.json());
// Optional Google auth setup
configureAuth(app);
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});
app.post('/webhook', async (req, res) => {
    try {
        // Debug: print the incoming request
        console.log('[WEBHOOK] method=POST path=/webhook');
        console.log('[WEBHOOK] headers=', JSON.stringify(req.headers));
        console.log('[WEBHOOK] body=', JSON.stringify(req.body));
        const entry = req.body?.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;
        // Ignore status callbacks (delivery/read, outbound acks)
        if (Array.isArray(value?.statuses) && value.statuses.length > 0) {
            return res.sendStatus(200);
        }
        if (messages && messages[0] && messages[0].type === 'text') {
            const msg = messages[0];
            const from = msg.from;
            const text = (msg.text?.body || '').trim();
            const uniqueId = msg.id || `${from}:${msg.timestamp || Date.now()}`;
            if (!(await ensureFirstProcessDistributed(uniqueId))) {
                console.log(`[WEBHOOK] duplicate message detected, id=${uniqueId}, skipping`);
                return res.sendStatus(200);
            }
            let reply = '';
            let wrapAsCode = true;
            if (text.toLowerCase().startsWith('/deploy ')) {
                const reactCode = text.slice(8);
                // Immediate feedback to user about expected duration
                await sendWhatsappText(from, '⏳ Iniciando deploy… tempo estimado ~2 minutos. Enviarei o link e o screenshot assim que estiver pronto.');
                const raw = await callCodeDeploy(reactCode);
                reply = raw;
            }
            else if (text.toLowerCase().startsWith('/access ')) {
                const rest = text.slice(8).trim();
                const urls = rest.split(/\s+/).filter(Boolean);
                if (urls.length === 0) {
                    reply = 'Uso: /access <url1> [url2 ...]';
                }
                else {
                    const raw = await callAccessibility(urls);
                    reply = raw;
                }
            }
            else if (text.toLowerCase().startsWith('/login')) {
                const base = (PUBLIC_BASE_URL && PUBLIC_BASE_URL.trim()) || `http://localhost:${process.env.PORT || 3000}`;
                const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
                const loginUrl = `${normalizedBase}/auth/google?state=${encodeURIComponent(from)}`;
                reply = `Login com Google: ${loginUrl}`;
                wrapAsCode = false;
            }
            else if (text.toLowerCase().startsWith('/agentic')) {
                // Formats:
                // GERAR:  /agentic GERAR <userId> | <prompt>
                // EDITAR: /agentic EDITAR <userId> | <fileName> | <prompt> || <currentCode>
                const payload = text.startsWith('/agentic ') ? text.slice(9).trim() : '';
                const [left, currentCodeRaw] = payload.split('||');
                const parts = (left || '').split('|').map(s => s.trim()).filter(Boolean);
                const head = (parts[0] || '').split(/\s+/).filter(Boolean);
                const actionType = head[0]?.toUpperCase() || 'EDITAR';
                // Try to get logged-in user via WhatsApp sender mapping; fallback to provided id or dev-user
                const mappedUser = getUserByWhatsApp(from);
                let userId = head[1] || 'dev-user';
                if (mappedUser?.email) {
                    // Resolve Supabase user UUID via email
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                    if (supabaseUrl && supabaseKey) {
                        try {
                            const supabase = createClient(supabaseUrl, supabaseKey);
                            const { data: user, error } = await supabase
                                .from('users')
                                .select('id')
                                .eq('email', mappedUser.email)
                                .single();
                            if (!error && user?.id) {
                                userId = user.id;
                            }
                        }
                        catch (e) {
                            console.warn('[SUPABASE] Failed to resolve user id by email:', e.message);
                        }
                    }
                }
                const fileName = parts.length > 2 ? parts[1] : undefined;
                const prompt = parts.length > 1 ? parts[parts.length - 1] : '';
                const currentCode = currentCodeRaw?.trim();
                if (!prompt) {
                    const who = mappedUser ? ` (como ${mappedUser.email || mappedUser.name || mappedUser.id})` : '';
                    reply = `Você está usando /agentic${who}.\nUso:\n/agentic GERAR | <prompt>\n/agentic EDITAR | <fileName> | <prompt> || <currentCode>`;
                }
                else {
                    // Fallback: if userId isn't a UUID, try DEFAULT_USER_ID env, otherwise ask user to /login
                    if (!isValidUuid(userId)) {
                        const fallback = process.env.DEFAULT_USER_ID;
                        if (fallback && isValidUuid(fallback)) {
                            console.warn(`[AGENTIC] Using DEFAULT_USER_ID fallback for non-UUID userId (${userId})`);
                            userId = fallback;
                        }
                        else {
                            reply = 'Por favor, faça /login primeiro ou forneça um UUID de usuário válido. Você também pode definir DEFAULT_USER_ID nas variáveis do servidor.';
                            wrapAsCode = false;
                            await sendWhatsappText(from, reply);
                            return res.sendStatus(200);
                        }
                    }
                    const raw = await callAgenticStructured({ prompt, actionType, userId, currentCode, fileName });
                    reply = raw;
                }
            }
            else if (text.toLowerCase() === '/help') {
                reply = 'Envie um prompt em linguagem natural (ex.: "Crie um portfólio moderno") e eu vou gerar e publicar. Comandos: /login, /agentic, /access, /deploy';
                wrapAsCode = false;
            }
            else {
                console.log(`[WEBHOOK] Processing deployment request from ${from}: "${text.substring(0, 100)}..."`);
                // Immediate feedback to user about expected duration
                await sendWhatsappText(from, '⏳ Gerando e publicando… tempo estimado ~2 minutos. Vou enviar o link e o screenshot quando finalizar.');
                const result = await buildAndDeployFromPrompt(text, from);
                console.log('[WEBHOOK] Deployment result:', {
                    textLength: result.text.length,
                    shouldSendImage: result.shouldSendImage,
                    hasImageData: !!result.imageData,
                    imageDataLength: result.imageData?.length || 0
                });
                reply = result.text;
                wrapAsCode = false;
                // Send the text message
                if (wrapAsCode && !reply.startsWith('```')) {
                    reply = '```' + reply + '```';
                }
                console.log(`[WEBHOOK] Sending text message to ${from}`);
                await sendWhatsappText(from, reply);
                // Send the image if available
                if (result.shouldSendImage && result.imageData) {
                    console.log(`[WEBHOOK] Attempting to send screenshot to ${from} (${result.imageData.length} chars)`);
                    try {
                        await sendWhatsappImage(from, result.imageData, result.imageCaption);
                        console.log(`[WEBHOOK] Successfully sent screenshot to ${from}`);
                    }
                    catch (imageError) {
                        console.error(`[WEBHOOK] Failed to send screenshot to ${from}:`, imageError);
                        // Send a fallback message about the screenshot failure
                        await sendWhatsappText(from, '⚠️ Não consegui enviar o screenshot, mas seu app já está no ar e acessível pelo link acima.');
                    }
                }
                else {
                    console.log(`[WEBHOOK] No screenshot to send (shouldSendImage: ${result.shouldSendImage}, hasImageData: ${!!result.imageData})`);
                }
                // Return early since we already sent the message(s)
                return res.sendStatus(200);
            }
            if (wrapAsCode && !reply.startsWith('```')) {
                reply = '```' + reply + '```';
            }
            await sendWhatsappText(from, reply);
        }
        res.sendStatus(200);
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});
const port = Number(process.env.PORT || 3000);
app.listen(port, async () => {
    console.log(`Webhook listening on :${port}`);
    await startMcp();
});
