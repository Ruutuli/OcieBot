#!/usr/bin/env node

// Start script for Railway deployment
// Reads PORT from environment and passes it to vite preview

const { spawn } = require('child_process');

const port = process.env.PORT || '8080';
const host = '0.0.0.0';

console.log(`Starting Vite preview server on port ${port}...`);

const vite = spawn('vite', ['preview', '--port', port, '--host', host], {
  stdio: 'inherit',
  shell: true
});

vite.on('error', (error) => {
  console.error('Failed to start Vite preview:', error);
  process.exit(1);
});

vite.on('exit', (code) => {
  process.exit(code || 0);
});

