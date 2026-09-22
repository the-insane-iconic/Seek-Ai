import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';

function aiProxyPlugin(): Plugin {
  return {
    name: 'ai-proxy',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        // Route 1: Speech-to-text proxy
        if (req.url === '/api/transcribe' && req.method === 'POST') {
          const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;

          if (!apiKey) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              code: 'NO_API_KEY',
              message: 'No backend API key configured. Client falling back to local on-device transcription engine.'
            }));
            return;
          }

          // Read incoming multipart body
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          req.on('end', async () => {
            try {
              const fullBuffer = Buffer.concat(chunks);
              const contentType = req.headers['content-type'] || 'multipart/form-data';

              const isGroq = !!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY;
              const targetUrl = isGroq 
                ? 'https://api.groq.com/openai/v1/audio/transcriptions'
                : 'https://api.openai.com/v1/audio/transcriptions';

              const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': contentType,
                },
                body: fullBuffer
              });

              const resultText = await response.text();
              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(resultText);
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                code: 'PROXY_ERROR',
                message: err.message || 'Error forwarding to speech-to-text API'
              }));
            }
          });
          return;
        }

        // Route 2: Structured memory extraction proxy
        if (req.url === '/api/extract-memory' && req.method === 'POST') {
          const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;

          if (!apiKey) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              code: 'NO_API_KEY',
              message: 'No backend API key configured. Client falling back to local on-device intelligence engine.'
            }));
            return;
          }

          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          req.on('end', async () => {
            try {
              const bodyStr = Buffer.concat(chunks).toString('utf-8');
              const { transcriptText, segments } = JSON.parse(bodyStr);

              const isGroq = !!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY;
              const targetUrl = isGroq
                ? 'https://api.groq.com/openai/v1/chat/completions'
                : 'https://api.openai.com/v1/chat/completions';

              const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

              const systemPrompt = `You are a factual personal memory extraction system.
Extract structured information from the provided transcript into a JSON object.

CRITICAL RULES:
1. Extract ONLY facts, decisions, tasks, people, and topics explicitly present in the conversation.
2. Do NOT invent conclusions, priorities, or categories.
3. If a category is not present in the conversation, return an empty array [].
4. For tasks, extract the exact task, assignee (if explicitly named), and deadline (if explicitly named). Set completed to false.
5. For each extracted item, identify the approximate sourceTimestampMs from the provided segment timestamps.

SCHEMA:
{
  "summary": { "oneLiner": string, "keyTakeaways": string[] },
  "people": [{ "id": string, "name": string, "role": string, "mentionCount": number, "sourceTimestampMs": number }],
  "topics": [{ "id": string, "name": string }],
  "keyPoints": [{ "id": string, "point": string, "sourceTimestampMs": number }],
  "questions": [{ "id": string, "question": string, "status": "open" | "answered", "answer": string, "sourceTimestampMs": number }],
  "ideas": [{ "id": string, "idea": string, "sourceTimestampMs": number }],
  "decisions": [{ "id": string, "decision": string, "context": string, "sourceTimestampMs": number }],
  "tasks": [{ "id": string, "task": string, "assignee": string, "dueDate": string, "completed": false, "sourceTimestampMs": number }],
  "commitments": [{ "id": string, "commitment": string, "fromPerson": string, "toPerson": string, "sourceTimestampMs": number }],
  "dates": [{ "id": string, "date": string, "description": string, "sourceTimestampMs": number }],
  "events": [{ "id": string, "title": string, "dateOrTime": string, "location": string, "sourceTimestampMs": number }],
  "facts": [{ "id": string, "fact": string, "category": string, "sourceTimestampMs": number }]
}`;

              const userContent = JSON.stringify({
                transcript: transcriptText,
                segments: segments.slice(0, 50).map((s: any) => ({ startMs: s.startTimeMs, text: s.text }))
              });

              const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                  ],
                  response_format: { type: 'json_object' },
                  temperature: 0.2
                })
              });

              const resultJson: any = await response.json();
              if (resultJson.choices && resultJson.choices[0]?.message?.content) {
                const parsedContent = JSON.parse(resultJson.choices[0].message.content);
                parsedContent.modelUsed = model;
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(parsedContent));
              } else {
                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(resultJson));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                code: 'EXTRACTION_PROXY_ERROR',
                message: err.message || 'Error executing AI extraction model'
              }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), aiProxyPlugin()],
  server: {
    port: 3000,
    host: true
  }
});
