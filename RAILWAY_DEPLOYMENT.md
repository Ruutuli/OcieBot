# Railway Deployment Guide

This guide explains how to deploy the OcieBot application on Railway with three separate services: API, Bot, and Dashboard.

## Architecture

The application is deployed as three separate Railway services:

- **API Service**: Express REST API (handles HTTP requests)
- **Bot Service**: Discord bot (runs continuously, no HTTP port)
- **Dashboard Service**: React static site (served via Vite preview)

All services share the same MongoDB database.

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. MongoDB database (MongoDB Atlas or Railway MongoDB service)
3. Discord Application with Bot and OAuth2 configured
4. GitHub repository with your code

## Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

## Step 2: Create Services

Railway will detect the monorepo structure. You need to create three services:

### Service 1: API

1. In your Railway project, click "New Service"
2. Select "GitHub Repo" and choose your repository
3. Set the **Root Directory** to `api`
4. Railway will automatically detect the `railway.json` configuration

### Service 2: Bot

1. Click "New Service" again
2. Select "GitHub Repo" and choose your repository
3. Set the **Root Directory** to `bot`
4. Railway will automatically detect the `railway.json` configuration

### Service 3: Dashboard

1. Click "New Service" again
2. Select "GitHub Repo" and choose your repository
3. Set the **Root Directory** to `dashboard`
4. Railway will automatically detect the `railway.json` configuration

## Step 3: Configure Environment Variables

### API Service Environment Variables

Go to the API service → Variables tab and add:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/
JWT_SECRET=your_secure_jwt_secret_here
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://your-api-service.railway.app/api/auth/callback
DASHBOARD_URL_PROD=https://your-dashboard-service.railway.app
NODE_ENV=production
```

**Important**: 
- Replace `your-api-service.railway.app` with your actual Railway API service domain
- Replace `your-dashboard-service.railway.app` with your actual Railway Dashboard service domain
- You can find these domains in Railway after deployment (Settings → Generate Domain)

### Bot Service Environment Variables

Go to the Bot service → Variables tab and add:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/
DASHBOARD_URL_PROD=https://your-dashboard-service.railway.app
```

### Dashboard Service Environment Variables

Go to the Dashboard service → Variables tab and add:

```env
VITE_API_URL=https://your-api-service.railway.app/api
PORT=3000
```

**Note**: The `VITE_API_URL` must be set at build time. If you change it, you'll need to redeploy.

## Step 3.5: Configure MongoDB Atlas Network Access

**CRITICAL**: If you're using MongoDB Atlas, you must configure Network Access to allow connections from Railway.

### Why This Is Required

Railway uses dynamic IP addresses for deployments. MongoDB Atlas blocks connections from IPs that aren't whitelisted in Network Access settings. Without proper configuration, your API and Bot services will fail to connect with errors like:

```
MongoDB connection error: Could not connect to any servers in your MongoDB Atlas cluster. 
One common reason is that you're trying to access the database from an IP that isn't whitelisted.
```

### How to Configure

