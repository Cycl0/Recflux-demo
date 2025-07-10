require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { streamText } = require('ai');
const { createOpenAI } = require('@ai-sdk/openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Agentic Structured Service API',
      version: '1.0.0',
      description: 'AI-powered code editing and generation service with structured output',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./server.js'], // Path to the API docs
};

const specs = swaggerJsdoc(swaggerOptions);

app.use(express.json({ limit: '50mb' }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('[AGENTIC-STRUCTURED] Health check at /health');
  res.status(200).json({ status: 'healthy', service: 'agentic-structured-service', timestamp: new Date().toISOString() });
});

// Root path handler - forwards to /api/agentic
app.post('/', (req, res) => {
  console.log('[AGENTIC-STRUCTURED] Root path hit, forwarding to /api/agentic');
  req.url = '/api/agentic';
  app._router.handle(req, res);
});

// Health check at /api/agentic/health
app.get('/api/agentic/health', (req, res) => {
  console.log('[AGENTIC-STRUCTURED] Health check at /api/agentic/health');
  res.status(200).json({ status: 'healthy', service: 'agentic-structured-service' });
});

// Verify API keys exist on startup
if (!process.env.OPENROUTER_API_KEY) {
  console.error('[AGENTIC-STRUCTURED] FATAL: OPENROUTER_API_KEY is not defined.');
  process.exit(1);
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[AGENTIC-STRUCTURED] FATAL: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are not defined.');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Create OpenRouter client using OpenAI-compatible API
const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

function parseCodeToStructuredFormat(code) {
  const lines = code.split('\n');
  const structure = [];
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    const indentation = line.length - line.trimLeft().length;
    let elementType = 'unknown';
    let content = trimmedLine;
    let key = null;
    let value = null;
    if (trimmedLine === '') {
      elementType = 'empty';
    } else if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      elementType = 'comment';
    } else if (trimmedLine.includes(':') && !trimmedLine.includes('(') && !trimmedLine.includes('function')) {
      elementType = 'property';
      const colonIndex = trimmedLine.indexOf(':');
      key = trimmedLine.substring(0, colonIndex).trim().replace(/['"]/g, '');
      value = trimmedLine.substring(colonIndex + 1).trim().replace(/,$/, '');
    } else if (trimmedLine.includes('=') && !trimmedLine.includes('==') && !trimmedLine.includes('===')) {
      elementType = 'assignment';
      const equalIndex = trimmedLine.indexOf('=');
      key = trimmedLine.substring(0, equalIndex).trim();
      value = trimmedLine.substring(equalIndex + 1).trim().replace(/;$/, '');
    } else if (trimmedLine.includes('function') || trimmedLine.includes('=>')) {
      elementType = 'function';
    } else if (trimmedLine.includes('{') || trimmedLine.includes('}')) {
      elementType = 'bracket';
    } else if (trimmedLine.includes('[') || trimmedLine.includes(']')) {
      elementType = 'array_bracket';
    } else {
      elementType = 'statement';
    }
    structure.push({
      line: lineNumber,
      type: elementType,
      content: content,
      originalLine: line,
      indentation: indentation,
      ...(key && { key }),
      ...(value && { value })
    });
  });
  return structure;
}

