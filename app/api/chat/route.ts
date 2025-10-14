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
    const { message, courseId, userId, conversationHistory } = await request.json()

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      )
    }

    // Get course context if courseId is provided
    let courseContext = ''
    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('name, subject, description')
        .eq('id', courseId)
        .eq('user_id', userId)
        .single()

      if (course) {
        courseContext = `\n\nCourse Context: You are helping with "${course.name}" (${course.subject}). ${course.description || ''}`
      }
    }

    // Get user's recent study sessions for additional context
    const { data: recentSessions } = await supabase
      .from('study_sessions')
      .select(`
        activity_type,
        notes,
        courses(name, subject)
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(5)

    let studyContext = ''
    if (recentSessions && recentSessions.length > 0) {
      const activities = recentSessions.map((s: any) => 
        `${s.activity_type} in ${s.courses?.name || 'Unknown Course'}`
      ).join(', ')
      studyContext = `\n\nRecent Study Activities: ${activities}`
    }

    // Build conversation history for context
    const messages = [
      {
        role: 'system' as const,
        content: `You are StudyGram AI, an intelligent study assistant designed to help students learn more effectively. You are knowledgeable, encouraging, and focused on education.

Your capabilities include:
- Explaining complex concepts in simple terms
- Creating study summaries and notes
- Generating practice questions and quizzes
- Providing study strategies and tips
- Helping with homework and assignments
- Breaking down difficult topics into manageable parts

Guidelines:
- Always be encouraging and supportive
- Provide clear, structured responses
- Use examples when explaining concepts
- Suggest follow-up questions or activities
- Keep responses focused on learning and education
- If you don't know something, admit it and suggest resources

${courseContext}${studyContext}`
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.'

    // Track usage for the user
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
      response,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0
      }
    })

  } catch (error) {
    console.error('OpenAI API error:', error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}
