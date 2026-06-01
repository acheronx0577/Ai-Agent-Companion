const fs = require('fs');
const path = require('path');
const { defineConfig } = require('@playwright/test');

const venvPython = process.platform === 'win32'
    ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
    : path.join(__dirname, 'venv', 'bin', 'python');
const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python';

module.exports = defineConfig({
    testDir: './tests',
    timeout: 60_000,
    expect: { timeout: 15_000 },
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://127.0.0.1:5000',
        trace: 'on-first-retry',
    },
    webServer: {
        command: `"${pythonCmd}" app.py`,
        url: 'http://127.0.0.1:5000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
            FLASK_SECRET_KEY: process.env.FLASK_SECRET_KEY || 'ci-test-secret',
            PORT: '5000',
        },
    },
});
