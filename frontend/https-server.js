const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');
const { networkInterfaces } = require('os');

const dev = process.env.NODE_ENV !== 'production';
const host = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const certDir = path.join(__dirname, 'cert');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

function getLocalIP() {
  const nets = networkInterfaces();
  let fallback = '127.0.0.1';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('192.168.')) return net.address;
        if (!fallback || fallback === '127.0.0.1') fallback = net.address;
      }
    }
  }
  return fallback;
}

async function generateCert() {
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
  const ip = getLocalIP();
  const attrs = [{ name: 'commonName', value: ip }];
  const pems = await selfsigned.generate(attrs, { days: 365, keySize: 2048 });
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);
  console.log(`Certificado auto-firmado generado para IP: ${ip}`);
}

(async () => {
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) await generateCert();

  const app = next({ dev, hostname: host, port });
  const handle = app.getRequestHandler();
  const httpsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };

  await app.prepare();
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, host, (err) => {
    if (err) throw err;
    const ip = host === '0.0.0.0' ? '127.0.0.1' : host;
    console.log(`\n========================================`);
    console.log(`  Frontend:  https://localhost:${port}`);
    console.log(`  Celular:   https://${getLocalIP()}:${port}`);
    console.log(`========================================`);
    console.log(`  NOTA: El certificado es auto-firmado.`);
    console.log(`  En produccion usa un certificado real.`);
    console.log(`========================================\n`);
  });
})();
