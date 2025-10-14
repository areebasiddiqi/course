'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Brain, 
  Send, 
  BookOpen, 
  Sparkles,
  MessageSquare,
  FileText,
  Mic,
  Square
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { Course } from '@/types'
import { useSearchParams } from 'next/navigation'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  courseContext?: string
}

export default function AIAssistantPage() {
  const { user, userProfile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [courses, setCourses] = useState<Course[]>([])
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createSupabaseClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (user) {
      fetchCourses()
      
      // Check if a course is pre-selected from URL params
      const courseParam = searchParams.get('course')
      if (courseParam) {
        setSelectedCourse(courseParam)
      }
    }
  }, [user, searchParams])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, subject, user_id, file_count, total_size, created_at, updated_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching courses:', error)
      } else {
        setCourses(data || [])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      courseContext: selectedCourse
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          courseId: selectedCourse || null,
          userId: user.id,
          conversationHistory: messages.slice(-10) // Send last 10 messages for context
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        courseContext: selectedCourse
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error getting AI response:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again later.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const getQuickSuggestions = () => {
    const suggestions = [
      "Explain this concept in simple terms",
      "Create a summary of today's study material",
      "Generate practice questions for my upcoming test",
      "Help me understand this difficult topic",
      "What are the key points I should remember?",
      "Create a study plan for this week"
    ]
    
    return suggestions.slice(0, 3)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInputMessage(transcript)
        setIsListening(false)
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-200px)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Brain className="w-8 h-8 mr-3 text-blue-600" />
              AI Study Assistant
            </h1>
            <p className="text-gray-600 mt-2">
              Get instant help with your studies using AI-powered assistance
            </p>
          </div>
          
          {/* Course Selection */}
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            
            {userProfile?.subscription_plan === 'free' && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Free Plan: Limited queries
              </Badge>
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col bg-white rounded-lg border shadow-sm">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to your AI Study Assistant!
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Ask me anything about your courses, request summaries, generate practice questions, or get explanations for complex topics.
                </p>
                
                {/* Suggested Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <Button
                    variant="outline"
                    className="p-4 h-auto text-left"
                    onClick={() => setInputMessage("Can you summarize the main concepts from my latest course?")}
                  >
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    <div>
                      <div className="font-medium">Generate Summary</div>
                      <div className="text-sm text-gray-500">Get key points from your materials</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="p-4 h-auto text-left"
                    onClick={() => setInputMessage("Create practice questions for my upcoming exam")}
                  >
                    <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                    <div>
                      <div className="font-medium">Practice Questions</div>
                      <div className="text-sm text-gray-500">Generate test questions</div>
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="w-8 h-8 mx-2">
                      {message.role === 'user' ? (
                        <>
                          <AvatarImage src={userProfile?.avatar_url} />
                          <AvatarFallback>
                            {userProfile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </>
                      ) : (
                        <AvatarFallback className="bg-blue-100">
                          <Brain className="w-4 h-4 text-blue-600" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className={`rounded-lg p-4 ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                        {message.courseContext && (
                          <span className="ml-2">
                            • {courses.find(c => c.id === message.courseContext)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex max-w-[80%]">
                  <Avatar className="w-8 h-8 mx-2">
                    <AvatarFallback className="bg-blue-100">
                      <Brain className="w-4 h-4 text-blue-600" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Ask me anything about your studies..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2"
                  onClick={startVoiceInput}
                  disabled={isLoading || isListening}
                >
                  {isListening ? (
                    <Square className="w-4 h-4 text-red-500" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <Button 
                onClick={sendMessage} 
                disabled={!inputMessage.trim() || isLoading}
                className="px-6"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {selectedCourse && (
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <BookOpen className="w-4 h-4 mr-1" />
                Context: {courses.find(c => c.id === selectedCourse)?.name}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
