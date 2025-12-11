#!/usr/bin/env node

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const API_SERVICE_URL = process.env.API_SERVICE_URL || 'http://localhost:5000';

// Get the dist directory path
const distPath = join(__dirname, 'dist');

// Check if dist directory exists
if (!existsSync(distPath)) {
  console.error('Error: dist directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Proxy API requests to the API service
app.use('/api', createProxyMiddleware({
  target: API_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // Keep /api prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    // Only log errors in development, not every request
    // This reduces log noise from duplicate requests
  },
  onError: (err, req, res) => {
    // Log proxy errors
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Proxy Error] ${req.method} ${req.url}:`, err.message);
    }
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}));

// Serve static files from dist directory
app.use(express.static(distPath));

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found. Please run "npm run build" first.');
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard server running on port ${PORT}`);
  console.log(`API proxy target: ${API_SERVICE_URL}`);
  console.log(`Serving static files from: ${distPath}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

