/**
 * Portfolio Admin Server
 * API:
 *   PUT  /api/config         - 保存配置 (JSON body)
 *   POST /api/upload          - 上传图片 (multipart: project + file)
 *   POST /api/create-project  - 新建目录 (JSON: {key, title})
 *   GET  /*                   - 静态文件
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8091;
const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, 'image-config.json');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

function readBody(req) {
    return new Promise(resolve => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

function jsonResponse(res, code, data) {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
}

function parseMultipart(buf, boundary) {
    const parts = [];
    const sep = Buffer.from('--' + boundary);
    let pos = bufIdx(buf, sep, 0);
    if (pos === -1) return parts;
    pos += sep.length + 2;

    while (pos < buf.length) {
        const next = bufIdx(buf, sep, pos);
        if (next === -1) break;
        const chunk = buf.slice(pos, next - 2);
        const hdrEnd = bufIdx(chunk, Buffer.from('\r\n\r\n'), 0);
        if (hdrEnd === -1) { pos = next + sep.length + 2; continue; }
        const hdr = chunk.slice(0, hdrEnd).toString('utf8');
        const body = chunk.slice(hdrEnd + 4);
        const nameM = hdr.match(/name="([^"]+)"/);
        const fileM = hdr.match(/filename="([^"]+)"/);
        if (fileM) parts.push({ name: nameM?.[1], filename: fileM[1], data: body });
        else if (nameM) parts.push({ name: nameM[1], value: body.toString('utf8') });
        pos = next + sep.length + 2;
    }
    return parts;
}

function bufIdx(buf, search, start) {
    for (let i = start; i <= buf.length - search.length; i++) {
        if (buf.compare(search, 0, search.length, i, i + search.length) === 0) return i;
    }
    return -1;
}

// 崩溃保护：捕获未处理异常，不让进程退出
process.on('uncaughtException', err => {
    console.error('[FATAL] uncaughtException:', err.message);
    console.error(err.stack);
});
process.on('unhandledRejection', err => {
    console.error('[FATAL] unhandledRejection:', err);
});

const server = http.createServer(async (req, res) => {
    try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    // === API: Save config ===
    if (req.method === 'PUT' && url.pathname === '/api/config') {
        const body = (await readBody(req)).toString('utf8');
        try {
            JSON.parse(body); // validate
            fs.writeFileSync(CONFIG_PATH, body, 'utf8');
            console.log('[SAVE] config updated');
            jsonResponse(res, 200, { ok: true });
        } catch (e) {
            jsonResponse(res, 400, { error: e.message });
        }
        return;
    }

    // === API: Upload image ===
    if (req.method === 'POST' && url.pathname === '/api/upload') {
        const buf = await readBody(req);
        const boundary = (req.headers['content-type'] || '').split('boundary=')[1];
        if (!boundary) { jsonResponse(res, 400, { error: 'no boundary' }); return; }
        const parts = parseMultipart(buf, boundary);
        const project = parts.find(p => p.name === 'project')?.value;
        const file = parts.find(p => p.filename);
        if (!project || !file) { jsonResponse(res, 400, { error: 'missing project or file' }); return; }

        const dir = path.join(ROOT, 'images', 'originals', project);
        fs.mkdirSync(dir, { recursive: true });
        const existing = fs.readdirSync(dir);
        const num = existing.length + 1;
        const ext = path.extname(file.filename).toLowerCase() || '.png';
        const name = `${project}_${num}${ext}`;
        fs.writeFileSync(path.join(dir, name), file.data);
        const rel = `images/originals/${project}/${name}`;
        console.log(`[UPLOAD] ${rel}`);
        jsonResponse(res, 200, { ok: true, file: rel });
        return;
    }

    // === API: Create project ===
    if (req.method === 'POST' && url.pathname === '/api/create-project') {
        const body = JSON.parse((await readBody(req)).toString('utf8'));
        const { key } = body;
        if (!key) { jsonResponse(res, 400, { error: 'missing key' }); return; }
        const dir = path.join(ROOT, 'images', 'originals', key);
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[NEW] project: ${key}`);
        jsonResponse(res, 200, { ok: true });
        return;
    }

    // === Static files ===
    let fp = path.join(ROOT, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!fs.existsSync(fp)) { res.writeHead(404); res.end('Not Found'); return; }
    if (fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html');
    const ext = path.extname(fp).toLowerCase();
    fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(500); res.end('Error'); return; }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(data);
    });
    } catch (e) {
        console.error('[REQ ERROR]', req.method, req.url, '->', e.message);
        try { jsonResponse(res, 500, { error: e.message }); } catch (_) {}
    }
});

// 提高 server 容忍度（大文件上传不超时）
server.timeout = 0;
server.headersTimeout = 0;
server.requestTimeout = 0;
server.keepAliveTimeout = 60000;
server.maxRequestsPerSocket = 0;

server.listen(PORT, () => {
    console.log(`\n  Portfolio Server @ http://127.0.0.1:${PORT}`);
    console.log(`  Admin:   http://127.0.0.1:${PORT}/admin.html`);
    console.log(`  Preview: http://127.0.0.1:${PORT}/projects.html\n`);
});
