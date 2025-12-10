# 🚀 Quick Start - Running OcieBot

## ✅ Step 1: Dependencies Installed!

All dependencies have been installed. Now you need to:

## 📝 Step 2: Set Up Environment Variables

1. **Copy the example file:**
   ```powershell
   copy .env.example .env
   ```

2. **Edit `.env` file** with your actual values:

### Get Discord Credentials:
1. Go to https://discord.com/developers/applications
2. Create a new application (or use existing)
3. Go to **Bot** tab → Copy the **Token** → Paste as `DISCORD_BOT_TOKEN`
4. Go to **OAuth2** tab:
   - Copy **Client ID** → Paste as `DISCORD_CLIENT_ID`
   - Copy **Client Secret** → Paste as `DISCORD_CLIENT_SECRET`
   - Add redirect: `http://localhost:5000/api/auth/callback`

### MongoDB:
- **Local MongoDB:** `mongodb://localhost:27017/ociebot`
- **MongoDB Atlas:** Get connection string from your cluster

### Generate JWT Secret:
```powershell
# In PowerShell, run:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## 🗄️ Step 3: Start MongoDB

Make sure MongoDB is running on your system.

**Check if running:**
```powershell
# Try connecting (should work if running)
mongosh
```

If not running, start it (depends on your installation method).

## 🎮 Step 4: Run All Services

Open **3 separate PowerShell windows** (or use Windows Terminal with tabs):

### Window 1 - Bot:
```powershell
cd C:\Users\Ruu\Desktop\OcieBot\bot
npm run dev
```

### Window 2 - API:
```powershell
cd C:\Users\Ruu\Desktop\OcieBot\api
npm run dev
```

### Window 3 - Dashboard:
```powershell
cd C:\Users\Ruu\Desktop\OcieBot\dashboard
npm run dev
```

## ✅ Step 5: Invite Bot to Server

1. Go to https://discord.com/developers/applications
2. Select your app → **OAuth2** → **URL Generator**
3. Select:
   - **Scopes:** `bot`, `applications.commands`
   - **Bot Permissions:** 
     - Manage Roles
     - Send Messages
     - Embed Links
     - Read Message History
4. Copy the generated URL and open in browser
5. Select your server and authorize

## 🎉 Step 6: Test It!

1. **In Discord:** Type `/ocie help`
2. **In Dashboard:** Open http://localhost:3000

## 📋 What You Should See:

**Bot Window:**
```
✅ Connected to MongoDB
✅ OcieBot#1234 is ready!
✅ Bot is fully initialized!
```

**API Window:**
```
✅ API: Connected to MongoDB
✅ API server running on port 5000
```

**Dashboard Window:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

## 🆘 Troubleshooting

**"Cannot find module" errors:**
- Make sure you ran `npm install` in each directory
- Try deleting `node_modules` and reinstalling

**MongoDB connection errors:**
- Check MongoDB is running
- Verify `MONGODB_URI` in `.env` is correct

**Discord token errors:**
- Verify token is correct (no extra spaces)
- Make sure bot is invited to server

**Port already in use:**
- Change `API_PORT` in `.env` to a different port (e.g., 5001)
- Or close the program using that port

## 🎯 Next Steps After Running:

1. Run `/ocie setup` in Discord to configure channels
2. Add your first OC: `/oc add name:MyOC fandom:MyFandom`
3. Explore the dashboard at http://localhost:3000

Happy botting! ✨

