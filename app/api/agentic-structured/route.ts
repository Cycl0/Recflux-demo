import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// In-memory store for tracking active code generation requests (prevent duplicates)
const activeGenerations = new Map<string, {
  generationId: string;
  startTime: number;
  userId: string;
  actionType: string;
  prompt: string;
}>();

// Periodic cleanup of stale generation requests (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 10 * 60 * 1000; // 10 minutes
  let cleaned = 0;

  activeGenerations.forEach((generation, hash) => {
    if (now - generation.startTime > staleThreshold) {
      activeGenerations.delete(hash);
      cleaned++;
      console.log(`[AGENTIC-DIRECT] [CLEANUP] Removed stale generation: ${generation.generationId} (age: ${Math.round((now - generation.startTime) / 1000)}s)`);
    }
  });

  if (cleaned > 0) {
    console.log(`[AGENTIC-DIRECT] [CLEANUP] Cleaned up ${cleaned} stale generation(s). Active: ${activeGenerations.size}`);
  }
}, 5 * 60 * 1000);

/**
 * Enhanced logging function
 */
function logInfo(message: string, data?: any) {
  console.log(`[AGENTIC-DIRECT] ${message}`, data ? data : '');
}

function logError(message: string, error?: any) {
  console.error(`[AGENTIC-DIRECT] ${message}`, error ? (error.stack || error) : '');
}

/**
 * Extracts a clean JSON string from text that may be wrapped in markdown.
 * @param text The raw response text from the microservice.
 * @returns A clean JSON string or null if no valid JSON is found.
 */
function extractJson(text: string): string | null {
  // First, try to find a JSON block wrapped in ```json
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      // Validate that the extracted part is valid JSON before returning
      JSON.parse(jsonMatch[1]);
      return jsonMatch[1].trim();
    } catch {
      // Invalid JSON, fall through to the next check.
    }
  }

  // If not found or invalid, try to find a raw JSON object in the text
  const rawJsonMatch = text.match(/{[\s\S]*}/);
  if (rawJsonMatch && rawJsonMatch[0]) {
    try {
      // Validate this fallback match as well
      JSON.parse(rawJsonMatch[0]);
      return rawJsonMatch[0].trim();
    } catch {
      // Not valid JSON.
    }
  }

  // If no valid JSON is found anywhere, return null.
  return null;
}

/**
 * Parse code into structured format with line numbers and metadata
 */
function parseCodeToStructuredFormat(code: string) {
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

/**
 * Get system prompt based on action type
 */
function getSystemPrompt(actionType: string) {
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
}

/**
 * Check and deduct credits directly (no middleware to avoid double body read)
 */
const checkAndDeductCredits = async (userId: string): Promise<{ success: boolean; userId?: string; error?: string; errorStatus?: number; explanation?: string }> => {
  try {
    if (!userId) {
      return { success: false, error: 'userId is required', errorStatus: 400 };
    }

    logInfo(`Checking credits with userId: ${userId}`);

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: 'Database configuration missing', errorStatus: 500 };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the user by ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, credits, plan')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logError('Error fetching user by ID:', userError);
      return { success: false, error: 'User not found', errorStatus: 404 };
    }

    logInfo(`User found: ID=${user.id}, Credits=${user.credits}, Plan=${user.plan}`);

    // Check if user has enough credits
    if (user.credits < 10) {
      logInfo(`Insufficient credits: ${user.credits} (needed: 10)`);
      return {
        success: false,
        error: 'Insufficient credits',
        explanation: 'Você não tem créditos suficientes. Por favor, recarregue para continuar usando o serviço.',
        errorStatus: 402
      };
    }

    // Deduct ten credits
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: user.credits - 10 })
      .eq('id', user.id);

    if (updateError) {
      logError('Error updating credits:', updateError);
      return { success: false, error: 'Failed to update user credits', errorStatus: 500 };
    }

    logInfo(`Credit deduction successful for user ID: ${user.id}. Credits before: ${user.credits}, After: ${user.credits - 10}`);
    return { success: true, userId: user.id };

  } catch (error) {
    logError('Unexpected error in credit check:', error);
    return { success: false, error: 'Internal server error during credit check', errorStatus: 500 };
  }
};

/**
 * Main API endpoint for agentic structured processing
 */
