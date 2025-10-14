'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Clock, 
  Target, 
  BookOpen,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Trophy
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { toast } from '@/components/ui/use-toast'

interface Question {
  id: string
  type: 'multiple-choice' | 'multiple-select' | 'true-false' | 'short-answer'
  question: string
  options: string[]
  correctAnswers: number[]
  explanation: string
  points: number
}

interface AssessmentData {
  title: string
  description: string
  courseId: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeLimit: number
  totalPoints: number
  passingScore: number
  maxAttempts: number
  questions: Question[]
}

export default function CreateAssessmentPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('details')
  const supabase = createSupabaseClient()

  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    title: '',
    description: '',
    courseId: '',
    difficulty: 'medium',
    timeLimit: 30,
    totalPoints: 100,
    passingScore: 70,
    maxAttempts: 3,
    questions: []
  })

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '',
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswers: [],
    explanation: '',
    points: 10
  })

  // Demo data generator
  const generateDemoAssessment = () => {
    const demoQuestions: Question[] = [
      {
        id: '1',
        type: 'multiple-choice',
        question: 'What is the primary purpose of React Hooks?',
        options: [
          'To replace class components entirely',
          'To allow state and lifecycle methods in functional components',
          'To improve performance',
          'To add styling to components'
        ],
        correctAnswers: [1],
        explanation: 'React Hooks allow you to use state and other React features in functional components without writing a class.',
        points: 10
      },
      {
        id: '2',
        type: 'multiple-select',
        question: 'Which of the following are built-in React Hooks?',
        options: [
          'useState',
          'useEffect',
          'useContext',
          'useComponent'
        ],
        correctAnswers: [0, 1, 2],
        explanation: 'useState, useEffect, and useContext are all built-in React Hooks. useComponent is not a real Hook.',
        points: 15
      },
      {
        id: '3',
        type: 'true-false',
        question: 'Custom Hooks must always start with the word "use".',
        options: ['True', 'False'],
        correctAnswers: [0],
        explanation: 'By convention, custom Hooks should start with "use" to follow React naming conventions.',
        points: 10
      },
      {
        id: '4',
        type: 'short-answer',
        question: 'Explain the difference between useState and useReducer.',
        options: [],
        correctAnswers: [],
        explanation: 'useState is for simple state management, while useReducer is better for complex state logic with multiple sub-values or when the next state depends on the previous one.',
        points: 20
      },
      {
        id: '5',
        type: 'multiple-choice',
        question: 'When does the useEffect Hook run by default?',
        options: [
          'Only on component mount',
          'Only on component unmount',
          'After every render',
          'Only when state changes'
        ],
        correctAnswers: [2],
        explanation: 'By default, useEffect runs after every completed render, both after the first render and after every update.',
        points: 10
      }
    ]

    setAssessmentData({
      title: 'React Hooks Mastery Quiz',
      description: 'Test your knowledge of React Hooks including useState, useEffect, useContext, and custom hooks. This comprehensive assessment covers fundamental concepts and best practices.',
      courseId: '',
      difficulty: 'medium',
      timeLimit: 25,
      totalPoints: 65,
      passingScore: 70,
      maxAttempts: 3,
      questions: demoQuestions
    })

    toast({
      title: 'Demo Assessment Generated!',
      description: 'A sample React Hooks quiz has been created with 5 questions.'
    })
  }

  const addQuestion = () => {
    if (!currentQuestion.question.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a question.',
        variant: 'destructive'
      })
      return
    }

    const newQuestion: Question = {
      ...currentQuestion,
      id: Date.now().toString()
    }

    setAssessmentData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
      totalPoints: prev.totalPoints + currentQuestion.points
    }))

    // Reset current question
    setCurrentQuestion({
      id: '',
      type: 'multiple-choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswers: [],
      explanation: '',
      points: 10
    })

    toast({
      title: 'Question Added',
      description: 'Question has been added to the assessment.'
    })
  }

  const removeQuestion = (questionId: string) => {
    const questionToRemove = assessmentData.questions.find(q => q.id === questionId)
    setAssessmentData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId),
      totalPoints: prev.totalPoints - (questionToRemove?.points || 0)
    }))
  }

  const saveAssessment = async () => {
    if (!assessmentData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an assessment title.',
        variant: 'destructive'
      })
      return
    }

    if (assessmentData.questions.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one question.',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('assessments')
        .insert({
          title: assessmentData.title,
          description: assessmentData.description,
          course_id: assessmentData.courseId || null,
          difficulty: assessmentData.difficulty,
          time_limit: assessmentData.timeLimit,
          total_points: assessmentData.totalPoints,
          questions: assessmentData.questions
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Assessment Created!',
        description: 'Your assessment has been saved successfully.'
      })

      router.push(`/dashboard/assessments/${data.id}`)
    } catch (error) {
      console.error('Error saving assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to save assessment. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple-choice': return <Target className="w-4 h-4" />
      case 'multiple-select': return <CheckCircle className="w-4 h-4" />
      case 'true-false': return <XCircle className="w-4 h-4" />
      case 'short-answer': return <BookOpen className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Create Assessment</h1>
            <p className="text-gray-600 mt-2">Build a comprehensive test for your course</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button 
              variant="outline" 
              onClick={generateDemoAssessment}
              className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Generate Demo Quiz
            </Button>
            <Button onClick={saveAssessment} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Assessment'}
            </Button>
          </div>
        </div>

        {/* Progress Indicator */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">{assessmentData.timeLimit} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">{assessmentData.questions.length} questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">{assessmentData.totalPoints} points</span>
                </div>
              </div>
              <Badge variant={assessmentData.difficulty === 'easy' ? 'secondary' : 
                             assessmentData.difficulty === 'medium' ? 'default' : 'destructive'}>
                {assessmentData.difficulty}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Assessment Details</TabsTrigger>
            <TabsTrigger value="questions">Questions ({assessmentData.questions.length})</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Assessment Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Set up the fundamental details of your assessment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Assessment Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., React Hooks Mastery Quiz"
                      value={assessmentData.title}
                      onChange={(e) => setAssessmentData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what this assessment covers..."
                      value={assessmentData.description}
                      onChange={(e) => setAssessmentData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select 
                      value={assessmentData.difficulty} 
                      onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                        setAssessmentData(prev => ({ ...prev, difficulty: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assessment Settings</CardTitle>
                  <CardDescription>Configure timing and scoring parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      min="1"
                      max="180"
                      value={assessmentData.timeLimit}
                      onChange={(e) => setAssessmentData(prev => ({ 
                        ...prev, 
                        timeLimit: parseInt(e.target.value) || 30 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="passingScore">Passing Score (%)</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      min="0"
                      max="100"
                      value={assessmentData.passingScore}
                      onChange={(e) => setAssessmentData(prev => ({ 
                        ...prev, 
                        passingScore: parseInt(e.target.value) || 70 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAttempts">Maximum Attempts</Label>
                    <Input
                      id="maxAttempts"
                      type="number"
                      min="1"
                      max="10"
                      value={assessmentData.maxAttempts}
                      onChange={(e) => setAssessmentData(prev => ({ 
                        ...prev, 
                        maxAttempts: parseInt(e.target.value) || 3 
                      }))}
                    />
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Total Points</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{assessmentData.totalPoints}</p>
                    <p className="text-xs text-blue-700">Calculated from questions</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Question Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Add New Question</CardTitle>
                  <CardDescription>Create questions for your assessment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="questionType">Question Type</Label>
                    <Select 
                      value={currentQuestion.type} 
                      onValueChange={(value: any) => setCurrentQuestion(prev => ({ 
                        ...prev, 
                        type: value,
                        options: value === 'true-false' ? ['True', 'False'] : 
                                value === 'short-answer' ? [] : ['', '', '', ''],
                        correctAnswers: []
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                        <SelectItem value="multiple-select">Multiple Select</SelectItem>
                        <SelectItem value="true-false">True/False</SelectItem>
                        <SelectItem value="short-answer">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="question">Question</Label>
                    <Textarea
                      id="question"
                      placeholder="Enter your question here..."
                      value={currentQuestion.question}
                      onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  {currentQuestion.type !== 'short-answer' && (
                    <div>
                      <Label>Answer Options</Label>
                      <div className="space-y-2">
                        {currentQuestion.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              placeholder={`Option ${index + 1}`}
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...currentQuestion.options]
                                newOptions[index] = e.target.value
                                setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
                              }}
                              disabled={currentQuestion.type === 'true-false'}
                            />
                            <Button
                              type="button"
                              variant={currentQuestion.correctAnswers.includes(index) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') {
                                  setCurrentQuestion(prev => ({ ...prev, correctAnswers: [index] }))
                                } else {
                                  const newCorrect = currentQuestion.correctAnswers.includes(index)
                                    ? currentQuestion.correctAnswers.filter(i => i !== index)
                                    : [...currentQuestion.correctAnswers, index]
                                  setCurrentQuestion(prev => ({ ...prev, correctAnswers: newCorrect }))
                                }
                              }}
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="explanation">Explanation</Label>
                    <Textarea
                      id="explanation"
                      placeholder="Explain the correct answer..."
                      value={currentQuestion.explanation}
                      onChange={(e) => setCurrentQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="points">Points</Label>
                    <Input
                      id="points"
                      type="number"
                      min="1"
                      max="50"
                      value={currentQuestion.points}
                      onChange={(e) => setCurrentQuestion(prev => ({ 
                        ...prev, 
                        points: parseInt(e.target.value) || 10 
                      }))}
                    />
                  </div>

                  <Button onClick={addQuestion} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </CardContent>
              </Card>

              {/* Questions List */}
              <Card>
                <CardHeader>
                  <CardTitle>Questions ({assessmentData.questions.length})</CardTitle>
                  <CardDescription>Review and manage your questions</CardDescription>
                </CardHeader>
                <CardContent>
                  {assessmentData.questions.length > 0 ? (
                    <div className="space-y-3">
                      {assessmentData.questions.map((question, index) => (
                        <div key={question.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getQuestionTypeIcon(question.type)}
                                <Badge variant="outline" className="text-xs">
                                  {question.type.replace('-', ' ')}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {question.points} pts
                                </Badge>
                              </div>
                              <p className="text-sm font-medium mb-1">
                                {index + 1}. {question.question}
                              </p>
                              {question.options.length > 0 && (
                                <div className="text-xs text-gray-600">
                                  {question.options.length} options
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuestion(question.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No questions added yet</p>
                      <p className="text-xs mt-1">Add questions using the form on the left</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Assessment Preview
                </CardTitle>
                <CardDescription>
                  This is how your assessment will appear to students
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Assessment Header */}
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                    <h2 className="text-2xl font-bold mb-2">{assessmentData.title || 'Untitled Assessment'}</h2>
                    <p className="text-gray-600 mb-4">{assessmentData.description || 'No description provided.'}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{assessmentData.timeLimit} minutes</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        <span>{assessmentData.questions.length} questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        <span>{assessmentData.totalPoints} points</span>
                      </div>
                      <Badge variant={assessmentData.difficulty === 'easy' ? 'secondary' : 
                                     assessmentData.difficulty === 'medium' ? 'default' : 'destructive'}>
                        {assessmentData.difficulty}
                      </Badge>
                    </div>
                  </div>

                  {/* Questions Preview */}
                  {assessmentData.questions.length > 0 ? (
                    <div className="space-y-4">
                      {assessmentData.questions.map((question, index) => (
                        <Card key={question.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getQuestionTypeIcon(question.type)}
                                  <Badge variant="outline" className="text-xs">
                                    {question.type.replace('-', ' ')}
                                  </Badge>
                                  <span className="text-xs text-gray-500">({question.points} points)</span>
                                </div>
                                <p className="font-medium mb-3">{question.question}</p>
                                {question.options.length > 0 && (
                                  <div className="space-y-2">
                                    {question.options.map((option, optionIndex) => (
                                      <div 
                                        key={optionIndex} 
                                        className={`p-2 border rounded ${
                                          question.correctAnswers.includes(optionIndex) 
                                            ? 'bg-green-50 border-green-200' 
                                            : 'bg-gray-50'
                                        }`}
                                      >
                                        <span className="text-sm">{option}</span>
                                        {question.correctAnswers.includes(optionIndex) && (
                                          <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {question.explanation && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                                    <div className="flex items-start gap-2">
                                      <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
                                      <div>
                                        <p className="text-sm font-medium text-blue-900">Explanation</p>
                                        <p className="text-sm text-blue-700">{question.explanation}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No questions to preview</p>
                      <p className="text-sm mt-2">Add questions to see the preview</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
