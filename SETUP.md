# OcieBot - Quick Start Guide

## Step 1: Install Dependencies

Open a terminal in the project root and run:

```bash
# Install root dependencies (if any)
npm install

# Install bot dependencies
cd bot
npm install
cd ..

# Install API dependencies
cd api
npm install
cd ..

# Install dashboard dependencies
cd dashboard
npm install
cd ..
```

Or run all at once:
```bash
npm install && cd bot && npm install && cd ../api && npm install && cd ../dashboard && npm install && cd ..
```

## Step 2: Set Up Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit the `.env` file and fill in your values:

### Required Values:

**Discord Bot Setup:**
- `DISCORD_BOT_TOKEN` - Get this from https://discord.com/developers/applications
  - Create a new application → Bot → Reset Token → Copy token
- `DISCORD_CLIENT_ID` - Your application's Client ID (found in OAuth2 section)
- `DISCORD_CLIENT_SECRET` - Your application's Client Secret (found in OAuth2 section)
- `DISCORD_REDIRECT_URI` - Set to `http://localhost:5000/api/auth/callback`
  - Also add this as a redirect URI in Discord Developer Portal → OAuth2 → Redirects

**MongoDB:**
- `MONGODB_URI` - Your MongoDB connection string
  - Local: `mongodb://localhost:27017/ociebot`
  - MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/ociebot`

**API & Dashboard:**
- `JWT_SECRET` - Any random string (e.g., generate with `openssl rand -hex 32`)
- `API_PORT` - Default: `5000`
- `DASHBOARD_URL` - Default: `http://localhost:3000`

### Example `.env` file:
```env
DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
DISCORD_CLIENT_ID=YOUR_CLIENT_ID_HERE
DISCORD_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
DISCORD_REDIRECT_URI=http://localhost:5000/api/auth/callback
MONGODB_URI=mongodb://localhost:27017/ociebot
API_PORT=5000
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
DASHBOARD_URL=http://localhost:3000
```

## Step 3: Start MongoDB

Make sure MongoDB is running:

**Local MongoDB:**
```bash
# Windows (if installed as service, it should auto-start)
# Or start manually:
mongod

# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**MongoDB Atlas:**
- No local setup needed, just use your connection string

## Step 4: Run All Services

You need **3 separate terminal windows** (or use a terminal multiplexer like `tmux`):

### Terminal 1 - Discord Bot:
```bash
cd bot
npm run dev
```

You should see:
```
✅ Connected to MongoDB
✅ OcieBot#1234 is ready!
✅ Bot is fully initialized!
```

### Terminal 2 - API Server:
```bash
cd api
npm run dev
```

You should see:
```
✅ API: Connected to MongoDB
✅ API server running on port 5000
```

### Terminal 3 - Dashboard:
```bash
cd dashboard
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
```

## Step 5: Invite Bot to Your Server

1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to OAuth2 → URL Generator
4. Select scopes: `bot` and `applications.commands`
5. Select bot permissions:
   - Manage Roles
   - Send Messages
   - Embed Links
   - Read Message History
6. Copy the generated URL and open it in your browser
7. Select your server and authorize

## Step 6: Test It Out!

1. **In Discord:**
   - Type `/ocie help` to see all commands
   - Type `/ocie setup` to configure the bot
   - Type `/oc add name:TestOC fandom:Test` to add your first OC

2. **In Dashboard:**
   - Open http://localhost:3000
   - Click "Login with Discord"
   - You'll be redirected to Discord OAuth
   - After logging in, you'll see the dashboard

## Troubleshooting

### Bot won't start:
- Check that `DISCORD_BOT_TOKEN` is correct
- Make sure MongoDB is running
- Check the bot console for error messages

### API won't start:
- Check that `MONGODB_URI` is correct
- Make sure port 5000 is not in use
- Check the API console for error messages

### Dashboard won't start:
- Make sure port 3000 is not in use
- Check that `DASHBOARD_URL` matches your setup
- Make sure the API is running first

### OAuth not working:
- Verify `DISCORD_REDIRECT_URI` matches what's in Discord Developer Portal
- Check that `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are correct
- Make sure the redirect URI is added in Discord Developer Portal → OAuth2 → Redirects

### Commands not showing:
- Wait a few minutes for Discord to sync commands globally
- Or use guild-specific commands for faster testing (modify `bot/src/utils/commandHandler.ts`)

## Next Steps

1. Run `/ocie setup` in your Discord server to configure channels and features
2. Add your first OC with `/oc add`
3. Set up birthdays, QOTDs, and other features
4. Explore the dashboard at http://localhost:3000

Enjoy using OcieBot! ✨