export async function POST(req: NextRequest) {
  logInfo('Agentic structured endpoint hit directly');

  // Declare requestHash at function level to ensure it's always in scope
  let requestHash: string | undefined;

  try {
    // Parse request body only ONCE to avoid stream issues
    const body = await req.json();
    const { prompt, currentCode, fileName, actionType, userId } = body;

    // First, check credits and get verified user ID
    const creditResult = await checkAndDeductCredits(userId);

    if (!creditResult.success) {
      const errorResponse: any = {
        error: creditResult.error
      };

      if (creditResult.explanation) {
        errorResponse.explanation = creditResult.explanation;
      }

      return new NextResponse(JSON.stringify(errorResponse), {
        status: creditResult.errorStatus || 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const verifiedUserId = creditResult.userId!;

    logInfo(`Request parsed. actionType: ${actionType}, verifiedUserId: ${verifiedUserId}`);
    logInfo(`fileName: ${fileName}, promptLength: ${prompt?.length || 0}, codeLength: ${currentCode?.length || 0}`);

    // Smart validation
    if (!prompt || !actionType) {
      logError('Validation error: Missing required fields');
      return new NextResponse(JSON.stringify({
        error: 'Missing required fields: prompt, actionType',
        details: {
          promptPresent: !!prompt,
          actionTypePresent: !!actionType
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Conditional validation for specific actions
    if (actionType !== 'GERAR' && actionType !== 'CHAT' && (!currentCode || !fileName)) {
      logError(`Validation error: Missing required fields for actionType ${actionType}`);
      return new NextResponse(JSON.stringify({
        error: `Missing required fields for actionType ${actionType}: currentCode, fileName`,
        details: {
          currentCodePresent: !!currentCode,
          fileNamePresent: !!fileName
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create a hash of the request to detect duplicate requests
    const requestData = {
      prompt,
      currentCode: currentCode || '',
      fileName: fileName || '',
      actionType,
      userId: verifiedUserId
    };
    requestHash = crypto.createHash('sha256').update(JSON.stringify(requestData)).digest('hex').substring(0, 16);

    // Check if this exact request is already being processed
    if (activeGenerations.has(requestHash)) {
      const existingGeneration = activeGenerations.get(requestHash)!;
      logInfo(`Rejecting duplicate generation request for hash: ${requestHash}`);
      return new NextResponse(JSON.stringify({
        error: 'Code generation already in progress',
        details: `This exact request is already being processed (started ${new Date(existingGeneration.startTime).toISOString()})`,
        generationId: existingGeneration.generationId,
        requestHash
      }), { status: 429 });
    }

    // Create unique generation ID and track this request
    const generationId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    activeGenerations.set(requestHash, {
      generationId,
      startTime: Date.now(),
      userId: verifiedUserId,
      actionType,
      prompt: prompt.substring(0, 100) + '...' // Store truncated prompt for debugging
    });

    logInfo(`Starting code generation (hash: ${requestHash}, generationId: ${generationId})`);

    try {
      const systemPrompt = getSystemPrompt(actionType || 'EDITAR');
      let userPrompt;

      if (actionType === 'GERAR') {
        userPrompt = `Crie um componente react: ${prompt}`;
        logInfo('Using GERAR prompt template');
      } else {
        try {
          logInfo('Parsing code structure...');
          const codeStructure = parseCodeToStructuredFormat(currentCode);
          logInfo(`Code structure parsed successfully with ${codeStructure.length} lines`);
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
        } catch (parseError) {
          logError('Error parsing code structure:', parseError);
          userPrompt = `ARQUIVO: ${fileName}

CÓDIGO ORIGINAL:
${currentCode}

SOLICITAÇÃO DO USUÁRIO: ${prompt}

INSTRUÇÕES:
1. Analise o código acima.
2. Faça APENAS a mudança mínima solicitada.
3. Retorne JSON com as mudanças mínimas.
SEMPRE responda em português brasileiro.`;
          logInfo('Using fallback prompt template due to parsing error');
        }
      }

      logInfo('Preparing to call AI model...');
      logInfo(`System prompt length: ${systemPrompt?.length || 0}`);
      logInfo(`User prompt length: ${userPrompt?.length || 0}`);

      // Call AI model directly with ZAI GLM-4.6
      const aiResponse = await fetch(`${process.env.ANTHROPIC_BASE_URL || 'https://open.bigmodel.cn/api/anthropic'}/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.ZAI_API_KEY}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'glm-4.6',
          max_tokens: 8000,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        })
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        logError(`AI API error (${aiResponse.status}): ${errorText}`);
        throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
      }

      const aiResult = await aiResponse.json();
      const responseText = aiResult.content[0].text;
      const cleanJsonString = extractJson(responseText);

      if (!cleanJsonString) {
        logError('No valid JSON found in AI response', { raw: responseText });
        return new NextResponse(
          JSON.stringify({
            error: 'Failed to extract valid JSON from AI response.',
            rawResponse: responseText.substring(0, 500)
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      logInfo('Successfully extracted JSON from AI response');
      logInfo(`Generation completed successfully (generationId: ${generationId})`);

      return new NextResponse(cleanJsonString, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      logError('Error calling AI model:', aiError);
      return new NextResponse(JSON.stringify({
        error: 'AI Model Error',
        message: aiError instanceof Error ? aiError.message : 'Unknown AI error',
        timestamp: new Date().toISOString(),
        details: {
          modelProvider: 'ZAI GLM-4.6',
          errorType: aiError instanceof Error ? aiError.name : 'Unknown'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    logError('Unhandled error in agentic structured service:', error);

    if (error instanceof SyntaxError) {
      return new NextResponse(JSON.stringify({
        error: 'Invalid JSON in request body',
        details: error.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new NextResponse(JSON.stringify({
      error: 'An internal server error occurred.',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.name : 'Unknown'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    // Clean up the active generation tracking
    if (requestHash) {
      activeGenerations.delete(requestHash);
      logInfo(`Cleanup: Removed active generation tracking for hash: ${requestHash}`);
    }
  }
} 