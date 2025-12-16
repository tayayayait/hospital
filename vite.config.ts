import path from 'path';
import { randomUUID } from 'node:crypto';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

type AnalyzeRequestBody = {
  imageDataUrl?: string;
  fileName?: string;
};

const readJsonBody = async (req: import('http').IncomingMessage): Promise<AnalyzeRequestBody> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as AnalyzeRequestBody;
};

const extractOutputText = (payload: any): string => {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const output = payload?.output;
  if (!Array.isArray(output)) return '';
  for (const item of output) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = part?.text;
      if (typeof text === 'string' && text.trim()) return text;
    }
  }
  return '';
};

const openAIAnalyzeProxy = (apiKey?: string, model?: string): Plugin => {
  const route = '/api/analyze';
  const resolvedModel = model?.trim() || 'gpt-4o-mini';

  const handler = async (req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    if (!apiKey?.trim()) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Missing OPENAI_API_KEY in .env.local' }));
      return;
    }

    let body: AnalyzeRequestBody;
    try {
      body = await readJsonBody(req);
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    const imageDataUrl = body.imageDataUrl;
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: '`imageDataUrl` is required' }));
      return;
    }

    try {
      const schema = {
        name: 'analysis_result',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            finding: { type: 'string' },
            probability: { type: 'number', minimum: 0, maximum: 1 },
            severity: { type: 'string', enum: ['Low', 'Medium', 'High'] },
            boundingBoxes: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  x: { type: 'number', minimum: 0, maximum: 1 },
                  y: { type: 'number', minimum: 0, maximum: 1 },
                  width: { type: 'number', minimum: 0, maximum: 1 },
                  height: { type: 'number', minimum: 0, maximum: 1 },
                  label: { type: 'string' },
                },
                required: ['x', 'y', 'width', 'height', 'label'],
              },
            },
          },
          required: ['finding', 'probability', 'severity', 'boundingBoxes'],
        },
        strict: true,
      } as const;

      const systemPrompt =
        '당신은 의료 영상(연구/참고용) 분석 보조자입니다. 확정 진단을 내리지 마세요. ' +
        '출력의 모든 텍스트(finding, label 등)는 한국어로 작성하세요. ' +
        '반드시 제공된 JSON Schema에 정확히 맞는 유효한 JSON만 반환하세요. ' +
        'severity 값은 반드시 Low/Medium/High 중 하나로만 반환하세요. ' +
        '소견을 특정할 수 없으면 boundingBoxes는 빈 배열([])로 반환하세요.';

      const userPrompt =
        '이 이미지를 분석하고, 주요 소견(finding)을 1문장으로 한국어로 작성해 주세요. ' +
        'probability(0~1), severity(Low/Medium/High), 그리고 가능하다면 의심 부위의 boundingBoxes(정규화 좌표 0~1)를 함께 반환하세요. ' +
        '확정 진단이 아닌 참고/연구 목적의 표현을 사용하세요.';

      const openaiRes = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: resolvedModel,
          temperature: 0.2,
          text: {
            format: {
              type: 'json_schema',
              name: schema.name,
              schema: schema.schema,
              strict: schema.strict,
            },
          },
          input: [
            {
              role: 'system',
              content: [{ type: 'input_text', text: systemPrompt }],
            },
            {
              role: 'user',
              content: [
                { type: 'input_text', text: userPrompt },
                { type: 'input_image', image_url: imageDataUrl },
              ],
            },
          ],
        }),
      });

      const openaiPayload = await openaiRes.json().catch(() => null);
      if (!openaiRes.ok) {
        const payloadError = openaiPayload?.error;
        const statusCode = openaiRes.status || 502;
        const message =
          payloadError?.message ??
          openaiRes.statusText ??
          'OpenAI service에서 에러를 반환했습니다.';

        res.statusCode = statusCode;
        res.end(
          JSON.stringify({
            error: 'OpenAI request failed',
            status: statusCode,
            message,
            details: openaiPayload,
            invalidApiKey:
              openaiRes.status === 401 ||
              payloadError?.type === 'invalid_api_key' ||
              payloadError?.code === 'invalid_api_key',
          })
        );
        return;
      }

      const text = extractOutputText(openaiPayload);
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        res.statusCode = 502;
        res.end(JSON.stringify({ error: 'Failed to parse model JSON output', raw: text }));
        return;
      }

      const now = new Date().toISOString();
      const probability =
        typeof parsed.probability === 'number'
          ? Math.max(0, Math.min(1, parsed.probability))
          : 0;

      const result = {
        id: randomUUID(),
        finding: String(parsed.finding ?? ''),
        probability,
        severity: parsed.severity === 'High' || parsed.severity === 'Medium' || parsed.severity === 'Low' ? parsed.severity : 'Low',
        boundingBoxes: Array.isArray(parsed.boundingBoxes) ? parsed.boundingBoxes : [],
        analysisDate: now,
        modality: 'X-RAY/IMG',
        patientId: `ANON-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      };

      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (error: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Analyze failed', message: error?.message || String(error) }));
    }
  };

  return {
    name: 'openai-analyze-proxy',
    configureServer(server) {
      server.middlewares.use(route, (req, res) => {
        void handler(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(route, (req, res) => {
        void handler(req, res);
      });
    },
  };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), openAIAnalyzeProxy(env.OPENAI_API_KEY, env.OPENAI_MODEL)],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