1. **Go to MongoDB Atlas Dashboard**
   - Visit [MongoDB Atlas](https://cloud.mongodb.com/)
   - Log in to your account
   - Select your cluster

2. **Navigate to Network Access**
   - Click **"Network Access"** in the left sidebar (under Security)
   - Or go directly to: `https://cloud.mongodb.com/v2#/security/network/whitelist`

3. **Add IP Address**
   - Click **"Add IP Address"** button
   - You have two options:

   **Option A: Allow All IPs (Recommended for Railway)**
   - Click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` to your whitelist
   - Click **"Confirm"**
   - **Note**: This allows connections from any IP address. For production, ensure your database has strong authentication (username/password).

   **Option B: Add Specific IPs (Not Recommended)**
   - Railway uses dynamic IPs that change frequently
   - This option requires constant updates and is not practical
   - Only use if you have specific security requirements

4. **Verify Configuration**
   - Your whitelist should show `0.0.0.0/0` (or your specific IPs)
   - Status should be **"Active"**
   - Changes take effect immediately (no wait time)

5. **Test Connection**
   - After configuring, your Railway services should automatically retry connections
   - Check service logs to verify successful MongoDB connection
   - You should see: `"Connected to MongoDB"` in the logs

### Security Considerations

- **Database Authentication**: Always use strong usernames and passwords for your MongoDB Atlas database
- **Connection String**: Never commit your `MONGODB_URI` with credentials to version control
- **Environment Variables**: Store `MONGODB_URI` securely in Railway's environment variables
- **IP Whitelisting**: While `0.0.0.0/0` allows all IPs, your database is still protected by authentication

### Troubleshooting

If you still see connection errors after whitelisting:

1. **Verify Whitelist Status**
   - Check MongoDB Atlas → Network Access
   - Ensure `0.0.0.0/0` is listed and active
   - Remove any conflicting rules

2. **Check Connection String**
   - Verify `MONGODB_URI` environment variable is set correctly
   - Format should be: `mongodb+srv://username:password@cluster.mongodb.net/database`
   - Ensure username and password are URL-encoded if they contain special characters

3. **Check Service Logs**
   - Railway services now include retry logic with detailed error messages
   - Look for specific error messages about IP whitelisting
   - Services will retry 3 times with exponential backoff (2s, 4s, 8s delays)

4. **Wait for Propagation**
   - Network Access changes are usually immediate
   - If issues persist, wait 1-2 minutes and check again

## Step 4: Configure Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to OAuth2 → Redirects
4. Add your Railway API callback URL:
   ```
   https://your-api-service.railway.app/api/auth/callback
   ```
5. Save changes

## Step 5: Deploy

1. Railway will automatically deploy when you push to your connected branch
2. Or manually trigger deployment from the Railway dashboard
3. Wait for all three services to build and deploy

## Step 6: Generate Public Domains

For each service:

1. Go to the service → Settings
2. Click "Generate Domain"
3. Copy the generated domain
4. Update environment variables that reference these domains:
   - `DISCORD_REDIRECT_URI` in API service
   - `DASHBOARD_URL_PROD` in API and Bot services
   - `VITE_API_URL` in Dashboard service (requires redeploy)

## Step 7: Verify Deployment

### API Service

1. Check the API service logs for successful startup
2. Visit `https://your-api-service.railway.app/health` - should return `{"status":"ok"}`

### Bot Service

1. Check the Bot service logs for "Bot is ready!" message
2. The bot should appear online in Discord

### Dashboard Service

1. Visit your Dashboard service domain
2. Try logging in with Discord OAuth
3. Verify API calls work correctly

## Health Checks

Railway automatically monitors services. The API service has a health check endpoint:

- **Endpoint**: `/health`
- **Response**: `{"status":"ok"}`

## Troubleshooting

### API Service Issues

- **Port binding errors**: Railway provides `PORT` env var automatically - ensure your code uses `process.env.PORT`
- **CORS errors**: Verify `DASHBOARD_URL_PROD` matches your Dashboard service domain exactly
- **Database connection**: Check `MONGODB_URI` is correct and database allows Railway IPs

### Bot Service Issues

- **Bot not starting**: Check `DISCORD_BOT_TOKEN` is valid
- **Database connection**: Same as API - verify `MONGODB_URI`
- **Bot offline**: Check service logs for errors

### Dashboard Service Issues

- **Build errors - Rollup module not found**: 
  - Error: `Cannot find module @rollup/rollup-linux-x64-gnu`
  - **Solution**: This is now fixed automatically. The build process includes optional dependencies and a postinstall script ensures Rollup binaries are installed
  - If you still see this error, ensure `npm install --include=optional` is used (already configured in `railway.json`)
- **API calls failing**: Verify `VITE_API_URL` is set correctly and matches API service domain
- **OAuth not working**: 
  - Check `DISCORD_REDIRECT_URI` in API service matches Discord OAuth redirects
  - Verify `DASHBOARD_URL_PROD` in API service matches Dashboard domain
- **Build errors**: Check that all environment variables are set before build

### Common Issues

1. **Environment variables not updating**: 
   - For Dashboard, `VITE_API_URL` must be set before build - redeploy after changing
   - Other variables can be updated without redeploy

2. **Services can't communicate**:
   - Use the Railway-generated domains, not localhost
   - Ensure all URLs use `https://`

3. **Database connection issues**:
   - **MongoDB Atlas IP Whitelisting**: This is the most common issue. See Step 3.5 above for detailed instructions
   - **Connection String Format**: Verify `MONGODB_URI` is correct: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`
   - **Authentication**: Ensure database username/password are correct and URL-encoded
   - **Network Access**: Check MongoDB Atlas → Network Access shows `0.0.0.0/0` is whitelisted
   - **Error Messages**: Services now provide detailed error messages with retry logic (3 attempts with exponential backoff)
   - **Service Logs**: Check Railway service logs for specific MongoDB connection error details

## Service Dependencies

- **API** and **Bot** both need MongoDB
- **Dashboard** depends on **API** for all data
- **API** needs **Dashboard** URL for CORS and OAuth redirects
- **Bot** needs **Dashboard** URL for welcome messages

## Monitoring

Railway provides:
- Real-time logs for each service
- Metrics (CPU, memory, network)
- Deployment history
- Automatic restarts on failure

## Updating Services

1. Push changes to your GitHub repository
2. Railway automatically detects changes and redeploys
3. For Dashboard, ensure `VITE_API_URL` is set before build

## Cost Considerations

Railway offers:
- Free tier with $5 credit/month
- Pay-as-you-go pricing
- Each service is billed separately

Monitor usage in Railway dashboard → Usage tab.

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: Check your repository's issue tracker



