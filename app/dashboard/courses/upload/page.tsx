'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { useBilling } from '@/components/providers/billing-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileText, 
  Image, 
  File,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { createSupabaseClient } from '@/lib/supabase-client'
import { formatFileSize } from '@/lib/utils'
import { awardXP } from '@/lib/achievement-system'
import Link from 'next/link'

interface UploadedFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  url?: string
  error?: string
}

export default function CourseUploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { showUpgradePopup, checkCourseLimit, checkStorageLimit } = useBilling()
  const supabase = createSupabaseClient()

  const [courseName, setCourseName] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [semester, setSemester] = useState('')
  const [professor, setProfessor] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substring(7),
        status: 'pending' as const,
        progress: 0
      }))
      setFiles(prev => [...prev, ...newFiles])
    },
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach(rejection => {
        toast({
          title: 'File rejected',
          description: `${rejection.file.name}: ${rejection.errors[0]?.message}`,
          variant: 'destructive'
        })
      })
    }
  })

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFile = async (uploadedFile: UploadedFile): Promise<string> => {
    const { file } = uploadedFile
    
    // Update status to uploading
    setFiles(prev => prev.map(f => 
      f.id === uploadedFile.id 
        ? { ...f, status: 'uploading', progress: 0 }
        : f
    ))

    try {
      // Check if user is authenticated
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      console.log('Uploading file via server:', { name: file.name, size: file.size, type: file.type })

      // Use FormData to upload via server-side API (like the working test-upload)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)
      formData.append('path', `courses/${user.id}`)

      // Upload with progress tracking
      const xhr = new XMLHttpRequest()
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100)
            console.log(`Upload progress for ${file.name}: ${percentage}%`)
            setFiles(prev => prev.map(f => 
              f.id === uploadedFile.id 
                ? { ...f, progress: percentage }
                : f
            ))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText)
              console.log('Upload successful:', response.url)
              
              // Update status to success
              setFiles(prev => prev.map(f => 
                f.id === uploadedFile.id 
                  ? { ...f, status: 'success', progress: 100, url: response.url }
                  : f
              ))
              
              resolve(response.url)
            } catch (error) {
              reject(new Error('Invalid response from server'))
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.open('POST', '/api/upload-file')
        xhr.send(formData)
      })

    } catch (error) {
      console.error('Upload error:', error)
      
      let errorMessage = 'Upload failed'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // Update status to error
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ))
      
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!courseName.trim() || !subject.trim() || files.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please fill in course name, subject, and upload at least one file.',
        variant: 'destructive'
      })
      return
    }

    // Check course limit
    try {
      const { data: existingCourses } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', user?.id)
      
      if (!checkCourseLimit(existingCourses?.length || 0)) {
        showUpgradePopup('limit', 'Course Upload')
        return
      }
    } catch (error) {
      console.error('Error checking course limit:', error)
    }

    // Check storage limit for each file
    const totalFileSize = files.reduce((sum, f) => sum + f.file.size, 0)
    if (!checkStorageLimit(totalFileSize)) {
      showUpgradePopup('storage', 'Course Upload')
      return
    }

    // Quick environment check
    try {
      const envCheck = await fetch('/api/check-env')
      const envData = await envCheck.json()
      if (!envData.checks?.blobToken) {
        toast({
          title: 'Configuration Error',
          description: 'Vercel Blob storage is not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.',
          variant: 'destructive'
        })
        return
      }
    } catch (error) {
      console.error('Environment check failed:', error)
    }

    setUploading(true)

    try {
      // Create course record
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert([
          {
            user_id: user?.id,
            name: courseName.trim(),
            description: courseDescription.trim() || null,
            subject: subject.trim(),
            semester: semester.trim() || null,
            professor: professor.trim() || null,
            file_count: files.length,
            total_size: files.reduce((sum, f) => sum + f.file.size, 0)
          }
        ])
        .select()
        .single()

      if (courseError) {
        throw courseError
      }

      // Upload files and create file records
      const fileRecords = []
      let uploadErrors = []
      
      for (const uploadedFile of files) {
        try {
          console.log(`Starting upload for: ${uploadedFile.file.name}`)
          const fileUrl = await uploadFile(uploadedFile)
          
          const fileRecord = {
            course_id: course.id,
            name: uploadedFile.file.name,
            original_name: uploadedFile.file.name,
            file_type: uploadedFile.file.type,
            file_size: uploadedFile.file.size,
            file_url: fileUrl,
            processed: false
          }
          
          console.log(`File record created for: ${uploadedFile.file.name}`, fileRecord)
          fileRecords.push(fileRecord)
        } catch (error) {
          console.error(`Failed to upload ${uploadedFile.file.name}:`, error)
          uploadErrors.push(`${uploadedFile.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      console.log(`Upload completed. Successful: ${fileRecords.length}, Failed: ${uploadErrors.length}`)
      if (uploadErrors.length > 0) {
        console.error('Upload errors:', uploadErrors)
      }

      // Insert file records
      if (fileRecords.length > 0) {
        console.log('Inserting file records:', fileRecords)
        const { data: insertedFiles, error: filesError } = await supabase
          .from('course_files')
          .insert(fileRecords)
          .select()

        if (filesError) {
          console.error('Error saving file records:', filesError)
          toast({
            title: 'Warning',
            description: `Course created but some files failed to save: ${filesError.message}`,
            variant: 'destructive'
          })
        } else {
          console.log('Files saved successfully:', insertedFiles)
        }
      } else {
        console.warn('No file records to insert')
        
        // Delete the course if no files were uploaded
        await supabase.from('courses').delete().eq('id', course.id)
        
        toast({
          title: 'Upload Failed',
          description: 'No files were uploaded successfully. Please check your internet connection and try again.',
          variant: 'destructive'
        })
        return
      }

      // Award XP for course upload
      if (user?.id) {
        try {
          const newAchievements = await awardXP(
            user.id,
            75,
            'course_upload',
            `Uploaded course: ${courseName}`
          )

          // Show achievement notifications
          if (newAchievements.length > 0) {
            newAchievements.forEach(achievement => {
              toast({
                title: '🏆 Achievement Unlocked!',
                description: `${achievement.name} (+${achievement.xp_reward} XP)`,
              })
            })
          }
        } catch (error) {
          console.error('Error awarding XP for course upload:', error)
        }
      }

      toast({
        title: 'Course uploaded successfully!',
        description: `${courseName} has been uploaded with ${fileRecords.length} files. (+75 XP)`
      })

      router.push(`/dashboard/courses/${course.id}`)
    } catch (error) {
      console.error('Error creating course:', error)
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your course. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />
    if (fileType.includes('image')) return <Image className="w-5 h-5 text-green-500" />
    return <File className="w-5 h-5 text-blue-500" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upload Course</h1>
              <p className="text-gray-600 mt-2">
                Add your study materials and let AI help you learn better
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Course Information */}
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
              <CardDescription>
                Provide details about your course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courseName">Course Name *</Label>
                  <Input
                    id="courseName"
                    placeholder="e.g., Introduction to Physics"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Physics, Mathematics, Computer Science"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester/Term</Label>
                  <Input
                    id="semester"
                    placeholder="e.g., Fall 2024, Spring 2025"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="professor">Professor/Instructor</Label>
                  <Input
                    id="professor"
                    placeholder="e.g., Dr. Smith"
                    value={professor}
                    onChange={(e) => setProfessor(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the course content..."
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>
                Upload your course materials (PDF, PowerPoint, Word, Images, Text files)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-gray-600 mb-4">
                  or click to browse files
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, PowerPoint, Word, Images, and Text files (max 50MB each)
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Uploaded Files ({files.length})</h4>
                  <div className="space-y-2">
                    {files.map((uploadedFile) => (
                      <div
                        key={uploadedFile.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          {getFileIcon(uploadedFile.file.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {uploadedFile.file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(uploadedFile.file.size)}
                            </p>
                            {uploadedFile.status === 'error' && uploadedFile.error && (
                              <p className="text-xs text-red-500 mt-1">
                                {uploadedFile.error}
                              </p>
                            )}
                            {uploadedFile.status === 'success' && (
                              <p className="text-xs text-green-500 mt-1">
                                Upload successful
                              </p>
                            )}
                          </div>
                          {uploadedFile.status === 'uploading' && (
                            <div className="w-24">
                              <Progress value={uploadedFile.progress} className="h-2" />
                            </div>
                          )}
                          {getStatusIcon(uploadedFile.status)}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(uploadedFile.id)}
                          disabled={uploading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || files.length === 0}>
              {uploading ? 'Uploading...' : 'Upload Course'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
