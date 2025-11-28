# GameStorm

A real-time voting and gaming platform built for university events and competitions. GameStorm enables interactive team ranking, live voting events, and quiz-based games with instant results and analytics.

## Features

### 🗳️ Real-Time Voting System
- **Live Voting Hub**: Participate in active voting events with real-time updates
- **Team Ranking**: Rank up to 5 teams with intuitive selection interface
- **One Vote Per User**: Ensures fair voting with submission constraints
- **Real-time Synchronization**: Instant vote status updates using Supabase real-time channels
- **Voting States Management**: Active, started, and completed states for controlled voting flow

### 📊 Admin Dashboard
- **Access Control**: Restricted admin panel for event management
- **Vote Management**: Create, start, stop, and complete voting events
- **Live Leaderboard**:
  - Track total votes per team
  - Point-based scoring (5 pts for rank 1, decreasing to 1 pt for rank 5)
  - Average rank calculations
  - Real-time updates as votes come in
- **Submission Tracking**: View all user submissions with detailed rankings
- **Vote Analytics**: Rank distribution visualization for each team

### 🎮 Interactive Gaming System
- **Game Participation**: Join games using unique game codes
- **Timed Questions**: Multiple choice questions with configurable duration
- **Progressive Scoring**: Point values decrease over time for faster answers
- **Image Support**: Questions can include visual elements
- **Game States**: Draft → Waiting → In Progress → Paused → Completed
- **Results & Rankings**: Final scores and leaderboards

### 🔐 Authentication
- **Google OAuth**: Sign in with university email (@bmu.edu.in)
- **Session Management**: Server-side rendering with Supabase SSR
- **Protected Routes**: Middleware-based authentication for secure access
- **Admin Verification**: Email-based admin role assignment

## Tech Stack

**Frontend:**
- Next.js 15.5.3 (App Router with Turbopack)
- React 19.1.0
- TypeScript
- TailwindCSS 4
- Radix UI Components
- React Hook Form
- Recharts for analytics

**Backend:**
- Supabase (PostgreSQL + Authentication + Real-time)
- Next.js API Routes
- Supabase SSR for server-side auth

**Development:**
- Biome for linting and formatting
- TypeScript for type safety

## Getting Started

### Prerequisites

- Node.js 20+
- npm/yarn/pnpm/bun
- Supabase account
- Google OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AyushChauhan9389/gamestorm.git
cd gamestorm
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:

Run the SQL schema from `main.sql` in your Supabase SQL editor to create all necessary tables:
- `votes` - Voting events
- `vote_submissions` - User vote records
- `games` - Quiz games
- `game_participants` - Participation tracking
- `game_questions` - Quiz questions
- `game_answers` - User answers
- `teams` - Team management
- `team_members` - Team membership
- `profiles` - User profiles
- And other supporting tables

5. Configure authentication:

In Supabase dashboard:
- Enable Google OAuth provider
- Add authorized redirect URLs
- Configure email domain restrictions if needed (@bmu.edu.in)

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build

Build for production:

```bash
npm run build
npm run start
```

### Linting & Formatting

```bash
npm run lint        # Check code with Biome
npm run format      # Format code with Biome
```

## Project Structure

```
gamestorm/
├── app/                      # Next.js app directory
│   ├── dashboard/           # Main dashboard & voting hub
│   │   └── admin/          # Admin control panel
│   ├── game/               # Gaming system
│   │   └── [gameId]/       # Game pages (play, waiting, results)
│   ├── login/              # Authentication pages
│   └── api/                # API routes
├── components/             # React components
│   └── ui/                # Radix UI components
├── lib/                   # Utility functions
│   └── supabase/         # Supabase client setup
├── middleware.ts          # Auth middleware
├── main.sql              # Database schema
└── public/               # Static assets
```

## Usage

### For Users

1. **Login**: Sign in with your Google account (@bmu.edu.in)
2. **Dashboard**: View active voting events
3. **Vote**: When voting starts, rank your top 5 teams
4. **Submit**: Submit your rankings
5. **Games**: Join games using game codes

### For Admins

1. **Login**: Sign in with admin credentials
2. **Access Admin Panel**: Navigate to `/dashboard/admin`
3. **Create Vote**: Set up new voting event with team names
4. **Manage Vote**: Activate → Start → Complete voting lifecycle
5. **Monitor Results**: View real-time leaderboard and submissions
6. **Analytics**: Track vote distribution and team performance

## Database Schema

**Core Tables:**

- `votes` - Voting events with lifecycle management
- `vote_submissions` - User rankings (JSON array of team order)
- `games` - Quiz games with configuration
- `game_participants` - User participation tracking
- `game_questions` - Questions with options and scoring
- `game_answers` - User responses with points
- `teams` - Team management
- `profiles` - User profiles

## Features in Detail

### Voting Flow

1. Admin creates vote with team names
2. Admin activates vote (visible to users)
3. Admin starts voting (submissions accepted)
4. Users rank teams 1-5
5. Real-time leaderboard updates
6. Admin completes vote (submissions closed)

### Scoring System

- Rank 1: 5 points
- Rank 2: 4 points
- Rank 3: 3 points
- Rank 4: 2 points
- Rank 5: 1 point

Total points and average rank calculated for leaderboard.

### Real-time Updates

Uses Supabase real-time subscriptions for:
- Vote status changes (active, started, completed)
- Live submission counts
- Instant leaderboard updates

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.

## Support

For issues or questions, please contact the development team.

---

Built with ❤️ for campus events and competitions
