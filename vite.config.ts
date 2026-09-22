import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';

function transcriptionProxyPlugin(): Plugin {
  return {
    name: 'transcription-proxy',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
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

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), transcriptionProxyPlugin()],
  server: {
    port: 3000,
    host: true
  }
});
