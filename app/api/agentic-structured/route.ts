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

⚡ DIRETRIZES PARA SITES PROFISSIONAIS:

🎨 **VISUAIS ESPLÊNDIDOS:**
- Use gradientes modernos (ex: bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500)
- Aplique sombras elegantes (ex: shadow-xl, shadow-2xl)
- Cores harmônicas e profissionais
- Tipografia moderna e hierárquica
- Layout responsivo com grid/flexbox
- Espaçamento generoso e equilibrado

✨ **ANIMAÇÕES E INTERATIVIDADE:**
- Hover effects suaves (ex: hover:scale-105, hover:shadow-2xl)
- Transições fluidas (ex: transition-all duration-300 ease-in-out)
- Transforms para interações (rotate, scale, translate)
- Animações CSS ou keyframes quando apropriado
- Estados visuais claros para botões e links

🚀 **FUNCIONALIDADES PRONTAS:**
- Navegação funcional entre seções
- Formulários com validação visual
- Botões com estados (loading, success, error)
- Cards informativos bem estruturados
- Seções organizadas (header, hero, features, footer)
- Componentes reutilizáveis e modulares

💼 **PADRÕES PROFISSIONAIS:**
- Estrutura semântica HTML5
- Acessibilidade básica (alt texts, aria-labels)
- Código React limpo e organizado
- Estados gerenciados adequadamente
- Comentários explicativos quando necessário
- Performance otimizada

🎯 **EXEMPLOS DE ELEMENTOS:**
- Hero sections impactantes
- Call-to-action persuasivos
- Grids de features/serviços
- Testimonials/depoimentos
- Pricing tables elegantes
- Contact forms funcionais

Regras técnicas:
- Crie um componente React funcional completo
- Use useState para interatividade quando necessário
- Use render(<Component />) no final
- Código limpo, comentado e profissional
- Responda apenas com JSON válido

Regras: Componente funcional completo + render(<Component />) no final + apenas JSON válido.`;

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

IMPORTANT RULES:
- DO NOT include any imports (no "import React from 'react';" or any other imports)
- DO NOT add import statements at the top
- Start directly with the component function
- End with render(<ComponentName />)
- Make elaborated code
- Answer in portuguese

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
    const result = streamText(streamOptions);
    console.log('[AGENTIC-STRUCTURED] streamText returned. Returning data stream response.');

    return result.toDataStreamResponse();
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