// ecosystem.config.js
module.exports = {
  apps: [{
    name: "otakudesu-api",
    script: "./index.js",
    
    // Untuk Puppeteer, gunakan 1 instance (Mode Fork)
    // Biar aplikasi yang mengelola browser secara internal
    instances: 1, 
    exec_mode: "fork",
    
    // Tambahkan delay restart untuk memberi napas pada OS 
    // jika terjadi crash saat browser terbuka
    restart_delay: 3000, 
    
    // Watch tetap dimatikan di production
    watch: false,
    ignore_watch: [
      ".env"
    ],
    
    // Puppeteer makan RAM gede, 512MB mungkin mepet. 
    // Naikkan ke 1G kalau servermu kuat.
    max_memory_restart: "800M",
    max_restarts: 10,
    min_uptime: "15s",
    
    // Logging
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    log_date_format: "YYYY-MM-DD HH:mm Z",
    time: true,
    
    env_production: {
      NODE_ENV: "production",
      PORT: process.env.PORT || 7003,
      // Tips: Pastikan Puppeteer jalan di mode --no-sandbox di server
    },
    
    env_development: {
      NODE_ENV: "development",
      PORT: 3010,
      DEBUG: "app:*"
    }
  }]
};