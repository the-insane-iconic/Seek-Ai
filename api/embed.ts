import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

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
}
