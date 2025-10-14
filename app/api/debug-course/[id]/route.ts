import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()

    // Fetch course with files
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        course_files(*)
      `)
      .eq('id', params.id)
      .maybeSingle()

    if (courseError) {
      return NextResponse.json({ error: courseError.message }, { status: 400 })
    }

    // Also fetch files separately to debug
    const { data: files, error: filesError } = await supabase
      .from('course_files')
      .select('*')
      .eq('course_id', params.id)

    return NextResponse.json({
      course,
      files,
      filesError,
      courseError,
      debug: {
        courseId: params.id,
        hasFiles: course?.course_files?.length > 0,
        fileCount: course?.course_files?.length || 0,
        separateFilesCount: files?.length || 0
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
