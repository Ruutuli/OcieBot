# Dashboard Deployment Guide

This guide explains how to deploy the OcieBot dashboard to GitHub Pages while maintaining local development support.

## Local Development

When running locally (`npm run dev`), the dashboard will:
- Use base path `/` (no prefix)
- Run on `http://localhost:3000`
- Connect to API at `http://localhost:5000/api` (or `VITE_API_URL` if set)

## GitHub Pages Deployment

### Automatic Deployment (Recommended)

1. **Enable GitHub Pages:**
   - Go to your repository Settings → Pages
   - Source: GitHub Actions

2. **Set up environment variables (optional):**
   - Go to Settings → Secrets and variables → Actions
   - Add `VITE_API_URL` if your API is hosted elsewhere (e.g., `https://your-api-domain.com/api`)

3. **Push to main branch:**
   - The workflow will automatically build and deploy when you push changes to the `dashboard/` folder

### Manual Deployment

1. **Build for production:**
   ```bash
   cd dashboard
   npm run build
   ```

2. **Deploy the `dist` folder:**
   - Copy contents of `dashboard/dist` to your GitHub Pages branch
   - Or use a tool like `gh-pages`:
     ```bash
     npm install -g gh-pages
     cd dashboard
     gh-pages -d dist
     ```

## Configuration

### Environment Variables

Create a `.env` file in the `dashboard/` directory (optional):

```env
# For local development - API URL
VITE_API_URL=http://localhost:5000/api

# For production - your API URL
# VITE_API_URL=https://your-api-domain.com/api

# Base path (usually auto-detected)
# VITE_BASE_PATH=/OcieBot/
```

### API Configuration

Update your API's `.env` file to redirect to GitHub Pages after OAuth:

```env
# For production
DASHBOARD_URL=https://ruutuli.github.io/OcieBot

# For local development
# DASHBOARD_URL=http://localhost:3000
```

## Discord OAuth Redirect URIs

Add these redirect URIs in Discord Developer Portal → OAuth2 → Redirects:

1. **Local development:**
   ```
   http://localhost:5000/api/auth/callback
   ```

2. **Production (if API is hosted):**
   ```
   https://your-api-domain.com/api/auth/callback
   ```

**Note:** Do NOT add the GitHub Pages URL (`https://ruutuli.github.io/OcieBot/callback`) - the OAuth callback must go through your API server, not GitHub Pages.

## Troubleshooting

### Routes not working on GitHub Pages

- Make sure `public/404.html` exists (it handles React Router routing)
- Verify the base path is set correctly in `vite.config.ts`

### API connection issues

- Check that `VITE_API_URL` is set correctly
- Ensure your API server has CORS enabled for your GitHub Pages domain
- Verify the API is accessible from the internet (not just localhost)

### OAuth not working

- Ensure `DASHBOARD_URL` in API `.env` points to your GitHub Pages URL
- Verify the redirect URI in Discord matches your API callback URL (not GitHub Pages)

