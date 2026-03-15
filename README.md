# Memory Arena 🧠⚔️

**Free & open-source alternative to Memory League**  
Competitive memory sports platform –  like Memory League but 100% free forever.  
Train and compete in Cards, Numbers, Words, Names, Images, Surprise, and more.

Built as the "Lichess of memory sports" no paywalls, no limits.

## Features (MVP roadmap)
- [ ] Timed memorization training (Cards first)
- [ ] Head-to-head realtime matches (WebSockets via Supabase)
- [ ] Global leaderboards & personal records
- [ ] Leagues, seasons, achievements
- [ ] Video upload for official ranked matches
- [ ] Multi-language support

## Setup

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key to `.env.local`
   - Run the SQL in `database-schema.sql` in your Supabase SQL editor
4. Set up Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials (Client ID and Client Secret)
   - Add authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
   - In Supabase dashboard → Authentication → Providers → Google
   - Enable Google provider and enter your Client ID and Client Secret
5. Run the development server: `npm run dev`

## Database Schema

The app uses several tables to track real-time stats:

- `user_sessions` - Tracks online users
- `game_sessions` - Active game sessions per discipline
- `arenas` - Live competition arenas
- `game_results` - Player scores and results

Run `database-schema.sql` in your Supabase dashboard to create these tables.

For testing, run `database-seed.sql` to populate sample data.

## Current Implementation

The app now uses real database data for stats display. Features include:

- ✅ Google OAuth sign-in and sign-up
- ✅ Real-time online user tracking
- ✅ Database-backed statistics
- ✅ User session management
- ✅ Dynamic navbar with auth status