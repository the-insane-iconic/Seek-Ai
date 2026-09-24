import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

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
        segments: (segments || []).slice(0, 50).map((s: any) => ({ 
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
}
