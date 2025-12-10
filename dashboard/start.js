#!/usr/bin/env node

// Start script for Railway deployment
// Builds the app and starts the proxy server

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, 'dist');

// Check if dist directory exists, if not, build first
if (!existsSync(distPath)) {
  console.log('Building application...');
  const build = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });

  build.on('error', (error) => {
    console.error('Failed to build application:', error);
    process.exit(1);
  });

  build.on('exit', (code) => {
    if (code !== 0) {
      console.error('Build failed with exit code:', code);
      process.exit(code);
    }
    // After build completes, start the server
    startServer();
  });
} else {
  // Dist exists, start server directly
  startServer();
}

function startServer() {
  console.log('Starting proxy server...');
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });

  server.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  server.on('exit', (code) => {
    process.exit(code || 0);
  });
}

