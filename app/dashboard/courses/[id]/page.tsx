'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useBilling } from '@/components/providers/billing-provider'
import { 
  BookOpen, 
  Play, 
  Clock, 
  Download,
  CheckCircle,
  FileText,
  Video,
  Headphones,
  BarChart3,
  Eye,
  Plus,
  Trash2,
  Users,
  Share2,
  Bookmark,
  ExternalLink,
  StickyNote,
  Upload,
  Crown,
  Zap
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'
import { awardXP } from '@/lib/achievement-system'
import { Course } from '@/types'

interface Lesson {
  id: string
  title: string
  description: string
  type: 'document' | 'video' | 'text' | 'audio'
}

interface Note {
  id: string
  content: string
  created_at: string
  course_id: string
  user_id: string
}

interface StudyStats {
  totalTime: number
  sessionsCount: number
  completionRate: number
  averageSessionTime?: number
  lastStudied?: string
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const { 
    showUpgradePopup, 
    showBillingNotification, 
    checkFeatureAccess, 
    checkStorageLimit, 
    checkCourseLimit 
  } = useBilling()
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null)
  const [newNote, setNewNote] = useState('')
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [activeSession, setActiveSession] = useState<any>(null)
  const [sessionTimer, setSessionTimer] = useState(0)
  const [sessionProgress, setSessionProgress] = useState({
    filesViewed: [] as string[],
    progressPercentage: 0,
    lastActivity: ''
  })
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (params.id && user?.id) {
      fetchCourseData()
      checkActiveSession()
    }
  }, [params.id, user?.id])


  // Timer effect for active sessions
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (activeSession) {
      interval = setInterval(() => {
        const startTime = new Date(activeSession.start_time).getTime()
        const currentTime = new Date().getTime()
        const elapsed = Math.floor((currentTime - startTime) / 1000)
        setSessionTimer(elapsed)
      }, 1000)
    } else {
      setSessionTimer(0)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [activeSession])

  const fetchCourseData = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`*, course_files(*)`)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (courseError || !courseData) {
        toast({
          title: 'Course not found',
          description: 'This course does not exist or you do not have access to it.',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      const transformedCourse: Course = {
        ...courseData,
        files: courseData.course_files || []
      }

      const generatedLessons: Lesson[] = courseData.course_files?.map((file: any) => ({
        id: file.id,
        title: file.original_name.replace(/\.[^/.]+$/, ""),
        description: `Study material: ${file.original_name}`,
        type: getFileType(file.file_type)
      })) || []

      const { data: studySessions } = await supabase
        .from('study_sessions')
        .select('duration, start_time')
        .eq('user_id', user.id)
        .eq('course_id', params.id)
        .order('start_time', { ascending: false })

      const totalStudyTime = studySessions?.reduce((acc, session) => acc + session.duration, 0) || 0
      
      // Get persistent viewed files from localStorage
      const viewedFilesKey = `course_${params.id}_viewed_files`
      const persistentViewedFiles = JSON.parse(localStorage.getItem(viewedFilesKey) || '[]')
      
      // Calculate completion rate based on persistent file views
      const completionRate = courseData.course_files?.length > 0 ? 
        Math.round((persistentViewedFiles.length / courseData.course_files.length) * 100) : 0

      const stats: StudyStats = {
        totalTime: totalStudyTime,
        sessionsCount: studySessions?.length || 0,
        completionRate,
        averageSessionTime: studySessions && studySessions.length > 0 ? Math.round(totalStudyTime / studySessions.length) : 0,
        lastStudied: studySessions?.[0]?.start_time
      }

      setCourse(transformedCourse)
      setLessons(generatedLessons)
      setStudyStats(stats)
      // Notes will be managed in-memory for now
      setNotes([])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load course data.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getFileType = (mimeType: string): 'document' | 'video' | 'text' | 'audio' => {
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document')) return 'document'
    return 'document'
  }

  const checkActiveSession = async () => {
    if (!user?.id || !params.id) return

    try {
      const { data: session } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', params.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (session) {
        setActiveSession(session)
      }
    } catch (error) {
      console.error('Error checking active session:', error)
    }
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    
    // Check if user has access to advanced notes (more than 3 notes)
    if (notes.length >= 3 && !checkFeatureAccess('advanced-notes')) {
      showBillingNotification(
        'Note Limit Reached',
        'Free users can create up to 3 notes per course. Upgrade for unlimited notes and advanced features.',
        'Advanced Notes',
        'warning'
      )
      return
    }
    
    const note: Note = {
      id: Date.now().toString(),
      content: newNote,
      created_at: new Date().toISOString(),
      course_id: course?.id || '',
      user_id: user?.id || ''
    }
    
    setNotes(prev => [note, ...prev])
    setNewNote('')
    setShowNoteForm(false)
    toast({
      title: 'Note added',
      description: 'Your note has been saved locally.'
    })
  }

  const handleDeleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId))
    toast({
      title: 'Note deleted',
      description: 'Your note has been removed.'
    })
  }

  const trackFileView = async (fileId: string, fileName: string) => {
    if (!activeSession) return

    // Update session progress
    const updatedFilesViewed = [...new Set([...sessionProgress.filesViewed, fileId])]
    const progressPercentage = course?.files ? 
      Math.round((updatedFilesViewed.length / course.files.length) * 100) : 0

    setSessionProgress(prev => ({
      ...prev,
      filesViewed: updatedFilesViewed,
      lastActivity: `Viewed ${fileName}`,
      progressPercentage
    }))

    // Also save to localStorage for persistence
    const viewedFilesKey = `course_${course?.id}_viewed_files`
    const persistentViewedFiles = JSON.parse(localStorage.getItem(viewedFilesKey) || '[]')
    const isFirstView = !persistentViewedFiles.includes(fileId)
    const updatedPersistentFiles = [...new Set([...persistentViewedFiles, fileId])]
    localStorage.setItem(viewedFilesKey, JSON.stringify(updatedPersistentFiles))

    // Calculate overall completion rate
    const overallCompletionRate = course?.files ? 
      Math.round((updatedPersistentFiles.length / course.files.length) * 100) : 0

    // Update study stats with new completion rate
    setStudyStats(prev => prev ? { ...prev, completionRate: overallCompletionRate } : null)

    // Award XP for first-time file views
    if (isFirstView && user?.id) {
      await handleAwardXP(10, 'file_view', `Viewed ${fileName}`)
    }

    toast({
      title: 'Progress Updated',
      description: `Course progress: ${overallCompletionRate}%${isFirstView ? ' (+10 XP)' : ''}`,
    })
  }

  const handleAwardXP = async (amount: number, activity: string, description: string) => {
    if (!user?.id) return

    try {
      const newAchievements = await awardXP(user.id, amount, activity, description)
      
      // Show notifications for new achievements
      if (newAchievements.length > 0) {
        newAchievements.forEach(achievement => {
          toast({
            title: '🏆 Achievement Unlocked!',
            description: `${achievement.name} (+${achievement.xp_reward} XP)`,
          })
        })
      }
    } catch (error) {
      console.error('Error awarding XP:', error)
    }
  }

  const handleStartStudy = async () => {
    if (!user || !course) return

    if (activeSession) {
      const shouldEnd = confirm('You have an active study session. Do you want to end it and start a new one?')
      if (shouldEnd) {
        await handleEndStudy()
      } else {
        return
      }
    }

    try {
      const { data: session, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          course_id: course.id,
          start_time: new Date().toISOString(),
          duration: 0,
          activity_type: 'study'
        })
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to start study session.',
          variant: 'destructive'
        })
        return
      }

      setActiveSession(session)
      setSessionTimer(0)
      setSessionProgress({
        filesViewed: [],
        lastActivity: 'Started study session',
        progressPercentage: 0
      })

      // Award XP for starting a study session
      await handleAwardXP(5, 'session_start', 'Started a study session')

      toast({
        title: 'Study Session Started!',
        description: 'Your study time is now being tracked. (+5 XP)'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start study session.',
        variant: 'destructive'
      })
    }
  }

  const handleEndStudy = async () => {
    if (!activeSession) return

    try {
      const startTime = new Date(activeSession.start_time).getTime()
      const endTime = new Date().getTime()
      const duration = Math.floor((endTime - startTime) / 1000)

      await supabase
        .from('study_sessions')
        .update({
          end_time: new Date().toISOString(),
          duration: duration
        })
        .eq('id', activeSession.id)

      setActiveSession(null)
      setSessionTimer(0)
      setSessionProgress({
        filesViewed: [],
        lastActivity: '',
        progressPercentage: 0
      })

      const minutes = Math.floor(duration / 60)
      const seconds = duration % 60

      // Award XP based on study duration (1 XP per minute, minimum 10 XP)
      const sessionXP = Math.max(10, minutes)
      await handleAwardXP(sessionXP, 'session_complete', `Completed ${minutes}m ${seconds}s study session`)

      toast({
        title: 'Study Session Completed!',
        description: `You studied for ${minutes}m ${seconds}s. Great job! (+${sessionXP} XP)`
      })

      fetchCourseData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to end study session.',
        variant: 'destructive'
      })
    }
  }

  const handleAddQuickNote = () => {
    // Switch to notes tab
    const notesTab = document.querySelector('[value="notes"]') as HTMLElement
    if (notesTab) {
      notesTab.click()
    }
    // Show note form after a brief delay to allow tab switch
    setTimeout(() => {
      setShowNoteForm(true)
    }, 100)
  }

  const handleViewAnalytics = () => {
    // Check if user has access to advanced analytics
    if (!checkFeatureAccess('advanced-analytics')) {
      showBillingNotification(
        'Premium Analytics',
        'Get detailed insights into your learning patterns, time tracking, and performance metrics.',
        'Advanced Analytics',
        'premium'
      )
      return
    }
    
    // Switch to statistics tab
    const statsTab = document.querySelector('[value="stats"]') as HTMLElement
    if (statsTab) {
      statsTab.click()
      toast({
        title: 'Analytics View',
        description: 'Viewing your detailed study statistics.'
      })
    } else {
      toast({
        title: 'Analytics View',
        description: 'Viewing your study statistics.'
      })
    }
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />
      case 'document': return <FileText className="w-4 h-4" />
      case 'audio': return <Headphones className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Course not found</h1>
          <p className="text-gray-600 mb-4">
            This course doesn't exist or you don't have access to it.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.back()}>Go Back</Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/courses">View All Courses</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Course Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="text-blue-600">
                  {course.subject}
                </Badge>
                {course.semester && (
                  <Badge variant="outline" className="text-white border-white/30">
                    {course.semester}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-4">{course.name}</h1>
              <p className="text-lg opacity-90 mb-6">{course.description || 'No description available'}</p>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.file_count} files</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{course.professor || 'Self-study'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{lessons.length} lessons</span>
                </div>
              </div>
            </div>
            <div className="lg:w-80">
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{studyStats?.completionRate || 0}%</span>
                      </div>
                      <Progress value={studyStats?.completionRate || 0} className="bg-white/20" />
                    </div>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => {
                        // Switch to files tab and start session if not active
                        const filesTab = document.querySelector('[value="files"]') as HTMLElement
                        if (filesTab) {
                          filesTab.click()
                        }
                        if (!activeSession) {
                          handleStartStudy()
                        }
                        toast({
                          title: 'Continue Learning',
                          description: activeSession ? 'Switched to files view' : 'Starting study session...'
                        })
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Continue Learning
                    </Button>
                    <div className="text-center text-sm opacity-75">
                      Created {formatDate(new Date(course.created_at))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        const shareUrl = window.location.href
                        if (navigator.share) {
                          navigator.share({
                            title: course.name,
                            text: course.description || 'Check out this course',
                            url: shareUrl
                          })
                        } else {
                          navigator.clipboard.writeText(shareUrl)
                          toast({
                            title: 'Link Copied',
                            description: 'Course link copied to clipboard!'
                          })
                        }
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        // Check if user has access to bulk downloads
                        if (course.files && course.files.length > 1 && !checkFeatureAccess('bulk-download')) {
                          showBillingNotification(
                            'Bulk Download',
                            'Download all course files at once with Pro. Free users can download files individually.',
                            'Bulk Download',
                            'premium'
                          )
                          return
                        }
                        
                        if (course.files && course.files.length > 0) {
                          // Download all files
                          course.files.forEach((file, index) => {
                            setTimeout(() => {
                              const link = document.createElement('a')
                              link.href = file.file_url
                              link.download = file.original_name || `course-file-${index + 1}`
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                            }, index * 500) // Stagger downloads
                          })
                          toast({
                            title: 'Downloading Files',
                            description: `Starting download of ${course.files.length} files...`
                          })
                        } else {
                          toast({
                            title: 'No Files',
                            description: 'No files available to download.',
                            variant: 'destructive'
                          })
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Subject</label>
                        <p className="text-sm">{course.subject}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Semester</label>
                        <p className="text-sm">{course.semester || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Professor</label>
                        <p className="text-sm">{course.professor || 'Self-study'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Files</label>
                        <p className="text-sm">{course.file_count} files</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Description</label>
                      <p className="text-sm mt-1">{course.description || 'No description available'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Study Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Overall Progress</span>
                          <span>{studyStats?.completionRate || 0}%</span>
                        </div>
                        <Progress value={studyStats?.completionRate || 0} className="h-3" />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{studyStats?.sessionsCount || 0}</div>
                          <div className="text-xs text-gray-600">Sessions</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{Math.floor((studyStats?.totalTime || 0) / 60)}h</div>
                          <div className="text-xs text-gray-600">Total Time</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600">{studyStats?.completionRate || 0}%</div>
                          <div className="text-xs text-gray-600">Complete</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {activeSession ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm font-medium text-green-800">Study Session Active</span>
                            </div>
                            <span className="text-sm font-mono text-green-700">
                              {Math.floor(sessionTimer / 3600)}:{Math.floor((sessionTimer % 3600) / 60).toString().padStart(2, '0')}:{(sessionTimer % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-green-700">
                              <span>Course Progress</span>
                              <span>{sessionProgress.progressPercentage}%</span>
                            </div>
                            <Progress value={sessionProgress.progressPercentage} className="h-2" />
                            <div className="text-xs text-green-600">
                              {sessionProgress.filesViewed.length} of {course?.files?.length || 0} files viewed
                            </div>
                          </div>
                          
                          {/* Last Activity */}
                          {sessionProgress.lastActivity && (
                            <div className="mt-2 text-xs text-green-600">
                              Last: {sessionProgress.lastActivity}
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          className="w-full justify-start" 
                          variant="destructive"
                          onClick={handleEndStudy}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          End Study Session
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={handleStartStudy}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Study Session
                      </Button>
                    )}
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={handleAddQuickNote}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Note
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={handleViewAnalytics}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                      {!checkFeatureAccess('advanced-analytics') && (
                        <Crown className="w-3 h-3 ml-auto text-yellow-500" />
                      )}
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => {
                        if (!checkFeatureAccess('ai-insights')) {
                          showBillingNotification(
                            'AI Study Insights',
                            'Get personalized recommendations and study tips powered by AI.',
                            'AI Insights',
                            'premium'
                          )
                          return
                        }
                        toast({
                          title: 'AI Insights',
                          description: 'Analyzing your study patterns...'
                        })
                      }}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      AI Insights
                      {!checkFeatureAccess('ai-insights') && (
                        <Crown className="w-3 h-3 ml-auto text-yellow-500" />
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {studyStats?.lastStudied ? (
                      <p className="text-sm text-gray-600">
                        Last studied: {formatDate(new Date(studyStats.lastStudied))}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">No study sessions yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Upgrade Prompt for Free Users */}
                {!checkFeatureAccess('ai-insights') && (
                  <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                        Unlock Premium
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">
                        Get AI insights, unlimited storage, and advanced analytics.
                      </p>
                      <Button 
                        onClick={() => showUpgradePopup('upgrade', 'Quick Actions')}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        size="sm"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade Now
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Course Files</CardTitle>
                <CardDescription>
                  {course.file_count} files • {Math.round((course.total_size || 0) / (1024 * 1024))} MB total
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {lessons.length > 0 ? (
                  lessons.map((lesson, index) => {
                    const file = course?.files?.find(f => f.id === lesson.id)
                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors ${
                          (() => {
                            const viewedFilesKey = `course_${course?.id}_viewed_files`
                            const persistentViewedFiles = JSON.parse(localStorage.getItem(viewedFilesKey) || '[]')
                            return persistentViewedFiles.includes(lesson.id) ? 'bg-green-50 border-green-200' : ''
                          })()
                        }`}
                      >
                        <div className="flex-shrink-0 relative">
                          {getLessonIcon(lesson.type)}
                          {(() => {
                            const viewedFilesKey = `course_${course?.id}_viewed_files`
                            const persistentViewedFiles = JSON.parse(localStorage.getItem(viewedFilesKey) || '[]')
                            return persistentViewedFiles.includes(lesson.id)
                          })() && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{lesson.title}</h3>
                            {file?.file_type && (
                              <Badge variant="outline" className="text-xs">
                                {file.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {lesson.description}
                          </p>
                          {file && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Size: {Math.round((file.file_size || 0) / 1024)} KB</span>
                              <span>Type: {file.file_type}</span>
                              <span>Uploaded: {formatDate(new Date(file.upload_date || ''))}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast({ title: 'Bookmarked', description: 'File bookmarked successfully.' })}
                            title="Bookmark this file"
                          >
                            <Bookmark className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              if (file?.file_url) {
                                window.open(file.file_url, '_blank')
                                // Track file view for progress
                                trackFileView(lesson.id, lesson.title)
                              }
                            }}
                            title="Preview file"
                            disabled={!file?.file_url}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              if (file?.file_url) {
                                const link = document.createElement('a')
                                link.href = file.file_url
                                link.download = file.original_name || file.name || 'download'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                // Track file download for progress
                                trackFileView(lesson.id, lesson.title)
                              }
                            }}
                            title="Download file"
                            disabled={!file?.file_url}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No files uploaded yet</p>
                    <p className="text-sm mt-2">Upload course materials to see them here</p>
                    <div className="flex justify-center mt-4">
                      <Button asChild>
                        <Link href="/dashboard/courses/upload">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Files
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Course Notes</CardTitle>
                    <CardDescription>Take and manage your study notes</CardDescription>
                  </div>
                  <Button onClick={() => setShowNoteForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNoteForm && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Write your note here..."
                      className="w-full h-32 p-3 border rounded-lg resize-none"
                    />
                    <div className="flex gap-2 mt-3">
                      <Button onClick={handleAddNote} size="sm">
                        Save Note
                      </Button>
                      <Button onClick={() => setShowNoteForm(false)} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {notes.length > 0 ? (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm">{note.content}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDate(new Date(note.created_at))}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <StickyNote className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No notes yet</p>
                    <p className="text-sm mt-2">Add your first note to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{Math.floor((studyStats?.totalTime || 0) / 60)}h</div>
                  <div className="text-sm text-gray-600">Total Study Time</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Play className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold">{studyStats?.sessionsCount || 0}</div>
                  <div className="text-sm text-gray-600">Study Sessions</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">{Math.floor(studyStats?.averageSessionTime || 0)} min</div>
                  <div className="text-sm text-gray-600">Avg Session</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                  <div className="text-2xl font-bold">{studyStats?.completionRate || 0}%</div>
                  <div className="text-sm text-gray-600">Completion</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Study Statistics</CardTitle>
                <CardDescription>Detailed breakdown of your learning progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Progress Overview</label>
                    <div className="mt-2">
                      <Progress value={studyStats?.completionRate || 0} className="h-3" />
                      <p className="text-sm text-gray-600 mt-1">{studyStats?.completionRate || 0}% complete</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Files Accessed</label>
                      <p className="text-2xl font-bold text-blue-600">{lessons.length}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes Created</label>
                      <p className="text-2xl font-bold text-green-600">{notes.length}</p>
                    </div>
                  </div>
                  
                  {studyStats?.lastStudied && (
                    <div>
                      <label className="text-sm font-medium">Last Activity</label>
                      <p className="text-sm text-gray-600">{formatDate(new Date(studyStats.lastStudied))}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Related Courses Tab */}
          <TabsContent value="related" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Related Courses</CardTitle>
                <CardDescription>Other courses in the same subject area</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Related courses feature coming soon</p>
                  <p className="text-sm mt-2">Upload more courses in the same subject to see related content</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
