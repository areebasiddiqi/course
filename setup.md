# Studygram Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.local.example .env.local
```

### 3. Configure Services

#### Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your keys
3. Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

#### Database Schema
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and run the contents of `lib/database.sql`

#### Vercel Blob Storage
1. Create a Vercel account at [vercel.com](https://vercel.com)
2. Create a new blob store
3. Get your token and add to `.env.local`:
   ```env
   BLOB_READ_WRITE_TOKEN=your-blob-token
   ```

#### Stripe (for payments)
1. Create account at [stripe.com](https://stripe.com)
2. Get your API keys from the dashboard
3. Add to `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

#### OpenAI (for AI features)
1. Get API key from [openai.com](https://openai.com)
2. Add to `.env.local`:
   ```env
   OPENAI_API_KEY=sk-...
   ```

### 4. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## Features Available

✅ **Completed Features:**
- User authentication (email/password, OAuth)
- Course upload and management
- File storage with Vercel Blob
- AI study assistant (basic)
- Responsive dashboard
- Database schema with RLS

🚧 **In Progress:**
- Advanced AI features
- Assessment generation
- User profile management

📋 **Planned:**
- Subscription system with Stripe
- Gamification features
- Study groups and collaboration
- Advanced analytics

## Troubleshooting

### Common Issues

1. **Supabase Connection Error**
   - Verify your Supabase URL and keys
   - Check if your project is active

2. **File Upload Issues**
   - Ensure Vercel Blob token is correct
   - Check file size limits (50MB max)

3. **Build Errors**
   - Run `npm run type-check` to check TypeScript errors
   - Ensure all environment variables are set

### Getting Help

- Check the README.md for detailed documentation
- Review the database schema in `lib/database.sql`
- Examine component structure in `/components`

## Next Steps

1. **Customize the Platform:**
   - Update branding in components
   - Modify color scheme in `tailwind.config.js`
   - Add your own features

2. **Deploy to Production:**
   - Push to GitHub
   - Connect to Vercel
   - Set production environment variables

3. **Add Advanced Features:**
   - Implement real AI API calls
   - Add payment processing
   - Build assessment system

Happy coding! 🚀
