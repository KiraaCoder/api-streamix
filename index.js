const express = require("express");
const axios = require("axios");
const cors = require("cors");
const http = require("http");
const https = require("https");
const animeRoutes = require("./routes/anime-route");

const app = express();

// CORS: Otomatis allow semua domain
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Range'],
  credentials: true,
}));

// Preflight handler
app.options('*', cors());

// ==========================================
// AXIOS KEEPALIVE AGENT (BYPASS CLOUDFLARE / ANTI-DDOS VIDHIDE)
// Mempertahankan 1 Pipa koneksi agar tidak dianggap bot spamming
// ==========================================
const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  keepAliveMsecs: 60000, 
  maxSockets: 100,
  rejectUnauthorized: false
});
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  keepAliveMsecs: 60000, 
  maxSockets: 100
});

// Gunakan proxyClient ini untuk semua proxy bypass
const proxyClient = axios.create({
  httpAgent: httpAgent,
  httpsAgent: httpsAgent,
  decompress: false // WAJIB: Mencegah Axios merusak binary file TS
});

// ==========================================
// FUNGSI BANTUAN KHUSUS VIDHIDE (FALLBACK)
// ==========================================
function decodeVidhide(html) {
  const regex = /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[a-zA-Z]\s*\)[\s\S]+?split\('\|'\).*?\)\s*\)/i;
  const match = html.match(regex);
  if (!match) return html;
  try {
    const executableCode = match[0].replace(/^eval\s*/i, "");
    return eval(executableCode);
  } catch (err) {
    return html;
  }
}

