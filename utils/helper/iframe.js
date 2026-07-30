const {
  pixeldrainExtractor,
  desustreamExtractor,
} = require("../helper/extractor");
const { getUrlAjax } = require("../helper/get-episode");
const cheerio = require("cheerio");
const axios = require("axios");
const { PassThrough } = require("stream");
const pLimit = require("p-limit");
const limit = pLimit(10);

const extractIdFromEmbed = (embedUrl) => {
  const url = new URL(embedUrl);
  return url.searchParams.get("id");
};

const urlStore = {};
const transformDirectLink = (directLink, embedUrl, driver, quality) => {
  const url = new URL(embedUrl);
  if (url.hostname.includes("desustream.info")) {
    const baseUrl = "http://34.101.252.65/anime/stream";
    const id = extractIdFromEmbed(embedUrl);
    const uniqueId = `${id}-${driver}-${quality}`;
    const encodedLink = encodeURIComponent(directLink.url);
    urlStore[uniqueId] = encodedLink;
    return `${baseUrl}?id=${uniqueId}`;
  }
  return directLink.url;
};

const extractIframeSrc = async (
  contentLink,
  nonce,
  driver,
  quality,
  episode_id,
) => {
  try {
    // Masukkan episode_id ke sini untuk bypass 403
    const html = await getUrlAjax(contentLink, nonce, episode_id);

    // Deteksi error object dari getUrlAjax (misalnya 403 = nonce expired)
    if (html && typeof html === 'object' && html.error) {
      console.log(`[extractIframeSrc] getUrlAjax returned error: ${html.status}`);
      return { embed: null, direct: null, errorStatus: html.status };
    }

    // Cegah error "cheerio.load() expects a string"
    if (!html || typeof html !== "string") {
      console.log("Gagal mendapatkan HTML: HTML kosong atau bukan string.");
      return { embed: null, direct: null };
    }

    const parsed = cheerio.load(html);
    const iframeSrc = parsed("iframe").attr("src");

    if (!iframeSrc) return { embed: null, direct: null };

    // ... proses extractor (DesuStream/PixelDrain) ...
    let directLink = null;
    if (iframeSrc.includes("desustream.info")) {
      directLink = await desustreamExtractor.extract(iframeSrc);
    } else if (iframeSrc.includes("pixeldrain.com")) {
      directLink = await pixeldrainExtractor.extract(iframeSrc);
    }

    return {
      embed: iframeSrc,
      direct: directLink
        ? transformDirectLink(directLink, iframeSrc, driver, quality)
        : null,
    };
  } catch (error) {
    console.error("Error in extractIframeSrc:", error.message);
    return { embed: null, direct: null };
  }
};

const getStreamingLinks = ($, selector, nonce, episode_id, quality) => {
  return $(selector)
    .map((k, v) => {
      const driver = $(v).text().trim();
      const content = $(v).find("a").data().content;

      // FIX UTAMA: Encode konten Base64 agar karakter "/" dan "+" aman di URL
      const safeContent = encodeURIComponent(content);

      // Sesuaikan base URL API kamu di sini
      const baseUrlApi = "https://apikey.web.id/otaku";
      
      // Gunakan safeContent, bukan content mentah
      const stream_url = `${baseUrlApi}/api/stream-source/${safeContent}?nonce=${nonce}&episode_id=${episode_id}&driver=${driver}&quality=${quality}`;

      return {
        driver,
        content, // Tetap kembalikan content mentah jika dibutuhkan di frontend
        stream_url,
      };
    })
    .get();
};

const streamVideo = (req, res) => {
  const { id } = req.query;
  const encodedUrl = urlStore[id];
  if (!id || !encodedUrl) {
    return res
      .status(400)
      .send({ status: false, message: "Missing id or url parameter" });
  }

  const decodedUrl = decodeURIComponent(encodedUrl);

  // Define constants for optimization
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
  const TIMEOUT = 30000; // 30 seconds timeout

  // Get the video size first
  axios
    .head(decodedUrl, {
      timeout: TIMEOUT,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: "https://desustream.info",
        Accept: "video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Origin: "https://desustream.info",
        Connection: "keep-alive",
      },
    })
    .then((response) => {
      const videoSize = parseInt(response.headers["content-length"]);

      // Handle range requests
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        let start = parseInt(parts[0], 10);
        // Limit chunk size for better seeking
        let end = Math.min(start + CHUNK_SIZE - 1, videoSize - 1);
        if (parts[1]) {
          end = Math.min(parseInt(parts[1], 10), start + CHUNK_SIZE - 1);
        }
        const chunkSize = end - start + 1;

        // Set proper headers for range request
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${videoSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": "video/mp4",
          "Cache-Control": "public, max-age=3600",
          Connection: "keep-alive",
        });

        // Stream the specific chunk
        axios({
          method: "get",
          url: decodedUrl,
          responseType: "stream",
          timeout: TIMEOUT,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Referer: "https://desustream.info",
            Accept: "video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            Origin: "https://desustream.info",
            Range: `bytes=${start}-${end}`,
            Connection: "keep-alive",
          },
        })
          .then((response) => {
            // Handle client disconnection
            let isConnectionClosed = false;
            req.on("close", () => {
              isConnectionClosed = true;
              response.data.destroy();
            });

            // Handle stream errors
            response.data.on("error", (error) => {
              console.error("Stream error:", error);
              if (!res.headersSent && !isConnectionClosed) {
                res
                  .status(500)
                  .send({ status: false, message: "Error during streaming" });
              }
            });

            response.data.pipe(res);
          })
          .catch((error) => {
            console.error("Error streaming video chunk:", error.message);
            if (!res.headersSent) {
              res
                .status(500)
                .send({ status: false, message: "Error streaming video" });
            }
          });
      } else {
        // If no range requested, send entire file
        res.writeHead(200, {
          "Content-Length": videoSize,
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
          Connection: "keep-alive",
        });

        axios({
          method: "get",
          url: decodedUrl,
          responseType: "stream",
          timeout: TIMEOUT,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Referer: "https://desustream.info",
            Accept: "video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            Origin: "https://desustream.info",
            Connection: "keep-alive",
          },
        })
          .then((response) => {
            let isConnectionClosed = false;
            req.on("close", () => {
              isConnectionClosed = true;
              response.data.destroy();
            });

            response.data.on("error", (error) => {
              console.error("Stream error:", error);
              if (!res.headersSent && !isConnectionClosed) {
                res
                  .status(500)
                  .send({ status: false, message: "Error during streaming" });
              }
            });

            response.data.pipe(res);
          })
          .catch((error) => {
            console.error("Error streaming complete video:", error.message);
            if (!res.headersSent) {
              res
                .status(500)
                .send({ status: false, message: "Error streaming video" });
            }
          });
      }
    })
    .catch((error) => {
      console.error("Error getting video size:", error.message);
      if (!res.headersSent) {
        res
          .status(500)
          .send({ status: false, message: "Error getting video information" });
      }
    });
};

module.exports = {
  getStreamingLinks,
  extractIframeSrc,
  transformDirectLink,
  streamVideo,
};