// Middleware to check and deduct credits
const creditCheckMiddleware = async (req, res, next) => {
    const { userId, userEmail } = req.body;
    
    if (!userId && !userEmail) {
        return res.status(400).json({ error: 'userId or userEmail is required' });
    }

    console.log(`[CREDIT_MIDDLEWARE] Checking credits with userId: ${userId || 'not provided'}, userEmail: ${userEmail || 'not provided'}`);

    try {
        let userIdToUse = userId;
        
        // If only email is provided, look up the user ID first for security
        if (!userId && userEmail) {
            console.log(`[CREDIT_MIDDLEWARE] No userId provided, looking up by email: ${userEmail}`);
            const { data: userData, error: userLookupError } = await supabase
                .from('users')
                .select('id')
                .eq('email', userEmail)
                .single();
            
            if (userLookupError || !userData) {
                console.error('[CREDIT_MIDDLEWARE] Error looking up user by email:', userLookupError);
                return res.status(404).json({ error: 'User not found by email' });
            }
            
            userIdToUse = userData.id;
            console.log(`[CREDIT_MIDDLEWARE] Found user ID: ${userIdToUse} for email: ${userEmail}`);
        }
        
        // Now fetch the user by ID (more secure)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, credits, plan')
            .eq('id', userIdToUse)
            .single();

        if (userError) {
            console.error('[CREDIT_MIDDLEWARE] Error fetching user by ID:', userError);
            return res.status(404).json({ error: 'User not found by ID' });
        }

        if (!user) {
            console.error(`[CREDIT_MIDDLEWARE] User not found for ID: ${userIdToUse}`);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[CREDIT_MIDDLEWARE] User found: ID=${user.id}, Credits=${user.credits}, Plan=${user.plan}`);

        // Check if user has enough credits - applies to all users
        if (user.credits < 10) {
            console.log(`[CREDIT_MIDDLEWARE] Insufficient credits: ${user.credits} (needed: 10)`);
            return res.status(402).json({ 
                error: 'Insufficient credits',
                explanation: 'Você não tem créditos suficientes. Por favor, recarregue para continuar usando o serviço.' 
            });
        }

        // Deduct ten credits for all users
        const { error: updateError } = await supabase
            .from('users')
            .update({ credits: user.credits - 10 })
            .eq('id', user.id);

        if (updateError) {
            console.error('[CREDIT_MIDDLEWARE] Error updating credits:', updateError);
            return res.status(500).json({ error: 'Failed to update user credits' });
        }
        
        // Add the verified user ID to the request body for downstream use
        req.body.verifiedUserId = user.id;
        
        console.log(`[CREDIT_MIDDLEWARE] Credit deduction successful for user ID: ${user.id}. Credits before: ${user.credits}, After: ${user.credits - 10}`);
        next(); // Proceed to the main handler
    } catch (error) {
        console.error('[CREDIT_MIDDLEWARE] Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error during credit check' });
    }
};

const getSystemPrompt = (actionType) => {
    const basePrompt = `Você é um editor de código cirúrgico que retorna mudanças precisas e estruturadas.

⚠️ IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional antes ou depois.

Formato JSON obrigatório:

{
  "changes": [
    {
      "type": "insert|replace|delete",
      "startLine": number,
      "endLine": number,
      "code": "código exato com indentação adequada (vazio para delete)",
      "description": "o que isso faz"
    }
  ],
  "explanation": "breve explicação das mudanças feitas"
}

🚫 **SINTAXE PROIBIDA - NUNCA USE:**
- NUNCA use: const container = document.getElementById('root');
- NUNCA use: const root = ReactDOM.createRoot(container);
- NUNCA use: root.render(<App />);
- NUNCA use: ReactDOM.render(<Component/>, document.getElementById('root'));
- NUNCA use: const { useState } = React;
- NUNCA use: const { useEffect, useState } = React;
- NUNCA destructure React: const { qualquerCoisa } = React;
- NUNCA use React.qualquerCoisa ou ReactDOM.qualquerCoisa
- SEMPRE use APENAS: render(<App />)
- SEMPRE use hooks diretamente: useState, useEffect, etc.

Regras:
- Números de linha começam em 1
- "insert": adiciona código ANTES da linha especificada
- "replace": substitui o intervalo exato de linhas
- "delete": remove o intervalo exato de linhas (código deve ser "")
- Preserve indentação e formatação exatas
- VERIFIQUE DUAS VEZES os números das linhas antes de responder
- SEMPRE responda em português brasileiro
- NÃO adicione texto explicativo fora do JSON
- Retorne APENAS o JSON válido`;

      switch (actionType) {
        case 'EDITAR':
          return `${basePrompt}

⚠️ MODO EDIÇÃO:
- Faça APENAS as mudanças específicas solicitadas
- Não reescreva funções ou componentes inteiros
- Preserve a estrutura de código existente
- Faça mudanças cirúrgicas mínimas
- Mantenha todo código não relacionado exatamente como está`;

        case 'FOCAR':
          return `${basePrompt}

⚠️ MODO FOCO:
- Extraia e mantenha APENAS o componente/seção solicitada
- Remova todo outro código não relacionado
- Mantenha a estrutura do componente focado
- Mantenha imports e dependências necessárias para a parte focada
- O resultado deve ser uma versão limpa e focada com apenas código relevante`;

        case 'GERAR':
          return `Você é um gerador de código React especializado em criar sites profissionais e modernos com visuais esplêndidos, animações e funcionalidades prontas.

Responda APENAS com JSON válido:
{
  "changes": [
    {
      "type": "replace",
      "startLine": 1,
      "endLine": 999,
      "code": "código React completo aqui",
      "description": "Componente gerado"
    }
  ],
  "explanation": "Componente criado com sucesso"
}

🚫 **SINTAXE PROIBIDA - NUNCA USE:**
- NUNCA use: const container = document.getElementById('root');
- NUNCA use: const root = ReactDOM.createRoot(container);
- NUNCA use: root.render(<App />);
- NUNCA use: ReactDOM.render(<Component/>, document.getElementById('root'));
- NUNCA use: const { useState } = React;
- NUNCA use: const { useEffect, useState } = React;
- NUNCA destructure React: const { qualquerCoisa } = React;
- NUNCA use React.qualquerCoisa ou ReactDOM.qualquerCoisa
- SEMPRE use APENAS: render(<App />)
- SEMPRE use hooks diretamente: useState, useEffect, etc.

🎨 **VISUAIS ESPLÊNDIDOS:**
- Use gradientes modernos com CSS-in-JS (ex: background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
- Aplique sombras elegantes (ex: boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)')
- Cores harmônicas e profissionais
- Tipografia moderna e hierárquica
- Layout responsivo com flexbox/grid CSS
- Espaçamento generoso e equilibrado

✨ **ANIMAÇÕES E INTERATIVIDADE:**
- Hover effects suaves com CSS-in-JS (ex: ':hover': { transform: 'scale(1.05)' })
- Transições fluidas (ex: transition: 'all 0.3s ease-in-out')
- Transforms para interações (rotate, scale, translate)
- Animações CSS ou keyframes quando apropriado
- Estados visuais claros para botões e links

🖼️ **IMAGENS SÃO OBRIGATÓRIAS - NUNCA PULE IMAGENS:**
- TODO componente DEVE incluir pelo menos 2-3 imagens relevantes
- Use APENAS estas fontes de imagens funcionais:
  * Imagens de destaque: https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=600&fit=crop
  * Negócios: https://images.unsplash.com/photo-1486312338219-ce68e2c6b33d?w=800&h=400&fit=crop
  * Tecnologia: https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop
  * Pessoas: https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face
  * Produtos: https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop
  * Aleatórias: https://picsum.photos/400/300?random=1 (mude o número para variedade)

💼 **PADRÕES PROFISSIONAIS:**
- Estrutura semântica HTML5
- Acessibilidade básica (alt texts, aria-labels)
- Código React limpo e organizado
- Estados gerenciados adequadamente
- Comentários explicativos quando necessário
- Performance otimizada

📝 **REGRAS DE IMPLEMENTAÇÃO DE IMAGENS:**
- SEMPRE adicione tags <img> com props src, alt e style
- Exemplo: <img src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop" alt="Espaço de trabalho profissional" style={{width: '100%', height: '256px', objectFit: 'cover', borderRadius: '8px'}} />
- Para seções de destaque: Use imagens de 1200x600 ou 800x400
- Para cards/recursos: Use imagens de 400x300 ou 300x200
- Para avatares/perfis: Use 200x200 com crop=face
- SEMPRE inclua texto alt significativo para acessibilidade

🎯 **EXEMPLOS DE ELEMENTOS:**
- Hero sections impactantes
- Call-to-action persuasivos
- Grids de features/serviços
- Testimonials/depoimentos
- Pricing tables elegantes
- Contact forms funcionais

⚡ **REQUISITOS DO COMPONENTE:**
- NÃO inclua nenhum import (sem "import React from 'react';" ou qualquer outro import)
- NÃO adicione declarações de import no topo
- Comece diretamente com a função do componente
- Termine com render(<NomeDoComponente />)
- Faça código elaborado e profissional
- Responda em português
- DEVE incluir imagens funcionais - isso não é opcional

Regras técnicas:
- Crie um componente React funcional completo
- Use useState para interatividade quando necessário
- Use render(<Component />) no final
- Código limpo, comentado e profissional
- Responda apenas com JSON válido`;
        default:
          return basePrompt;
      }
};

/**
 * @swagger
 * /api/agentic:
 *   post:
 *     summary: AI-powered code editing and generation
 *     description: Perform structured code editing, focusing, or generation using AI with credit-based access
 *     tags: [AI Code Editing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - actionType
 *               - userId
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The user's request for code modification or generation
 *                 example: "Add a button that increments a counter"
 *               actionType:
 *                 type: string
 *                 enum: [EDITAR, FOCAR, GERAR]
 *                 description: Type of action to perform
 *                 example: "EDITAR"
 *               currentCode:
 *                 type: string
 *                 description: Current code to modify (required for EDITAR and FOCAR)
 *                 example: "const App = () => { return <div>Hello</div>; };"
 *               fileName:
 *                 type: string
 *                 description: Name of the file being edited (required for EDITAR and FOCAR)
 *                 example: "App.jsx"
 *               userId:
 *                 type: string
 *                 description: User's unique ID for credit verification
 *                 example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *     responses:
 *       200:
 *         description: AI response stream with structured code changes
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Streaming response with JSON-formatted code changes
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields: prompt, actionType"
 *       402:
 *         description: Insufficient credits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Insufficient credits"
 *                 explanation:
 *                   type: string
 *                   example: "Você não tem créditos suficientes. Por favor, recarregue para continuar usando o serviço."
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.post('/api/agentic', creditCheckMiddleware, async (req, res) => {
  console.log('[AGENTIC-STRUCTURED] Microservice endpoint hit after credit check.');
  try {
    const { prompt, currentCode, fileName, actionType, verifiedUserId } = req.body;
    console.log(`[AGENTIC-STRUCTURED] Request body parsed. actionType: ${actionType}, verifiedUserId: ${verifiedUserId}`);

    // Smart validation: Check for fields required by all types first.
    if (!prompt || !actionType) {
        return res.status(400).json({ error: 'Missing required fields: prompt, actionType' });
    }

    // Conditional validation: Check for fields only needed for specific actions.
    if (actionType !== 'GERAR' && actionType !== 'CHAT' && (!currentCode || !fileName)) {
        return res.status(400).json({ error: `Missing required fields for actionType ${actionType}: currentCode, fileName` });
    }

    let systemPrompt = getSystemPrompt(actionType || 'EDITAR');
    let userPrompt;

    if (actionType === 'GERAR') {
      userPrompt = `Crie um componente react: ${prompt}`;
    } else {
      const codeStructure = parseCodeToStructuredFormat(currentCode);
      const structuredCodeDisplay = JSON.stringify(codeStructure, null, 2);
      userPrompt = `ARQUIVO: ${fileName}

ESTRUTURA DO CÓDIGO COM MAPEAMENTO DE LINHAS:
${structuredCodeDisplay}

SOLICITAÇÃO DO USUÁRIO: ${prompt}

INSTRUÇÕES:
1. Use o mapeamento estruturado do código acima para entender o que está em cada linha.
2. Faça APENAS a mudança mínima solicitada.
3. Retorne JSON com as mudanças mínimas.
SEMPRE responda em português brasileiro.`;
    }
    
    const result = await streamText({
      model: openrouter('anthropic/claude-sonnet-4'),
      system: systemPrompt && systemPrompt.trim() ? systemPrompt : undefined,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.7,
      maxTokens: 8000,
    });

    // Reverting to a streaming response, with added logging.
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    console.log('[AGENTIC-STRUCTURED] AI stream received. Streaming response back to BFF...');
    
    let chunkCount = 0;
    for await (const chunk of result.textStream) {
        chunkCount++;
        if (chunkCount === 1) {
            console.log('[AGENTIC-STRUCTURED] Writing first chunk...');
        }
        res.write(chunk);
    }

    if (chunkCount > 0) {
        console.log(`[AGENTIC-STRUCTURED] Finished streaming ${chunkCount} chunks.`);
    } else {
        console.warn('[AGENTIC-STRUCTURED] AI stream was empty. No chunks were sent.');
    }

    res.end();

  } catch (error) {
    console.error('[AGENTIC-STRUCTURED] Error in microservice:', error);
    // Ensure we don't try to stream a response if headers are already sent
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
    } else {
        res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`[AGENTIC-STRUCTURED] Microservice listening on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
}); 