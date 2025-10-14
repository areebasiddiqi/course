# Vercel Blob Storage Setup

This guide explains how to set up Vercel Blob storage for file uploads in the StudyGram platform.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Project Deployed**: Your project should be deployed on Vercel

## Setup Steps

### 1. Enable Blob Storage

1. Go to your Vercel dashboard
2. Select your project
3. Navigate to the **Storage** tab
4. Click **Create Database** and select **Blob**
5. Choose a name for your blob store (e.g., "studygram-files")
6. Click **Create**

### 2. Get Your Blob Token

1. After creating the blob store, you'll see connection details
2. Copy the **BLOB_READ_WRITE_TOKEN** value
3. This token allows your application to read and write files

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```env
BLOB_READ_WRITE_TOKEN=your_blob_token_here
```

**For Production:**
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `BLOB_READ_WRITE_TOKEN` with your token value
4. Redeploy your application

### 4. Test the Setup

You can test if blob storage is working by:

1. **Using the test endpoint**: Send a POST request to `/api/test-upload` with a file
2. **Upload a course**: Try uploading a course with files through the UI
3. **Check browser console**: Look for upload progress logs

## File Upload Flow

1. **User selects files** in the course upload form
2. **Files are validated** (type, size, etc.)
3. **Each file is uploaded** to Vercel Blob with a unique path
4. **File metadata is saved** to Supabase database
5. **Files can be accessed** via their blob URLs

## File Storage Structure

Files are stored with the following path structure:
```
courses/{user_id}/{timestamp}-{sanitized_filename}
```

Example:
```
courses/123e4567-e89b-12d3-a456-426614174000/1698765432123-Advanced_React_Notes.pdf
```

## Supported File Types

- **Documents**: PDF, DOC, DOCX, TXT
- **Presentations**: PPT, PPTX
- **Images**: PNG, JPG, JPEG, GIF, WEBP

## File Size Limits

- **Maximum file size**: 50MB per file
- **Total storage**: Depends on your Vercel plan

## Security Features

- **Authentication**: Only authenticated users can upload files
- **User isolation**: Files are stored in user-specific folders
- **Public access**: Files are publicly accessible via their URLs (for easy sharing)
- **Unique filenames**: Prevents conflicts and overwrites

## Troubleshooting

### Common Issues

1. **"BLOB_READ_WRITE_TOKEN not configured"**
   - Ensure the environment variable is set correctly
   - Restart your development server after adding the variable

2. **Upload fails with 400 error**
   - Check file size (must be under 50MB)
   - Verify file type is supported
   - Check browser console for detailed error messages

3. **Files not appearing in course**
   - Check if the upload completed successfully
   - Verify the file was saved to the database
   - Check the course files query in the course detail page

### Debug Steps

1. **Check environment variables**:
   ```bash
   echo $BLOB_READ_WRITE_TOKEN
   ```

2. **Test blob connection**:
   ```bash
   curl -X POST http://localhost:3000/api/test-upload \
     -F "file=@test.pdf"
   ```

3. **Check browser console** for upload progress and error messages

4. **Verify database records** in Supabase `course_files` table

## Cost Considerations

- **Free tier**: 1GB storage, 1GB bandwidth per month
- **Pro plan**: $20/month for 100GB storage, 1TB bandwidth
- **Enterprise**: Custom pricing for larger needs

## Best Practices

1. **File naming**: Use descriptive, unique filenames
2. **File organization**: Keep files organized by course and user
3. **Error handling**: Always handle upload failures gracefully
4. **Progress indication**: Show upload progress to users
5. **File validation**: Validate files before uploading

## API Endpoints

- **`/api/upload`**: Handles Vercel Blob uploads
- **`/api/test-upload`**: Test endpoint for debugging uploads

## Next Steps

After setting up Vercel Blob:

1. **Test file uploads** through the course creation form
2. **Verify file access** in the course detail pages
3. **Monitor usage** in your Vercel dashboard
4. **Set up file processing** (optional) for advanced features like text extraction

## Support

If you encounter issues:

1. Check the [Vercel Blob documentation](https://vercel.com/docs/storage/vercel-blob)
2. Review the browser console for error messages
3. Test with the debug endpoint first
4. Ensure all environment variables are properly configured
