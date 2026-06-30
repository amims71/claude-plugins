import http from 'node:http';
import https from 'node:https';

export function post(urlStr, { headers = {}, body = '' } = {}) {
  return new Promise((resolve) => {
    let url;
    try { url = new URL(urlStr); } catch { return resolve(); }
    const data = Buffer.from(body, 'utf8');
    const lib = url.protocol === 'http:' ? http : https;
    const req = lib.request(
      url,
      { method: 'POST', headers: { 'Content-Length': data.length, ...headers }, timeout: 5000 },
      (res) => { res.on('data', () => {}); res.on('end', resolve); },
    );
    req.on('error', () => resolve());
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.end(data);
  });
}
