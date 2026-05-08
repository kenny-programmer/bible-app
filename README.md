# Spiritual Study Buddy

A comprehensive Bible study companion application designed to help people deepen their understanding of Scripture through AI-powered guidance, interactive reading tools, and personalized study features.

## About

Created by **Victor Roxas** - [victorroxas.vercel.app](https://victorroxas.vercel.app/)

This application was built to make Bible study more accessible, engaging, and meaningful for everyone. Whether you're a new believer or have been studying Scripture for years, Spiritual Study Buddy provides the tools and guidance you need to grow in your faith.

## Features

### 🤖 AI Spiritual Counselor
- Have meaningful conversations with an AI counselor trained in biblical teachings
- Ask questions about Scripture, theology, and faith
- Receive personalized guidance grounded in God's Word
- Get relevant Bible verses included in responses
- Save and revisit past counseling sessions

### 📖 Interactive Bible Reader
- Read the Bible with a clean, distraction-free interface
- Multiple Bible versions supported (KJV and more)
- Navigate easily through books, chapters, and verses
- Bookmark important verses for quick reference
- Track your reading progress across different books

### 🌅 Daily Verse
- Start each day with an inspiring Bible verse
- Discover new Scripture to meditate on
- View daily verses that appear on your first visit each day

### 📚 Study Tools
- Create and manage personal bookmarks
- Add notes to your favorite verses
- Track reading progress through different Bible books
- Organize your study materials efficiently

### 🔒 Secure & Private
- User authentication powered by Supabase
- All your data is private and secure
- Row Level Security ensures your information stays yours
- No data is shared without your permission

## Tech Stack

- **Frontend**: Next.js 13, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Google Gemini API via Supabase Edge Functions
- **Deployment**: Netlify / Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account
- A Google Gemini API key

### Installation

1. Clone this repository
```bash
git clone <repo-url>
cd repo_folder
```

2. Install dependencies
```bash
npm install
```

3. Set up your Supabase database
   - Create a new Supabase project
   - Run the migrations (single command) in `DATABASE_SETUP.md`

4. Configure environment variables
   - Copy `.env.example` to `.env` (or create a new `.env` file)
   - Add your Supabase credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     GEMINI_API_KEY=your_gemini_api_key
     ```

5. **CRITICAL**: Configure Edge Function Secret
   - Go to your Supabase Dashboard
   - Navigate to Edge Functions → Manage Secrets
   - Add a secret named `GEMINI_API_KEY` with your Google Gemini API key
   - This is required for the AI chat feature to work

6. Deploy the Edge Function
   - The chat edge function is located at `supabase/functions/chat/index.ts`
   - Deploy it to your Supabase project
   - See `DATABASE_SETUP.md` (includes required secrets)

7. Run the development server
```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Setup

The application uses Supabase for data persistence. See `DATABASE_SETUP.md` for the single migration command and required secrets.

### Database Tables

- **profiles** - User profile information and preferences
- **counseling_sessions** - AI chat session history
- **messages** - Individual messages in chat sessions
- **bookmarks** - Saved Bible verses with notes
- **reading_progress** - Reading progress tracking per book
- **daily_verse_views** - Daily verse view tracking

## Project Structure

```
spiritual-study-buddy/
├── app/                      # Next.js app directory
│   ├── actions/             # Server actions
│   │   └── chat.ts          # AI chat functionality
│   ├── auth/                # Authentication pages
│   ├── page.tsx             # Main application page
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── ai-assistant.tsx     # AI chat interface
│   ├── bible-reader.tsx     # Bible reading component
│   ├── bible-navigator.tsx  # Bible navigation
│   ├── daily-verse.tsx      # Daily verse popup
│   └── sidebar.tsx          # Main navigation
├── lib/                     # Utility libraries
│   ├── supabase-client.ts   # Supabase client setup
│   ├── bible-api.ts         # Bible API integration
│   └── auth-context.tsx     # Authentication context
├── supabase/
│   ├── functions/           # Edge functions
│   │   └── chat/            # AI chat edge function
│   └── migrations/          # Database migrations
├── DATABASE_SETUP.md        # Database setup guide
└── README.md               # This file
```

## How It Works

### AI Chat with Geographic Restriction Bypass

The AI counselor feature uses Google's Gemini API, which has geographic restrictions. To ensure the app works globally, the implementation uses a Supabase Edge Function:

1. User sends a message from the frontend
2. Next.js server action calls the Supabase Edge Function
3. Edge Function (running in a supported region) calls the Gemini API
4. Response is returned to the user

This architecture ensures the AI features work regardless of the user's location.

### Authentication Flow

1. Users sign up with email and password via Supabase Auth
2. A database trigger automatically creates a user profile
3. Row Level Security policies ensure users only access their own data
4. Session management is handled by Supabase Auth

### Bible Reading

Bible content is fetched from the Bible API and cached for performance. Users can:
- Navigate through books and chapters
- Bookmark verses with personal notes
- Track reading progress
- Switch between Bible versions

## Contributing

Contributions are welcome! If you'd like to improve this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions:

1. Check the `DATABASE_SETUP.md` for setup instructions
2. Verify your environment variables are correct
3. Ensure the Edge Function secret is configured
4. Open an issue on GitHub

## Acknowledgments

- Bible content provided by various Bible APIs
- AI powered by Google Gemini
- Database and authentication by Supabase
- UI components from shadcn/ui

---

Built with ❤️ by [Victor Roxas](https://victorroxas.vercel.app/) to help people grow in their faith and understanding of God's Word.

**"Your word is a lamp to my feet and a light to my path."** - Psalm 119:105
