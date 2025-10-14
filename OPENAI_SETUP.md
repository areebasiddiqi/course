# OpenAI Integration Setup

This document explains how to set up OpenAI integration for the StudyGram platform.

## Prerequisites

1. **OpenAI API Account**: Sign up at [OpenAI Platform](https://platform.openai.com/)
2. **API Key**: Generate an API key from your OpenAI dashboard

## Installation

The OpenAI package is already included in `package.json`. Install dependencies:

```bash
npm install
```

## Configuration

1. **Environment Variables**: Copy `.env.example` to `.env.local` and add your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

2. **API Key Setup**:
   - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Copy the key and add it to your `.env.local` file

## Features

### 1. AI Chatbot (`/dashboard/ai-assistant`)

- **Real-time conversations** with OpenAI GPT-3.5-turbo
- **Course-specific context** based on user's enrolled courses
- **Conversation history** for better context understanding
- **Study session integration** for personalized responses

**API Endpoint**: `/api/chat`

### 2. Dashboard Insights (`/dashboard`)

- **Personalized study recommendations** based on learning patterns
- **Performance analysis** with actionable insights
- **Goal suggestions** tailored to user progress
- **Motivational messages** to encourage continued learning

**API Endpoint**: `/api/insights`

**Available Insight Types**:
- `study_recommendations` - Personalized study tips
- `performance_analysis` - Learning pattern analysis
- `goal_suggestions` - SMART goal recommendations
- `motivation_boost` - Encouraging messages

## Usage Examples

### Chat API
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Explain quantum physics in simple terms",
    courseId: "course-123",
    userId: "user-456",
    conversationHistory: []
  })
})
```

### Insights API
```javascript
const response = await fetch('/api/insights', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: "user-456",
    type: "study_recommendations"
  })
})
```

## Data Integration

The AI system leverages user data from Supabase:

- **User Progress**: XP, level, streaks, achievements
- **Study Sessions**: Activity patterns, duration, subjects
- **Course Data**: Enrolled courses, subjects, materials
- **Assessment Results**: Scores, performance trends
- **Learning Goals**: Current objectives and progress

## Rate Limiting & Usage Tracking

- **Usage tracking** stored in `usage_stats` table
- **Token consumption** monitored for cost management
- **Error handling** with graceful fallbacks

## Model Configuration

**Current Setup**:
- Model: `gpt-3.5-turbo`
- Max tokens: 1000 (chat), 500 (insights)
- Temperature: 0.7
- Presence penalty: 0.1
- Frequency penalty: 0.1

## Security Considerations

1. **API Key Protection**: Never expose API keys in client-side code
2. **User Authentication**: All endpoints require valid user ID
3. **Input Validation**: Sanitize user inputs before sending to OpenAI
4. **Rate Limiting**: Implement usage limits per user
5. **Error Handling**: Don't expose internal errors to users

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Ensure `OPENAI_API_KEY` is set in `.env.local`
   - Restart the development server after adding the key

2. **"Failed to get AI response"**
   - Check OpenAI API status
   - Verify API key has sufficient credits
   - Check network connectivity

3. **TypeScript errors**
   - Run `npm install` to ensure OpenAI package is installed
   - Restart TypeScript server in your IDE

### Testing

Test the integration:

1. **Chat functionality**: Go to `/dashboard/ai-assistant` and send a message
2. **Dashboard insights**: Visit `/dashboard` and click "Generate Insights"
3. **API endpoints**: Use tools like Postman to test API routes directly

## Cost Management

- **Monitor usage** in OpenAI dashboard
- **Set usage limits** to prevent unexpected charges
- **Optimize prompts** to reduce token consumption
- **Cache responses** where appropriate

## Future Enhancements

- **GPT-4 integration** for advanced reasoning
- **Function calling** for dynamic tool usage
- **Embeddings** for semantic search in course materials
- **Fine-tuning** on educational content
- **Voice integration** with Whisper API
