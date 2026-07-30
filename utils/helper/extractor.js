const axios = require("axios");

const desustreamExtractor = {
      name: 'DesuStream',
      domains: ['desustream.info'],
      extract: async (url) => {
        try {
          const response = await axios.get(url, {
            headers: {
              'Referer': 'https://otakudesu.best/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5'
            }
          });
    
          const html = response.data;
          let videoUrl = null;
    
          const patterns = [
            /var\s+vs\s*=\s*{[^}]*file:\s*"([^"]+)"/,
            /(https:\/\/[^"']*\.googlevideo\.com[^"']*)/,
            /(https:\/\/[^"']*\.(?:m3u8|mp4))/i
          ];
    
          for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
              videoUrl = decodeURIComponent(match[1]);
              console.log('Potential video URL found:', videoUrl);
              break;
            }
          }
    
          if (!videoUrl) {
            console.log('No video URL found in the response');
            return null;
          }
    
          return {
            url: videoUrl,
          };
          } catch (videoError) {
            console.error('Error accessing video URL:', videoError.message);
          }
      }
  };
  

// const odvidhideExtractor = {
//   name: 'OdvidHide',
//   domains: ['odvidhide.com'],
//   extract: async (url) => {
//     try {
//       const id = url.split('/').pop();
//       const embedUrl = `https://odvidhide.com/embed/${id}`;
//       const playerUrl = `https://odvidhide.com/player/index.php?data=${id}`;
      
//       // First, get the embed page to obtain necessary cookies
//       const embedResponse = await axios.get(embedUrl, {
//         headers: {
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//           'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
//           'Accept-Language': 'en-US,en;q=0.9',
//           'Referer': 'https://otakudesu.bid/',
//           'Sec-Fetch-Dest': 'iframe',
//           'Sec-Fetch-Mode': 'navigate',
//           'Sec-Fetch-Site': 'cross-site',
//           'Upgrade-Insecure-Requests': '1'
//         },
//         maxRedirects: 5,
//         validateStatus: function (status) {
//           return status >= 200 && status < 300 || status === 403;
//         }
//       });

//       if (embedResponse.status === 403) {
//         console.log('OdvidHide embed page returned a 403 Forbidden error. Response:', embedResponse.data);
//         return null;
//       }

//       // Extract cookies from the embed response
//       const cookies = embedResponse.headers['set-cookie'];
//       const cookieString = cookies ? cookies.map(cookie => cookie.split(';')[0]).join('; ') : '';

//       // Now, request the player URL with the obtained cookies
//       const playerResponse = await axios.get(playerUrl, {
//         headers: {
//           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//           'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
//           'Accept-Language': 'en-US,en;q=0.9',
//           'Referer': embedUrl,
//           'Cookie': cookieString,
//           'Sec-Fetch-Dest': 'iframe',
//           'Sec-Fetch-Mode': 'navigate',
//           'Sec-Fetch-Site': 'same-origin',
//           'Upgrade-Insecure-Requests': '1'
//         },
//         maxRedirects: 5,
//         validateStatus: function (status) {
//           return status >= 200 && status < 300 || status === 403;
//         }
//       });

//       if (playerResponse.status === 403) {
//         console.log('OdvidHide player returned a 403 Forbidden error. Response:', playerResponse.data);
//         return null;
//       }

//       const sourceMatch = playerResponse.data.match(/sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/);
//       if (sourceMatch && sourceMatch[1]) {
//         return sourceMatch[1];
//       }

//       const fallbackMatch = playerResponse.data.match(/(https?:\/\/[^"']*\.(?:m3u8|mp4))/i);
//       if (fallbackMatch) {
//         return fallbackMatch[1];
//       }

//       console.log('OdvidHide player HTML content:', playerResponse.data);
//       return null;
//     } catch (error) {
//       console.error('OdvidHide extraction error:', error.message);
//       return null;
//     }
//   }
// };
  
const pixeldrainExtractor = {
    name: 'PixelDrain',
    domains: ['pixeldrain.com'],
    extract: async (url) => {
      try {
        const id = url.split('/u/')[1].split('?')[0];
        const apiUrl = `https://pixeldrain.com/api/file/${id}/info`;
        
        const response = await axios.get(apiUrl);
        if (response.data.success) {
          return `https://pixeldrain.com/api/file/${id}`;
        }
        
        return null;
      } catch (error) {
        console.error('PixelDrain extraction error:', error);
        return null;
      }
    }
  };

module.exports = {
    desustreamExtractor,
    // odvidhideExtractor,
    pixeldrainExtractor,
};