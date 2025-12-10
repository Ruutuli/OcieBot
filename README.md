# OcieBot

A cute, modern, user-driven OC management & community Discord bot.

## Features

- **OC Storage**: Store and manage OCs with all their details
- **Birthday System**: Automated birthday announcements
- **Character of the Week**: Weekly automated OC spotlights
- **QOTD System**: User-submitted questions of the day
- **Prompt System**: User-submitted RP prompts
- **Trivia System**: User-created trivia games
- **Modern Dashboard**: Beautiful web interface for managing everything

## Project Structure

- `bot/` - Discord bot (Discord.js + TypeScript)
- `api/` - REST API server (Express + TypeScript)
- `dashboard/` - React web dashboard

## Setup

### Prerequisites

- Node.js 18+ and npm
- MongoDB database
- Discord Bot Token and OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd OcieBot
```

2. Install dependencies:
```bash
npm install
cd bot && npm install
cd ../api && npm install
cd ../dashboard && npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application client ID
- `DISCORD_CLIENT_SECRET` - Your Discord application client secret
- `DISCORD_REDIRECT_URI` - OAuth redirect URI (e.g., `http://localhost:5000/api/auth/callback`)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token generation
- `API_PORT` - API server port (default: 5000)
- `DASHBOARD_URL` - Dashboard URL (default: `http://localhost:3000`)

4. Start development servers:
```bash
# Terminal 1: Bot
npm run dev:bot

# Terminal 2: API
npm run dev:api

# Terminal 3: Dashboard
npm run dev:dashboard
```

## Commands

### Setup & Configuration
- `/ocie setup` - Start the setup wizard
- `/ocie settings` - View current settings
- `/ocie set` - Set specific configuration values
- `/ocie feature` - Toggle features on/off
- `/ocie help` - Show help information

### OC Management
- `/oc add` - Add a new OC
- `/oc edit` - Edit an OC
- `/oc delete` - Delete an OC
- `/oc view` - View an OC card
- `/oc list` - List OCs (with filters)
- `/oc random` - Get a random OC
- `/oc playlist add/remove/view/shuffle` - Manage OC playlists
- `/oc notes add/view` - Manage OC notes

### Birthdays
- `/birthday set` - Set an OC's birthday
- `/birthday clear` - Clear an OC's birthday
- `/birthday list` - List all birthdays
- `/birthday month` - Birthdays this month
- `/birthday today` - Birthdays today

### Character of the Week
- `/cotw current` - View current COTW
- `/cotw history` - View COTW history
- `/cotw reroll` - Reroll COTW (admin only)

### QOTD
- `/qotd add` - Add a QOTD
- `/qotd remove` - Remove a QOTD
- `/qotd list` - List all QOTDs
- `/qotd ask` - Ask a random QOTD

### Prompts
- `/prompt add` - Add a prompt
- `/prompt remove` - Remove a prompt
- `/prompt list` - List all prompts
- `/prompt random` - Get a random prompt
- `/prompt use` - Post a prompt to the configured channel

### Trivia
- `/trivia add` - Add a trivia question
- `/trivia remove` - Remove a trivia question
- `/trivia list` - List all trivia
- `/trivia start` - Start a trivia game
- `/trivia answer` - Answer the current trivia question

### Fandoms
- `/fandom directory` - List all fandoms
- `/fandom info` - Get info about a specific fandom

### Stats
- `/stats` - View server statistics

## Dashboard

The dashboard is available at `http://localhost:3000` (or your configured `DASHBOARD_URL`).

Features:
- View and manage OCs
- Browse fandoms
- View birthday calendar
- Manage QOTDs, prompts, and trivia
- View statistics
- Configure bot settings

## Development

### Building

```bash
npm run build:bot
npm run build:api
npm run build:dashboard
```

### Project Structure

```
OcieBot/
├── bot/              # Discord bot
│   └── src/
│       ├── commands/ # Slash commands
│       ├── modules/  # Feature modules (birthday, cotw, qotd)
│       ├── database/ # MongoDB models
│       └── services/ # Business logic
├── api/              # REST API
│   └── src/
│       ├── routes/   # API routes
│       └── middleware/ # Auth, validation
└── dashboard/         # React dashboard
    └── src/
        ├── pages/    # Dashboard pages
        └── components/ # React components
```

## License

MIT



For the API:
cd api
npm run dev

For the Bot:
cd bot
npm run dev

Or from the root:
npm run dev:api
npm run dev:bot

npm run dev:dashboard

   cd dashboard
   npm run dev