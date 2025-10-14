'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2,
  Maximize,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  MessageSquare,
  CheckCircle,
  Clock,
  FileText,
  Download
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import Link from 'next/link'

interface Lesson {
  id: string
  title: string
  description: string
  content: string
  videoUrl?: string
  duration: number
  type: 'video' | 'text' | 'audio'
  completed: boolean
}

interface Note {
  id: string
  content: string
  timestamp?: number
  createdAt: Date
}

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (params.lessonId) {
      fetchLessonData()
    }
  }, [params.lessonId])

  const fetchLessonData = async () => {
    try {
      // Mock data - replace with actual Supabase queries
      const mockLesson: Lesson = {
        id: params.lessonId as string,
        title: 'Custom Hooks Deep Dive',
        description: 'Learn how to create and use custom hooks effectively in React applications.',
        content: `
          <h2>Introduction to Custom Hooks</h2>
          <p>Custom hooks are a powerful feature in React that allow you to extract component logic into reusable functions. They follow the same rules as built-in hooks and can use other hooks internally.</p>
          
          <h3>Why Use Custom Hooks?</h3>
          <ul>
            <li>Reusability: Share logic between components</li>
            <li>Separation of Concerns: Keep components focused on rendering</li>
            <li>Testability: Easier to test isolated logic</li>
            <li>Readability: Make complex logic more understandable</li>
          </ul>

          <h3>Creating Your First Custom Hook</h3>
          <p>Let's create a simple custom hook for managing local storage:</p>
          
          <pre><code>
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}
          </code></pre>

          <h3>Best Practices</h3>
          <p>When creating custom hooks, keep these best practices in mind:</p>
          <ul>
            <li>Always start the name with "use"</li>
            <li>Keep hooks focused on a single responsibility</li>
            <li>Return an array or object for multiple values</li>
            <li>Handle edge cases and errors gracefully</li>
          </ul>
        `,
        videoUrl: '/placeholder-video.mp4',
        duration: 1500, // 25 minutes
        type: 'video',
        completed: false
      }

      const mockNotes: Note[] = [
        {
          id: '1',
          content: 'Remember to always start custom hook names with "use"',
          timestamp: 300,
          createdAt: new Date('2024-01-15T10:30:00')
        },
        {
          id: '2',
          content: 'The localStorage example is really useful for form persistence',
          timestamp: 800,
          createdAt: new Date('2024-01-15T10:35:00')
        }
      ]

      setLesson(mockLesson)
      setNotes(mockNotes)
      setDuration(mockLesson.duration)
    } catch (error) {
      console.error('Error fetching lesson data:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      setCurrentTime(current)
      setProgress((current / duration) * 100)
    }
  }

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return

    const note: Note = {
      id: Date.now().toString(),
      content: newNote,
      timestamp: currentTime,
      createdAt: new Date()
    }

    setNotes([...notes, note])
    setNewNote('')
  }

  const markAsCompleted = async () => {
    // Implement completion logic
    if (lesson) {
      setLesson({ ...lesson, completed: true })
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
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

  if (!lesson) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lesson not found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href={`/dashboard/courses/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            {lesson.type === 'video' && (
              <Card>
                <CardContent className="p-0">
                  <div className="relative bg-black rounded-t-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full aspect-video"
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          setDuration(videoRef.current.duration)
                        }
                      }}
                    >
                      <source src={lesson.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    
                    {/* Video Controls */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="space-y-2">
                        <Progress value={progress} className="bg-white/20" />
                        <div className="flex items-center justify-between text-white">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={togglePlayPause}
                              className="text-white hover:bg-white/20"
                            >
                              {isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                            >
                              <SkipBack className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                            >
                              <SkipForward className="w-4 h-4" />
                            </Button>
                            <span className="text-sm">
                              {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                            >
                              <Maximize className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lesson Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{lesson.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {lesson.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={lesson.completed ? "default" : "secondary"}>
                      {lesson.completed ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          In Progress
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {lesson.type === 'text' && (
                <CardContent>
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                  />
                </CardContent>
              )}
            </Card>

            {/* Completion */}
            {!lesson.completed && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">Mark as Completed</h3>
                    <p className="text-gray-600 mb-4">
                      Have you finished this lesson? Mark it as completed to track your progress.
                    </p>
                    <Button onClick={markAsCompleted}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Completed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Notes
                </CardTitle>
                <CardDescription>
                  Take notes while learning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={addNote} size="sm" className="w-full">
                    Add Note
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">{note.content}</p>
                      {note.timestamp && (
                        <button
                          onClick={() => handleSeek(note.timestamp!)}
                          className="text-xs text-blue-600 hover:underline mt-1"
                        >
                          {formatTime(note.timestamp)}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Lesson Slides (PDF)
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Code Examples
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Additional Reading
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
