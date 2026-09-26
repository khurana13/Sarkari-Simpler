const { spawn } = require('child_process');
const path = require('path');

// Colors for terminal output
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    red: "\x1b[31m"
};

console.log(`${colors.bright}${colors.cyan}🚀 Starting Sarkari-Simpler Project...${colors.reset}\n`);

// Start Backend
const backend = spawn('node', ['mock-server.js'], {
    stdio: 'inherit',
    shell: true
});

backend.on('error', (err) => {
    console.error(`${colors.red}❌ Failed to start backend: ${err.message}${colors.reset}`);
});

// Start Frontend (using a simple http-server or npx serve)
// We'll use npx serve to keep it zero-config
const frontend = spawn('npx', ['-y', 'serve', 'frontend', '-p', '8000', '--no-clipboard'], {
    stdio: 'inherit',
    shell: true
});

frontend.on('error', (err) => {
    console.error(`${colors.red}❌ Failed to start frontend: ${err.message}${colors.reset}`);
});

process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}🛑 Shutting down servers...${colors.reset}`);
    backend.kill();
    frontend.kill();
    process.exit();
});

console.log(`${colors.green}✅ Both servers are initializing...${colors.reset}`);
console.log(`${colors.cyan}👉 Dashboard: http://localhost:8000${colors.reset}`);
console.log(`${colors.cyan}👉 API Health: http://localhost:8787/health${colors.reset}\n`);
