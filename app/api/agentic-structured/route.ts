import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

interface CodeChange {
  type: 'insert' | 'replace' | 'delete';
  startLine: number;
  endLine?: number;
  code: string;
  description: string;
}

interface StructuredResponse {
  changes: CodeChange[];
  explanation: string;
}

// Parse code into structured format with line information
function parseCodeToStructuredFormat(code: string) {
  const lines = code.split('\n');
  const structure: any[] = [];
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    const indentation = line.length - line.trimLeft().length;
    
    // Identify different types of code elements
    let elementType = 'unknown';
    let content = trimmedLine;
    let key = null;
    let value = null;
    
    if (trimmedLine === '') {
      elementType = 'empty';
    } else if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      elementType = 'comment';
    } else if (trimmedLine.includes(':') && !trimmedLine.includes('(') && !trimmedLine.includes('function')) {
      // Likely a property/value pair
      elementType = 'property';
      const colonIndex = trimmedLine.indexOf(':');
      key = trimmedLine.substring(0, colonIndex).trim().replace(/['"]/g, '');
      value = trimmedLine.substring(colonIndex + 1).trim().replace(/,$/, '');
    } else if (trimmedLine.includes('=') && !trimmedLine.includes('==') && !trimmedLine.includes('===')) {
      // Variable assignment
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

export async function POST(req: NextRequest) {
  console.log('[AGENTIC-STRUCTURED] API route started.');
  try {
    // Verify API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('[AGENTIC-STRUCTURED] OPENROUTER_API_KEY is not defined.');
      throw new Error('OPENROUTER_API_KEY não está definida nas variáveis de ambiente');
    }

    const { prompt, currentCode, fileName, actionType } = await req.json();
    console.log(`[AGENTIC-STRUCTURED] Request body parsed. actionType: ${actionType}`);

    // Create OpenRouter client using OpenAI-compatible API
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    // Determine system prompt based on action type
    const getSystemPrompt = (actionType: string) => {
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

🚫 **NUNCA USE SINTAXE VERBOSE DE REACT 18:**
- NUNCA use: const container = document.getElementById('root');
- NUNCA use: const root = ReactDOM.createRoot(container);
- NUNCA use: root.render(<App />);
- SEMPRE use APENAS: render(<App />)

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

🚫 **NUNCA USE SINTAXE VERBOSE DE REACT 18:**
- NUNCA use: const container = document.getElementById('root');
- NUNCA use: const root = ReactDOM.createRoot(container);
- NUNCA use: root.render(<App />);
- SEMPRE use APENAS: render(<App />)

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
- Responda apenas com JSON válido

🎨 **VISUAL REQUIREMENTS - CSS-IN-JS ONLY:**
- Use CSS-in-JS with style props for styling (NO Tailwind CSS)
- Include gradients, shadows, and modern design with inline styles
- Add hover effects and transitions using CSS-in-JS
- Make it responsive and professional using CSS media queries
- Use proper spacing and typography with CSS properties

💡 **CSS-IN-JS EXAMPLES:**
- Gradients: background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
- Shadows: boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
- Flexbox: display: 'flex', justifyContent: 'center', alignItems: 'center'
- Spacing: padding: '2rem', margin: '1rem 0'
- Typography: fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937'
- Borders: borderRadius: '12px', border: '1px solid #e5e7eb'
- Hover effects: Use onMouseEnter/onMouseLeave with state for hover styles

Return JSON format:
{
  "changes": [{"type": "replace", "startLine": 1, "endLine": 999, "code": "your React code here", "description": "Generated component"}],
  "explanation": "Component created"
}`;

        case 'FIX':
          return `${basePrompt}

⚠️ MODO CORREÇÃO AVANÇADA:

**Para erros específicos mencionados:**
- Corrija APENAS o erro específico mencionado
- Para erros de sintaxe (SyntaxError): procure por parênteses, chaves, colchetes não fechados, vírgulas ausentes, ponto e vírgula ausentes
- Para "Unexpected token, expected ';'": adicione ponto e vírgula onde necessário
- Para "Unexpected token": verifique sintaxe de objetos, arrays, funções

**Para análise geral do código, detecte e corrija:**

🔍 **PROBLEMAS DE LÓGICA:**
- Código inalcançável (unreachable code) - código após return, break, continue
- Variáveis declaradas mas nunca usadas
- Funções definidas mas nunca chamadas
- Condições sempre verdadeiras ou sempre falsas
- Loops que nunca executam ou executam infinitamente
- Múltiplos returns consecutivos

🔍 **PROBLEMAS DE SINTAXE:**
- Objetos malformados (propriedades sem vírgula, chaves não fechadas)
- Arrays malformados
- Funções malformadas
- Parênteses, chaves, colchetes não balanceados

🔍 **PROBLEMAS DE REACT:**
- useEffect sem array de dependências quando necessário
- useState usado fora de componente
- Componentes que não retornam JSX válido
- Hooks condicionais
- render() com sintaxe verbosa - simplifique para render(<Component />) sem document.getElementById

🔍 **PROBLEMAS DE JAVASCRIPT:**
- Variáveis não declaradas sendo usadas
- Comparações com == ao invés de ===
- Tentativa de usar métodos em null/undefined

**REGRAS IMPORTANTES:**
- Faça mudanças mínimas para resolver problemas
- REMOVA código completamente inalcançável
- Preserve a estrutura e lógica existente
- NÃO adicione imports desnecessários
- NÃO adicione código que não estava presente
- Se não encontrar problemas, retorne array vazio de mudanças

**REGRA ESPECIAL PARA RENDER:**
- SEMPRE simplifique render(<Component />, document.getElementById('root')) para render(<Component />)
- SEMPRE use a sintaxe curta render(<Component />) no final do código
- REMOVA qualquer referência a document.getElementById('root') ou elementos DOM específicos`;

        case 'CHAT':
          return `Você é um assistente de programação útil. Responda de forma conversacional à pergunta do usuário sobre seu código.

Você deve responder com JSON válido neste formato exato:

{
  "changes": [],
  "explanation": "sua resposta conversacional à pergunta do usuário"
}

⚠️ MODO CHAT:
- NÃO faça mudanças no código (o array changes deve estar vazio)
- Forneça respostas úteis e conversacionais
- Responda perguntas sobre o código
- Explique conceitos, sugira melhorias ou discuta abordagens
- Seja amigável e educativo
- Foque em explicar ao invés de alterar código
- SEMPRE responda em português brasileiro`;

        default:
          return `${basePrompt}

⚠️ MODO EDITAR:
- Faça APENAS as mudanças exatas solicitadas
- Identifique CUIDADOSAMENTE os números de linha corretos
- Não gere código novo não relacionado
- Faça as menores mudanças possíveis
- Foque em precisão cirúrgica`;
      }
    };

    let systemPrompt;
    let userPrompt;
    
    if (actionType === 'GERAR') {
      // For GERAR, no system prompt needed - just direct generation
      systemPrompt = '';
      userPrompt = `Create a React component: ${prompt}

🚨 **MANDATORY REQUIREMENTS:**

🚫 **NEVER USE VERBOSE REACT 18 SYNTAX:**
- NEVER use: const container = document.getElementById('root');
- NEVER use: const root = ReactDOM.createRoot(container);
- NEVER use: root.render(<App />);
- ALWAYS use ONLY: render(<App />)

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

🎨 **VISUAL REQUIREMENTS - CSS-IN-JS ONLY:**
- Use CSS-in-JS with style props for styling (NO Tailwind CSS)
- Include gradients, shadows, and modern design with inline styles
- Add hover effects and transitions using CSS-in-JS
- Make it responsive and professional using CSS media queries
- Use proper spacing and typography with CSS properties

💡 **CSS-IN-JS EXAMPLES:**
- Gradients: background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
- Shadows: boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
- Flexbox: display: 'flex', justifyContent: 'center', alignItems: 'center'
- Spacing: padding: '2rem', margin: '1rem 0'
- Typography: fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937'
- Borders: borderRadius: '12px', border: '1px solid #e5e7eb'
- Hover effects: Use onMouseEnter/onMouseLeave with state for hover styles

Return JSON format:
{
  "changes": [{"type": "replace", "startLine": 1, "endLine": 999, "code": "your React code here", "description": "Generated component"}],
  "explanation": "Component created"
}`;
    } else {
      systemPrompt = getSystemPrompt(actionType || 'EDITAR');
      // Parse code into structured format with line information for other actions
      const codeStructure = parseCodeToStructuredFormat(currentCode);
      const structuredCodeDisplay = JSON.stringify(codeStructure, null, 2);

      userPrompt = `ARQUIVO: ${fileName}

ESTRUTURA DO CÓDIGO COM MAPEAMENTO DE LINHAS:
${structuredCodeDisplay}

SOLICITAÇÃO DO USUÁRIO: ${prompt}

${actionType === 'FIX' ? `
🔧 MODO CORREÇÃO ATIVO:
- Este é um erro de sintaxe que precisa ser corrigido
- Analise cuidadosamente a linha mencionada no erro
- Procure por problemas de sintaxe comuns: parênteses não fechados, vírgulas ausentes, ponto e vírgula ausente
- Se o erro menciona linha 87, foque na linha 87 e linhas próximas (86, 87, 88)
` : ''}

INSTRUÇÕES:
1. Use o mapeamento estruturado do código acima para entender o que está em cada linha
2. ${actionType === 'FIX' ? 'Foque na linha específica mencionada no erro e linhas adjacentes' : 'Procure por propriedades com pares chave/valor que correspondam à solicitação do usuário'}
3. Identifique o número EXATO da linha que contém o que precisa ser alterado
4. Faça APENAS a mudança mínima solicitada
5. Use o campo "originalLine" para ver a formatação exata e preservá-la

O formato estruturado mostra:
- "line": o número da linha (baseado em 1)
- "type": que tipo de elemento de código é (propriedade, atribuição, etc.)
- "key": o nome da propriedade (se for um par chave-valor)
- "value": o valor da propriedade (se for um par chave-valor)
- "originalLine": o conteúdo exato da linha original com formatação
- "indentation": número de espaços para formatação adequada

Faça APENAS as mudanças exatas necessárias para esta solicitação. Retorne JSON com as mudanças mínimas.
SEMPRE responda em português brasileiro.`;
    }

    // Use streaming for all requests to prevent timeouts
    const streamOptions: any = {
      model: openrouter('anthropic/claude-sonnet-4'),
      system: systemPrompt && systemPrompt.trim() ? systemPrompt : undefined,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.7,
    };

    console.log(`[AGENTIC-STRUCTURED] Calling streamText with model anthropic/claude-sonnet-4`);
    console.log(`[AGENTIC-STRUCTURED] Stream options:`, {
      model: 'anthropic/claude-sonnet-4',
      hasSystemPrompt: !!(systemPrompt && systemPrompt.trim()),
      userPromptLength: userPrompt.length,
      temperature: 0.7
    });

    const result = streamText(streamOptions);
    console.log('[AGENTIC-STRUCTURED] streamText returned. Setting up stream logging...');

    // Create a custom stream with optimized logging
    let chunkCount = 0;
    let totalLength = 0;
    const startTime = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        console.log('[AGENTIC-STRUCTURED] Stream started');
        
        try {
          // Get the original response
          const response = await result.toDataStreamResponse();
          const reader = response.body?.getReader();
          
          if (!reader) {
            console.error('[AGENTIC-STRUCTURED] No reader available from response');
            controller.close();
            return;
          }

          console.log('[AGENTIC-STRUCTURED] Starting to read stream chunks...');
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              const endTime = Date.now();
              const duration = endTime - startTime;
              console.log(`[AGENTIC-STRUCTURED] Stream completed: ${chunkCount} chunks, ${totalLength} bytes, ${duration}ms`);
              controller.close();
              break;
            }

            chunkCount++;
            totalLength += value.length;
            
            // Log only every 20th chunk to reduce performance impact
            if (chunkCount % 20 === 0) {
              console.log(`[AGENTIC-STRUCTURED] Progress: ${chunkCount} chunks processed, ${totalLength} bytes total`);
            }
            
            // Forward the chunk
            controller.enqueue(value);
          }
        } catch (error) {
          console.error('[AGENTIC-STRUCTURED] Stream error:', error);
          console.error('[AGENTIC-STRUCTURED] Error context:', {
            message: error.message,
            chunkCount,
            totalLength
          });
          controller.error(error);
        }
      }
    });

    console.log('[AGENTIC-STRUCTURED] Returning custom logged stream response');
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1'
      }
    });
  } catch (error) {
    console.error('[AGENTIC-STRUCTURED] Erro da API estruturada:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Falha ao processar solicitação de código estruturada';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 