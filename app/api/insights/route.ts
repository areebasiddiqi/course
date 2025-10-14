import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, type } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'UserId is required' },
        { status: 400 }
      )
    }

    // Fetch user's learning data
    const { data: userProgress } = await supabase.from('user_progress').select('*').eq('user_id', userId).single()
    const { data: courses } = await supabase.from('courses').select('*').eq('user_id', userId)
    const { data: studySessions } = await supabase.from('study_sessions').select('*').eq('user_id', userId).order('start_time', { ascending: false }).limit(20)
    const { data: assessmentAttempts } = await supabase.from('assessment_attempts').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(10)
    const { data: achievements } = await supabase.from('achievements').select('*').in('name', userProgress?.achievements || [])

    // Calculate learning metrics
    const totalStudyTime = studySessions?.reduce((acc, session) => acc + session.duration, 0) || 0
    const averageScore = (assessmentAttempts && assessmentAttempts.length > 0) 
      ? assessmentAttempts.reduce((acc, attempt) => acc + (attempt.score / attempt.total_points * 100), 0) / assessmentAttempts.length
      : 0
    const recentPerformance = assessmentAttempts?.slice(0, 5).map(a => (a.score / a.total_points * 100)) || []
    const studyStreak = userProgress?.current_streak || 0
    const completedCourses = courses?.filter(c => c.file_count > 0).length || 0

    let prompt = ''
    let systemMessage = ''

    switch (type) {
      case 'study_recommendations':
        systemMessage = 'You are an AI study advisor. Provide personalized study recommendations based on the user\'s learning data.'
        prompt = `Based on this learning data, provide 3-4 specific study recommendations:

Learning Statistics:
- Total study time: ${Math.floor(totalStudyTime / 60)} hours
- Current streak: ${studyStreak} days
- Average assessment score: ${averageScore.toFixed(1)}%
- Recent scores: ${recentPerformance.join(', ')}%
- Active courses: ${courses?.length || 0}
- Completed courses: ${completedCourses}

Recent study sessions: ${studySessions?.slice(0, 5).map(s => `${s.activity_type} (${s.duration}min)`).join(', ')}

Provide actionable recommendations to improve their learning efficiency and performance.`
        break

      case 'performance_analysis':
        systemMessage = 'You are an AI learning analyst. Analyze the user\'s performance patterns and provide insights.'
        prompt = `Analyze this learning performance data and provide insights:

Performance Metrics:
- Average score: ${averageScore.toFixed(1)}%
- Recent assessment scores: ${recentPerformance.join(', ')}%
- Study consistency: ${studyStreak} day streak
- Total study time: ${Math.floor(totalStudyTime / 60)} hours
- Study sessions: ${studySessions?.length || 0} recent sessions

Study patterns: ${studySessions?.slice(0, 10).map(s => `${s.activity_type} on ${new Date(s.start_time).toLocaleDateString()}`).join(', ')}

Identify strengths, weaknesses, and trends in their learning performance.`
        break

      case 'goal_suggestions':
        systemMessage = 'You are an AI goal-setting coach. Suggest realistic and motivating learning goals.'
        prompt = `Based on this learning profile, suggest 3-4 SMART learning goals:

Current Status:
- Study streak: ${studyStreak} days
- Weekly study time: ${Math.floor(totalStudyTime / 60)} hours total
- Performance level: ${averageScore.toFixed(1)}% average
- Active subjects: ${courses?.map(c => c.subject).join(', ') || 'None'}
- Achievements unlocked: ${achievements?.length || 0}

Recent activity: ${studySessions?.slice(0, 3).map(s => s.activity_type).join(', ')}

Suggest specific, measurable, achievable goals for the next week and month.`
        break

      case 'motivation_boost':
        systemMessage = 'You are an AI motivational coach. Provide encouraging and inspiring messages based on the user\'s progress.'
        prompt = `Create a motivational message celebrating progress and encouraging continued learning:

Achievements:
- ${studyStreak} day study streak
- ${Math.floor(totalStudyTime / 60)} total hours studied
- ${averageScore.toFixed(1)}% average performance
- ${achievements?.length || 0} achievements unlocked
- ${courses?.length || 0} courses in progress

Recent improvements: ${recentPerformance.length > 1 ? 
  (recentPerformance[0] > recentPerformance[recentPerformance.length - 1] ? 'Scores trending upward' : 'Consistent performance') : 
  'Getting started'}

Provide an encouraging message that acknowledges their efforts and motivates continued learning.`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid insight type' },
          { status: 400 }
        )
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    const insight = completion.choices[0]?.message?.content || 'Unable to generate insight at this time.'

    // Track usage
    await supabase
      .from('usage_stats')
      .upsert({
        user_id: userId,
        ai_queries_used: 1
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })

    return NextResponse.json({ 
      insight,
      type,
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('OpenAI Insights API error:', error)
    
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
