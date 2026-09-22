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
2. Attribute speakers: for decisions include "madeBy" (array of names/You), for tasks include "assignedTo" and "assignedBy", for questions include "askedBy", for commitments include "fromPerson" and "toPerson".
3. Do NOT invent conclusions, priorities, or categories.
4. If a category is not present in the conversation, return an empty array [].
5. For tasks, extract the exact task, assignee (if explicitly named), and deadline (if explicitly named). Set completed to false.
6. For each extracted item, identify the approximate sourceTimestampMs from the provided segment timestamps.

SCHEMA:
{
  "summary": { "oneLiner": string, "keyTakeaways": string[] },
  "people": [{ "id": string, "name": string, "role": string, "mentionCount": number, "sourceTimestampMs": number }],
  "topics": [{ "id": string, "name": string }],
  "keyPoints": [{ "id": string, "point": string, "sourceTimestampMs": number }],
  "questions": [{ "id": string, "question": string, "askedBy": string, "status": "open" | "answered", "answer": string, "sourceTimestampMs": number }],
  "ideas": [{ "id": string, "idea": string, "proposedBy": string, "sourceTimestampMs": number }],
  "decisions": [{ "id": string, "decision": string, "madeBy": string[], "context": string, "sourceTimestampMs": number }],
  "tasks": [{ "id": string, "task": string, "assignedTo": string, "assignedBy": string, "dueDate": string, "completed": false, "sourceTimestampMs": number }],
  "commitments": [{ "id": string, "commitment": string, "fromPerson": string, "toPerson": string, "sourceTimestampMs": number }],
  "dates": [{ "id": string, "date": string, "description": string, "sourceTimestampMs": number }],
  "events": [{ "id": string, "title": string, "dateOrTime": string, "location": string, "sourceTimestampMs": number }],
  "facts": [{ "id": string, "fact": string, "category": string, "sourceTimestampMs": number }]
}`;

              const userContent = JSON.stringify({
                transcript: transcriptText,
                segments: segments.slice(0, 50).map((s: any) => ({ 
                  startMs: s.startTimeMs, 
                  speaker: s.speakerLabel || s.speakerId,
                  text: s.text 
                }))
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

        // Route 3: Conversation segmentation proxy
        if (req.url === '/api/segment-conversation' && req.method === 'POST') {
          const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
          if (!apiKey) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              code: 'NO_API_KEY',
              message: 'No backend API key configured. Client falling back to local on-device segmentation.'
            }));
            return;
          }
          // Fall back gracefully if not implemented externally
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ code: 'NO_API_KEY', message: 'Use local segmentation' }));
          return;
        }

        // Route 4: Speaker diarization proxy
        if (req.url === '/api/diarize-speakers' && req.method === 'POST') {
          const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
          if (!apiKey) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              code: 'NO_API_KEY',
              message: 'No backend API key configured. Client falling back to local on-device diarization.'
            }));
            return;
          }
          // Fall back gracefully
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ code: 'NO_API_KEY', message: 'Use local diarization' }));
          return;
        }

        // Route 5: Vector embeddings proxy
        if (req.url === '/api/embed' && req.method === 'POST') {
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ code: 'NO_API_KEY', message: 'Use local semantic vectorizer' }));
            return;
          }

          const chunks: Buffer[] = [];
          req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          req.on('end', async () => {
            try {
              const { texts } = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
              const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'text-embedding-3-small',
                  input: texts
                })
              });

              const data: any = await response.json();
              if (data.data) {
                const embeddings = data.data.map((d: any) => d.embedding);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ embeddings }));
              } else {
                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ code: 'EMBED_ERROR', message: err.message }));
            }
          });
          return;
        }

        // Route 6: Conversational Memory Assistant RAG proxy
        if (req.url === '/api/chat-memory' && req.method === 'POST') {
          const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
          if (!apiKey) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ code: 'NO_API_KEY', message: 'Use local synthesis engine' }));
            return;
          }

          const chunks: Buffer[] = [];
          req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          req.on('end', async () => {
            try {
              const { question, contextItems } = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
              const isGroq = !!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY;
              const targetUrl = isGroq
                ? 'https://api.groq.com/openai/v1/chat/completions'
                : 'https://api.openai.com/v1/chat/completions';
              const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

              const contextText = (contextItems || []).map((c: any, i: number) => 
                `[Memory ${i + 1}] Session: "${c.session}" (${c.type}): ${c.content}`
              ).join('\n\n');

              const systemPrompt = `You are a concise, factual personal memory assistant.
Answer the user's question using ONLY the provided memory snippets from their recorded life conversations.
Never invent details that are not in the context.
If the answer is found in a memory, directly state what was said/decided, mention who said it (if provided), and which session it comes from.
Keep your response concise, clear, and direct.`;

              const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Retrieved Memory Context:\n${contextText}\n\nUser Question: ${question}` }
                  ],
                  temperature: 0.2
                })
              });

              const data: any = await response.json();
              if (data.choices && data.choices[0]?.message?.content) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ answer: data.choices[0].message.content }));
              } else {
                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ code: 'CHAT_ERROR', message: err.message }));
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