// ==========================================
// ROUTE UTAMA: MERENDER JW PLAYER
// ==========================================
app.get("/otaku/embed", async (req, res) => {
  const apiUrl = req.query.url;

  if (!apiUrl) return res.status(400).send("<h3 style='color:white; text-align:center;'>URL Stream tidak valid</h3>");

  try {
    const apiResponse = await axios.get(apiUrl, { timeout: 15000 });
    if (!apiResponse.data || !apiResponse.data.data) return res.status(404).send("<h3 style='color:white; text-align:center;'>Data tidak ditemukan di API</h3>");

    const { driver, embed_url, direct_url } = apiResponse.data.data;
    console.log(`[Embed] Driver: ${driver}, Direct URL: ${direct_url ? 'Tersedia' : 'Kosong'}`);

    let finalVideoUrl = direct_url || "";
    let videoType = "mp4";

    const axiosConfig = {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36" },
      timeout: 15000,
    };

    if (driver === "vidhide") {
      // 1. PRIORITAS MENGGUNAKAN DIRECTLINK
      if (direct_url) {
        console.log(`[Vidhide] Memproses Directlink: ${direct_url}`);
        const b64Data = encodeURIComponent(Buffer.from(direct_url).toString('base64'));
        const b64Ref = encodeURIComponent(Buffer.from(embed_url || "https://vidhide.com").toString('base64'));
        
        if (direct_url.includes('.m3u8')) {
          finalVideoUrl = `https://apikey.web.id/otaku/proxy-hls/master.m3u8?data=${b64Data}&ref=${b64Ref}`;
          videoType = "hls";
        } else {
          finalVideoUrl = `https://apikey.web.id/otaku/proxy-video/video.mp4?data=${b64Data}&ref=${b64Ref}`;
          videoType = "mp4";
        }
      } 
      // 2. FALLBACK SCRAPING JIKA DIRECTLINK MATI
      else {
        const htmlRes = await axios.get(embed_url, { ...axiosConfig, headers: { ...axiosConfig.headers, Referer: embed_url } });
        const decodedString = decodeVidhide(htmlRes.data);
        const m3u8Match = decodedString.match(/["'](https:\/\/[^"']+\.m3u8[^"']*)['"]/);

        if (m3u8Match) {
          const b64Data = encodeURIComponent(Buffer.from(m3u8Match[1]).toString('base64'));
          const b64Ref = encodeURIComponent(Buffer.from(embed_url).toString('base64'));
          finalVideoUrl = `https://apikey.web.id/otaku/proxy-hls/master.m3u8?data=${b64Data}&ref=${b64Ref}`;
          videoType = "hls";
        }
      }
    } else if (driver.startsWith("ondesu") || driver.startsWith("updesu")) {
      let bloggerUrl = embed_url;
      try {
        const jsonUrl = embed_url + (embed_url.includes('?') ? '&' : '?') + 'mode=json';
        const jsonRes = await axios.get(jsonUrl, { headers: { "Referer": "https://otakudesu.blog/" }, timeout: 10000 });
        if (jsonRes.data && jsonRes.data.video) bloggerUrl = jsonRes.data.video;
      } catch (e) {}

      const htmlPage = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" /><style>html, body { margin:0; padding:0; height:100%; width:100%; background:#000; display:flex; justify-content:center; align-items:center; color:#ddd; font-family:sans-serif; } #wrap { position:relative; width:100vw; height:100vh; } iframe { width:100%; height:100%; border:0; background:#000; }</style></head><body><div id="wrap"><iframe id="myIframe" src="${bloggerUrl}" allowfullscreen></iframe></div></body></html>`;
      res.setHeader("Content-Type", "text/html");
      return res.send(htmlPage);
    } else if (driver.startsWith("odstream")) {
      const htmlRes = await axios.get(embed_url, axiosConfig);
      const mp4Match = htmlRes.data.match(/file\s*:\s*["'](https:\/\/[^"']+\.mp4)["']/);
      if (mp4Match) { finalVideoUrl = mp4Match[1]; videoType = "mp4"; }
    } else if (driver.startsWith("otakuwatch")) {
      const htmlRes = await axios.get(embed_url, axiosConfig);
      const sourceMatch = htmlRes.data.match(/<source[^>]+src=["'](https:\/\/[^"']+)["']/i);
      if (sourceMatch) {
        const b64Data = encodeURIComponent(Buffer.from(sourceMatch[1]).toString('base64'));
        finalVideoUrl = `https://apikey.web.id/otaku/proxy-video/video.mp4?data=${b64Data}`;
        videoType = "mp4";
      }
    } else if (embed_url) {
      res.setHeader("Content-Type", "text/html");
      return res.send(`<!DOCTYPE html><html lang="id"><head><style>body, html { margin: 0; padding: 0; background: #000; width: 100%; height: 100%; overflow: hidden; }</style></head><body><iframe src="${embed_url}" style="width:100%;height:100%;border:none;" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups"></iframe></body></html>`);
    }

    if (!finalVideoUrl) return res.status(404).send(`<h3 style='color:white; text-align:center;'>Gagal mengekstrak video.</h3>`);

    const htmlPage = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Player</title>
            <style>
                body, html { margin: 0; padding: 0; background: #000; width: 100%; height: 100%; overflow: hidden; font-family: sans-serif; }
                #resumeModal { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.75); z-index: 999; display: none; justify-content: center; align-items: center; }
                .modal-box { background: #1c1c1c; border: 1px solid #333; border-radius: 12px; padding: 24px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
                .modal-text { color: #fff; font-size: 15px; margin-bottom: 24px; }
                .btn-group { display: flex; gap: 12px; }
                .btn { flex: 1; padding: 12px; border: none; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
                .btn-awal { background: #3d3d3d; color: #fff; }
                .btn-lanjut { background: #1cb5e0; color: #fff; }
            </style>
            <script src="https://ssl.p.jwpcdn.com/player/v/8.22.0/jwplayer.js"></script>
        </head>
        <body>
            <div id="player"></div>
            <div id="resumeModal">
                <div class="modal-box">
                    <div class="modal-text" id="resumeText">Lanjutkan menonton dari menit 00:00?</div>
                    <div class="btn-group">
                        <button class="btn btn-awal" id="btnAwal">MULAI AWAL</button>
                        <button class="btn btn-lanjut" id="btnLanjut">YA, LANJUTKAN</button>
                    </div>
                </div>
            </div>

            <script>
                // FIX: Gunakan fungsi Hash untuk memastikan setiap URL menghasilkan ID yang 100% berbeda
                const urlString = "${apiUrl}";
                let hashNum = 0;
                for (let i = 0; i < urlString.length; i++) {
                    hashNum = ((hashNum << 5) - hashNum) + urlString.charCodeAt(i);
                    hashNum |= 0; // Convert to 32bit integer
                }
                const videoId = Math.abs(hashNum);
                const storageKey = 'jwplayer_time_' + videoId;
                const savedTime = localStorage.getItem(storageKey);
                
                const player = jwplayer("player");
                player.setup({
                    key: "cLGMn8T20tGvW+0eXPhq4NNmLB57TrscPjd1IyJF84o=",
                    file: "${finalVideoUrl}",
                    type: "${videoType}",
                    width: "100%",
                    height: "100%",
                    autostart: false,
                    preload: "auto",
                    stretching: "uniform",
                    hlshtml: true,
                    cast: {}
                });

                const modal = document.getElementById('resumeModal');
                const btnAwal = document.getElementById('btnAwal');
                const btnLanjut = document.getElementById('btnLanjut');
                const resumeText = document.getElementById('resumeText');

                player.on('ready', function() {
                    if (savedTime && parseInt(savedTime) > 10) {
                        const totalSeconds = parseInt(savedTime);
                        const m = Math.floor(totalSeconds / 60);
                        const s = Math.floor(totalSeconds % 60);
                        resumeText.innerText = 'Lanjutkan menonton dari menit ' + (m < 10 ? '0'+m : m) + ':' + (s < 10 ? '0'+s : s) + '?';
                        modal.style.display = 'flex';
                    }
                });

                btnAwal.addEventListener('click', function() { modal.style.display = 'none'; player.seek(0); player.play(); });
                btnLanjut.addEventListener('click', function() { modal.style.display = 'none'; player.seek(parseInt(savedTime)); player.play(); });
                player.on('time', function(e) { localStorage.setItem(storageKey, Math.floor(e.position)); });
                player.on('complete', function() { localStorage.removeItem(storageKey); });

                player.on('error', function(e) {
                    console.log("JWPlayer Error:", e);
                    setTimeout(() => { if(player.getState() !== 'playing') player.play(); }, 3000);
                });
            </script>
        </body>
        </html>
        `;

    res.setHeader("Content-Type", "text/html");
    res.send(htmlPage);
  } catch (error) {
    res.status(500).send(`<h3 style='color:white; text-align:center;'>Terjadi kesalahan internal.</h3>`);
  }
});

// ==========================================
// ROUTE PROXY: HLS & .TS (DENGAN FAKE EXTENSION)
// ==========================================
app.get(["/otaku/proxy-hls", "/otaku/proxy-hls/*"], async (req, res) => {
  let targetUrl = req.query.url;
  let referer = req.query.referer || '';

  if (req.query.data) targetUrl = Buffer.from(req.query.data, 'base64').toString('utf8');
  if (req.query.ref) referer = Buffer.from(req.query.ref, 'base64').toString('utf8');

  if (!targetUrl) return res.status(400).send("Missing url");

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');

  // Passing Real IP agar Server tidak dianggap Bot Server Tunggal
  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (clientIp && clientIp.includes('::ffff:')) clientIp = clientIp.replace('::ffff:', '');
  if (clientIp === '127.0.0.1' || clientIp === '::1') clientIp = '';

  const headers = {
    "User-Agent": req.headers['user-agent'] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Referer": referer,
    "Accept-Encoding": "identity" 
  };
  
  if (clientIp) headers["X-Forwarded-For"] = clientIp;

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    const isM3u8 = targetUrl.includes('.m3u8');

    if (isM3u8) {
      // --- PROSES M3U8 (PLAYLIST) ---
      const response = await proxyClient.get(targetUrl, {
        headers, responseType: 'text', timeout: 15000, signal: controller.signal
      });

      const lines = response.data.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
            const absoluteUri = new URL(uri, targetUrl).href;
            const b64Data = encodeURIComponent(Buffer.from(absoluteUri).toString('base64'));
            const b64Ref = encodeURIComponent(Buffer.from(referer).toString('base64'));
            return `URI="/otaku/proxy-hls/key.key?data=${b64Data}&ref=${b64Ref}"`;
          });
        }
        if (trimmed.startsWith('#') || trimmed === '') return line;

        const absoluteUrl = new URL(trimmed, targetUrl).href;
        const b64Data = encodeURIComponent(Buffer.from(absoluteUrl).toString('base64'));
        const b64Ref = encodeURIComponent(Buffer.from(referer).toString('base64'));
        // Sisipkan fake extension segment.ts
        return `/otaku/proxy-hls/segment.ts?data=${b64Data}&ref=${b64Ref}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(rewrittenLines.join('\n'));

    } else {
      // --- PROSES VIDEO CHUNK (.TS) ---
      if (req.headers.range) headers['Range'] = req.headers.range;

      const response = await proxyClient({
        url: targetUrl,
        method: 'GET',
        headers: headers,
        responseType: 'stream',
        timeout: 30000,
        signal: controller.signal
      });

      // Deteksi jika server Vidhide mencekik limit (ngirim Captcha/HTML bukan Video)
      const resContentType = response.headers['content-type'] || '';
      if (resContentType.includes('text/html')) {
          console.error(`[BLOCKED BY VIDHIDE] Terkena limit Cloudflare di tengah jalan! URL: ${targetUrl}`);
      }

      res.status(response.status);
      
      ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(key => {
        if (response.headers[key]) res.setHeader(key, response.headers[key]);
      });

      response.data.pipe(res);
      response.data.on('error', () => res.end());
    }
  } catch (error) {
    if (axios.isCancel(error)) return;
    res.status(error.response?.status || 500).end();
  }
});

// ==========================================
// ROUTE PROXY: UNTUK MP4 / OTAKUWATCH / ONDESU
// ==========================================
app.get(["/otaku/proxy-video", "/otaku/proxy-video/*"], async (req, res) => {
  let targetUrl = req.query.url;
  let referer = req.query.referer || "https://desustream.info/";
  
  if (req.query.data) targetUrl = Buffer.from(req.query.data, 'base64').toString('utf8');
  if (req.query.ref) referer = Buffer.from(req.query.ref, 'base64').toString('utf8');

  if (targetUrl && targetUrl.includes("googlevideo.com")) referer = "https://www.blogger.com/";

  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (clientIp && clientIp.includes('::ffff:')) clientIp = clientIp.replace('::ffff:', '');
  if (clientIp === '127.0.0.1' || clientIp === '::1') clientIp = '';

  const headers = {
    "User-Agent": req.headers['user-agent'] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Referer": referer,
    "Accept-Encoding": "identity" 
  };
  
  if (clientIp) headers["X-Forwarded-For"] = clientIp;

  if (req.headers.range) headers["Range"] = req.headers.range;

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    const response = await proxyClient({
      url: targetUrl, method: "GET", headers,
      responseType: "stream",
      timeout: 30000, signal: controller.signal
    });

    res.status(response.status);
    for (const key in response.headers) {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, response.headers[key]);
      }
    }

    response.data.pipe(res);
    response.data.on('error', () => res.end());
  } catch (error) {
    if (axios.isCancel(error)) return;
    res.status(error.response ? error.response.status : 500).end();
  }
});

app.get("/otaku/", (req, res) => {
  res.json({ status: true, message: "Welcome to the Anime & Manga API" });
});

app.use("/otaku/api", animeRoutes);

app.listen(process.env.PORT || 7003, "0.0.0.0", () => {
  console.log(`Server is running on port ${process.env.PORT || 7003} and accessible from network`);
});