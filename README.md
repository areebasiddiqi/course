# Studygram - AI-Powered Study Platform

A comprehensive learning platform that transforms your study experience with AI-powered tools, course management, and collaborative features.

## Features

### 🧠 AI-Powered Study Tools
- **AI Study Assistant**: Conversational AI that understands your course content
- **Automatic Summarization**: Generate concise summaries from uploaded materials
- **Audio Lecture Generation**: Convert text to speech for on-the-go learning
- **Smart Recommendations**: Personalized study suggestions based on your progress

### 📚 Course Management
- **File Upload**: Support for PDF, PowerPoint, Word, Images, and Text files
- **Intelligent Organization**: Automatic categorization and tagging
- **Course Library**: Visual dashboard with search and filter capabilities
- **File Preview**: In-browser document viewing

### 🎯 Assessment & Testing
- **Mock Test Generation**: AI-generated practice tests from your content
- **Multiple Question Types**: MCQ, True/False, Short Answer, Essay, Fill-in-blanks
- **Instant Grading**: Automatic scoring with detailed feedback
- **Performance Analytics**: Track your progress over time

### 👥 Social & Collaboration
- **Study Groups**: Create and join subject-specific communities
- **Real-time Chat**: Group messaging with file sharing
- **Virtual Study Rooms**: Online collaborative spaces
- **Resource Sharing**: Exchange notes, summaries, and assessments

### 🏆 Gamification
- **XP & Leveling**: Earn experience points for study activities
- **Study Streaks**: Track consecutive study days
- **Achievements**: Unlock badges for milestones
- **Virtual Companions**: Choose and customize your study buddy

### 💳 Subscription Plans
- **Free Plan**: Basic features with limited usage
- **Semester Plan ($15/4 months)**: Enhanced features for a semester
- **Session Plan ($25/12 months)**: Premium features for a full academic year

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **File Storage**: Vercel Blob
- **Payments**: Stripe
- **AI Integration**: OpenAI API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Vercel account (for blob storage)
- Stripe account (for payments)
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd studygram-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Stripe Configuration
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Vercel Blob Storage
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
   ```

4. **Set up Supabase database**
   
   Run the SQL commands in `lib/database.sql` in your Supabase SQL editor to create the database schema.

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Setup

The application uses Supabase PostgreSQL with the following main tables:

- `users` - User profiles and subscription information
- `courses` - Course metadata and organization
- `course_files` - Uploaded file information
- `assessments` - Generated tests and quizzes
- `study_groups` - Group information and settings
- `messages` - Group chat messages
- `user_progress` - XP, levels, and achievements

Run the SQL schema in `lib/database.sql` to set up all tables, indexes, and Row Level Security policies.

## API Routes

- `/api/upload` - File upload handling with Vercel Blob
- `/api/ai/chat` - AI assistant conversations
- `/api/ai/summarize` - Content summarization
- `/api/stripe/webhooks` - Stripe payment webhooks
- `/api/assessments/generate` - AI test generation

## Deployment

### Vercel Deployment

1. **Connect your repository to Vercel**
2. **Set environment variables in Vercel dashboard**
3. **Deploy**

The application will automatically deploy when you push to your main branch.

### Environment Configuration

Make sure to set all required environment variables in your deployment platform:

- Supabase credentials
- Stripe API keys
- OpenAI API key
- Vercel Blob token

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@studygram.com or join our Discord community.

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced AI tutoring
- [ ] Integration with LMS platforms
- [ ] Offline study mode
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

---

Built with ❤️ for students worldwide
