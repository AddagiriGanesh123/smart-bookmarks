# Smart Bookmarks - AI-Powered Bookmark Manager

A Next.js application that helps users manage and organize their bookmarks with AI-powered categorization using Google's Gemini API.

## 🚀 Live Demo

[https://smart-bookmarks-chi.vercel.app](https://smart-bookmarks-chi.vercel.app)

## 📋 Features

- **Google OAuth Authentication** - Secure login using Supabase Auth
- **AI-Powered Categorization** - Automatic bookmark categorization using Gemini API
- **Smart Organization** - Create and manage bookmark collections
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Real-time Updates** - Instant bookmark management with Supabase

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Supabase (Database & Authentication)
- **AI Integration:** Google Gemini API
- **Deployment:** Vercel

## 🔧 Installation & Setup

1. Clone the repository:
```bash
git clone https://github.com/AddagiriGanesh123/smart-bookmarks.git
cd smart-bookmarks
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

## 🚧 Challenges Faced & Solutions

### 1. **OAuth Redirect Issue - "localhost refused to connect"**
**Problem:** After deploying to Vercel, Google OAuth was redirecting users back to `localhost:3000` instead of the production URL, causing "ERR_CONNECTION_REFUSED" errors on mobile devices.

**Solution:**
- Added `NEXT_PUBLIC_SITE_URL` environment variable in Vercel
- Updated the OAuth callback URL in `app/login/page.tsx` to use the environment variable
- Configured Supabase authentication to include production callback URLs
- Changed hardcoded `http://localhost:3000` to `https://smart-bookmarks-chi.vercel.app`

### 2. **Environment Variables Not Working in Production**
**Problem:** The app worked locally but failed in production due to missing environment variables.

**Solution:**
- Added all environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`) to Vercel project settings
- Ensured variables were set for "Production" environment
- Redeployed after adding environment variables

### 3. **Supabase Authentication Configuration**
**Problem:** Google OAuth login was not working due to incorrect redirect URL configuration.

**Solution:**
- Updated Supabase Authentication settings:
  - Site URL: `https://smart-bookmarks-chi.vercel.app`
  - Redirect URLs: `https://smart-bookmarks-chi.vercel.app/**`
- Ensured Google OAuth credentials matched the production domain

## 📦 Deployment

The application is deployed on Vercel:
```bash
vercel --prod
```

## 🔑 Key Learnings

- Importance of environment variables in production deployments
- Understanding OAuth callback flows and redirect URLs
- Configuring authentication providers for production environments
- Debugging network issues on mobile devices
- Managing secrets and API keys securely

## 👨‍💻 Author

Ganesh Addagiri
- Email: saiganeshbyp2002@gmail.com
- GitHub: [@AddagiriGanesh123](https://github.com/AddagiriGanesh123)

## 📝 License

This project was created as part of a coding challenge.
