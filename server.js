import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function send(res, status, body, contentType) {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;

  const filePath = url === '/jobs.json'
    ? path.join(__dirname, 'jobs.json')
    : path.join(__dirname, 'public', url.split('?')[0]);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (url === '/jobs.json') {
        send(res, 200, JSON.stringify({ summary: {}, jobs: [] }), MIME['.json']);
      } else {
        send(res, 404, 'Not found', 'text/plain');
      }
      return;
    }
    const ext = path.extname(filePath);
    send(res, 200, data, MIME[ext] || 'application/octet-stream');
  });
});

server.listen(PORT, () => {
  console.log(`Job Scraper UI działa pod adresem: http://localhost:${PORT}`);
});
