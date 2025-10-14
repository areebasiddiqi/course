import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const checks = {
      blobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      openaiKey: !!process.env.OPENAI_API_KEY,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV
    }

    const allGood = checks.blobToken && checks.supabaseUrl && checks.supabaseKey

    return NextResponse.json({
      status: allGood ? 'ready' : 'missing_config',
      checks,
      message: allGood 
        ? 'All required environment variables are configured'
        : 'Some required environment variables are missing'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to check environment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
