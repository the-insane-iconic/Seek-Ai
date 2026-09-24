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
}
