import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        pathname: string,
        /* clientPayload?: string, */
      ) => {
        // Here you can implement authentication and authorization
        // For now, we'll allow all uploads but you should add proper auth
        return {
          allowedContentTypes: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain',
            'image/png',
            'image/jpeg',
            'image/gif',
            'image/webp'
          ],
          tokenPayload: JSON.stringify({
            // You can include user information here
            // userId: user.id,
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Here you can process the uploaded file
        console.log('Upload completed:', blob.url)
        
        // You could trigger file processing here
        // For example, extract text from PDFs, generate thumbnails, etc.
        
        try {
          // Example: You could call an API to process the file
          // await processUploadedFile(blob.url, tokenPayload)
        } catch (error) {
          console.error('Error processing uploaded file:', error)
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 400 }
    )
  }
}
