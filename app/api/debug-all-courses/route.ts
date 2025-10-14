import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()

    // Get all courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    // Get all course files
    const { data: allFiles, error: filesError } = await supabase
      .from('course_files')
      .select('*')
      .order('upload_date', { ascending: false })

    // Get courses with file counts
    const { data: coursesWithFiles, error: joinError } = await supabase
      .from('courses')
      .select(`
        *,
        course_files(count)
      `)

    return NextResponse.json({
      courses: courses || [],
      allFiles: allFiles || [],
      coursesWithFiles: coursesWithFiles || [],
      errors: {
        coursesError,
        filesError,
        joinError
      },
      stats: {
        totalCourses: courses?.length || 0,
        totalFiles: allFiles?.length || 0,
        coursesWithFilesCount: coursesWithFiles?.filter(c => c.course_files?.[0]?.count > 0).length || 0
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { 
        error: 'Debug failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
