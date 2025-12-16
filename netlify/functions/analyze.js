import { randomUUID } from 'node:crypto';

const extractOutputText = (payload) => {
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

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return json(500, {
      error: 'Missing OPENAI_API_KEY',
      message:
        'Netlify 사이트 설정에서 Environment variables에 OPENAI_API_KEY를 추가한 뒤 재배포해 주세요.',
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const imageDataUrl = body?.imageDataUrl;
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return json(400, { error: '`imageDataUrl` is required (data URL)' });
  }

  const resolvedModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

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
  };

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

  try {
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
      const status = openaiRes.status || 502;
      const message =
        payloadError?.message ?? openaiRes.statusText ?? 'OpenAI service에서 에러를 반환했습니다.';

      return json(status, {
        error: 'OpenAI request failed',
        status,
        message,
        details: openaiPayload,
        invalidApiKey:
          openaiRes.status === 401 ||
          payloadError?.type === 'invalid_api_key' ||
          payloadError?.code === 'invalid_api_key',
      });
    }

    const text = extractOutputText(openaiPayload);
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json(502, { error: 'Failed to parse model JSON output', raw: text });
    }

    const probability =
      typeof parsed.probability === 'number'
        ? Math.max(0, Math.min(1, parsed.probability))
        : 0;

    return json(200, {
      id: randomUUID(),
      finding: String(parsed.finding ?? ''),
      probability,
      severity:
        parsed.severity === 'High' || parsed.severity === 'Medium' || parsed.severity === 'Low'
          ? parsed.severity
          : 'Low',
      boundingBoxes: Array.isArray(parsed.boundingBoxes) ? parsed.boundingBoxes : [],
      analysisDate: new Date().toISOString(),
      modality: 'X-RAY/IMG',
      patientId: `ANON-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    });
  } catch (error) {
    return json(500, { error: 'Analyze failed', message: error?.message || String(error) });
  }
};

