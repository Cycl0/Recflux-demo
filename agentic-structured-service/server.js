require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { streamText } = require('ai');
const { createOpenAI } = require('@ai-sdk/openai');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const PORT = process.env.PORT || 3001;

// Verify API key exists on startup
if (!process.env.OPENROUTER_API_KEY) {
  console.error('[AGENTIC-STRUCTURED] FATAL: OPENROUTER_API_KEY is not defined in the environment variables.');
  process.exit(1); // Exit if the key is not found
}

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
🚨 **MANDATORY REQUIREMENTS:**

✨ **ANIMAÇÕES E INTERATIVIDADE:**
- Hover effects suaves com CSS-in-JS (ex: ':hover': { transform: 'scale(1.05)' })
- Transições fluidas (ex: transition: 'all 0.3s ease-in-out')
- Transforms para interações (rotate, scale, translate)
- Animações CSS ou keyframes quando apropriado
- Estados visuais claros para botões e links

🖼️ **IMAGES ARE REQUIRED - NEVER SKIP IMAGES:**
- EVERY component MUST include at least 2-3 relevant images
- Use ONLY these working image sources:
  * Hero images: https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=600&fit=crop
  * Business: https://images.unsplash.com/photo-1486312338219-ce68e2c6b33d?w=800&h=400&fit=crop
  * Technology: https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop
  * People: https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face
  * Products: https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop
  * Random: https://picsum.photos/400/300?random=1 (change number for variety)

💼 **PADRÕES PROFISSIONAIS:**
- Estrutura semântica HTML5
- Acessibilidade básica (alt texts, aria-labels)
- Código React limpo e organizado
- Estados gerenciados adequadamente
- Comentários explicativos quando necessário
- Performance otimizada
📝 **IMAGE IMPLEMENTATION RULES:**
- ALWAYS add <img> tags with src, alt, and style props
- Example: <img src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop" alt="Professional workspace" style={{width: '100%', height: '256px', objectFit: 'cover', borderRadius: '8px'}} />
- For hero sections: Use 1200x600 or 800x400 images
- For cards/features: Use 400x300 or 300x200 images  
- For avatars/profiles: Use 200x200 with crop=face
- ALWAYS include meaningful alt text for accessibility


🎯 **EXEMPLOS DE ELEMENTOS:**
- Hero sections impactantes
- Call-to-action persuasivos
- Grids de features/serviços
- Testimonials/depoimentos
- Pricing tables elegantes
- Contact forms funcionais
⚡ **COMPONENT REQUIREMENTS:**
- DO NOT include any imports (no "import React from 'react';" or any other imports)
- DO NOT add import statements at the top
- Start directly with the component function
- End with render(<ComponentName />)
- Make elaborated, professional code
- Answer in portuguese
- MUST include working images - this is not optional

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

app.post('/api/agentic', async (req, res) => {
  console.log('[AGENTIC-STRUCTURED] Microservice endpoint hit.');
  try {
    const { prompt, currentCode, fileName, actionType } = req.body;
    console.log(`[AGENTIC-STRUCTURED] Request body parsed. actionType: ${actionType}`);

    // Smart validation: Check for fields required by all types first.
    if (!prompt || !actionType) {
        return res.status(400).json({ error: 'Missing required fields: prompt, actionType' });
    }

    // Conditional validation: Check for fields only needed for specific actions.
    if (actionType !== 'GERAR' && actionType !== 'CHAT' && (!currentCode || !fileName)) {
        return res.status(400).json({ error: `Missing required fields for actionType ${actionType}: currentCode, fileName` });
    }

    let systemPrompt;
    let userPrompt;

    if (actionType === 'GERAR') {
      systemPrompt = '';
      userPrompt = `Create a React component: ${prompt}

🚨 **MANDATORY REQUIREMENTS:**

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

🖼️ **IMAGES ARE REQUIRED - NEVER SKIP IMAGES:**
- EVERY component MUST include at least 2-3 relevant images
- Use ONLY these working image sources:
  * Hero images: https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=600&fit=crop
  * Business: https://images.unsplash.com/photo-1486312338219-ce68e2c6b33d?w=800&h=400&fit=crop
  * Technology: https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=400&fit=crop
  * People: https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face
  * Products: https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop
  * Random: https://picsum.photos/400/300?random=1 (change number for variety)

📝 **IMAGE IMPLEMENTATION RULES:**
- ALWAYS add <img> tags with src, alt, and style props
- Example: <img src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop" alt="Professional workspace" style={{width: '100%', height: '256px', objectFit: 'cover', borderRadius: '8px'}} />
- For hero sections: Use 1200x600 or 800x400 images
- For cards/features: Use 400x300 or 300x200 images  
- For avatars/profiles: Use 200x200 with crop=face
- ALWAYS include meaningful alt text for accessibility

⚡ **COMPONENT REQUIREMENTS:**
- DO NOT include any imports (no "import React from 'react';" or any other imports)
- DO NOT add import statements at the top
- Start directly with the component function
- End with render(<ComponentName />)
- Make elaborated, professional code
- Answer in portuguese
- MUST include working images - this is not optional

Return JSON format:
{
  "changes": [{"type": "replace", "startLine": 1, "endLine": 999, "code": "your React code here", "description": "Generated component"}],
  "explanation": "Component created"
}`;
    } else {
      systemPrompt = getSystemPrompt(actionType || 'EDITAR');
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
}); 