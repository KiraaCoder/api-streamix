const findDirectLink = (html) => {
    const patterns = [
      /<source[^>]*src=["']([^"']*\.(?:mp4|m3u8)[^"']*)["']/i,
      /file:\s*["']([^"']*\.(?:mp4|m3u8)[^"']*)["']/,
      /source:\s*["']([^"']*\.(?:mp4|m3u8)[^"']*)["']/,
      /"file":"([^"]*\.(?:mp4|m3u8)[^"]*)"/,
      /hlsUrl\s*=\s*["']([^"']*\.m3u8[^"']*)["']/,
      /player\.setup\({[\s\S]*?file:\s*["']([^"']+)["']/,
      /var\s+player\s*=\s*new\s+Clappr\.Player\({[\s\S]*?source:\s*["']([^"']+)["']/,
      /(https?:\/\/[^"']*\.(?:m3u8|mp4))/i
    ];
  
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  
    return null;
  };