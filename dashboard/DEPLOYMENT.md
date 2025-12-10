# Dashboard Deployment Guide

This guide explains how to deploy the OcieBot dashboard on Railway.

## Local Development

When running locally (`npm run dev`), the dashboard will:
- Use base path `/` (root path)
- Run on `http://localhost:3000`
- Connect to API at `http://localhost:5000/api` (or `VITE_API_URL` if set)

## Railway Deployment

The dashboard is deployed as a separate Railway service. See the main [RAILWAY_DEPLOYMENT.md](../RAILWAY_DEPLOYMENT.md) guide for complete setup instructions.

### Quick Setup

1. Create a new Railway service with root directory set to `dashboard`
2. Railway will automatically detect the `railway.json` configuration
3. Set environment variable `VITE_API_URL` to your Railway API service URL (e.g., `https://your-api.railway.app/api`)
4. Railway will build and deploy automatically

### Build Process

Railway will:
1. Run `npm install` to install dependencies
2. Run `npm run build` to build the React app
3. Run `npm run preview` to serve the built files

## Configuration

### Environment Variables

Set these in Railway dashboard for the Dashboard service:

```env
# Required: Your Railway API service URL
VITE_API_URL=https://your-api-service.railway.app/api

# Optional: Custom base path (defaults to /)
# VITE_BASE_PATH=/

# Railway provides PORT automatically
PORT=3000
```

**Important**: `VITE_API_URL` must be set at build time. If you change it, you'll need to redeploy.

### API Configuration

Ensure your API service has `DASHBOARD_URL_PROD` set to your Railway Dashboard service URL:

```env
DASHBOARD_URL_PROD=https://your-dashboard-service.railway.app
```

## Discord OAuth Redirect URIs

Add this redirect URI in Discord Developer Portal → OAuth2 → Redirects:

1. **Production (Railway):**
   ```
   https://your-api-service.railway.app/api/auth/callback
   ```

2. **Local development:**
   ```
   http://localhost:5000/api/auth/callback
   ```

## Troubleshooting

### Routes not working

- Make sure `public/404.html` exists (it handles React Router routing for SPA)
- Verify the base path is set correctly in `vite.config.ts` (should be `/`)

### API connection issues

- Check that `VITE_API_URL` is set correctly in Railway
- Ensure your API server has CORS enabled for your Railway Dashboard domain
- Verify the API is accessible from the internet
- Remember: `VITE_API_URL` must be set before build - redeploy after changing it

### OAuth not working

- Ensure `DASHBOARD_URL_PROD` in API service points to your Railway Dashboard URL
- Verify the redirect URI in Discord matches your Railway API callback URL
- Check that both API and Dashboard services are running

### Build errors

- Ensure all environment variables are set before build
- Check Railway logs for specific error messages
- Verify Node.js version compatibility

