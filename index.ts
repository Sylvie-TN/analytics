import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

import Analytics from './lib/analytics';

const analytics = new Analytics();

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  if (analytics.routePath(req)) {
    return analytics.request(req, res);
  }

  const filePath = path.join(import.meta.dir, 'public', req.url === '/' ? 'index.html' : req.url);
  const extname = path.extname(filePath);

  let contentType = 'text/html';

  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(import.meta.dir, 'public', '404.html'), (err, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf8');
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf8');
    }
  });
});

server.listen(8080);