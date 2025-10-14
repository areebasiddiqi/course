import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    // Check if BLOB_READ_WRITE_TOKEN is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN environment variable is not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const path = formData.get('path') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Create a unique filename to avoid conflicts
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `${path || 'uploads'}/${fileName}`

    console.log('Server-side upload:', { fileName, filePath, size: file.size, type: file.type })

    // Upload to Vercel Blob using server-side token
    const blob = await put(filePath, file, {
      access: 'public'
    })

    console.log('Server upload successful:', blob.url)

    return NextResponse.json({
      success: true,
      url: blob.url,
      size: file.size,
      type: file.type,
      name: file.name,
      originalName: file.name,
      fileName: fileName
    })

  } catch (error) {
    console.error('Server upload error:', error)
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
