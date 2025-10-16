'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Award,
  ArrowRight,
  ArrowLeft,
  Flag,
  AlertCircle,
  Trophy,
  Target,
  BookOpen
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { awardXP } from '@/lib/achievement-system'

interface Question {
  id: string
  type: 'multiple-choice' | 'multiple-select' | 'true-false'
  question: string
  options: string[]
  correctAnswers: number[]
  explanation?: string
  points: number
}

interface Assessment {
  id: string
  title: string
  description: string
  courseId: string
  courseName: string
  timeLimit: number // in minutes
  totalQuestions: number
  passingScore: number
  attempts: number
  maxAttempts: number
}

interface AttemptResult {
  score: number
  totalPoints: number
  percentage: number
  passed: boolean
  timeSpent: number
  answers: Record<string, any>
}

export default function AssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (params.id) {
      fetchAssessmentData()
    }
  }, [params.id])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (started && !completed && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitAssessment()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [started, completed, timeRemaining])

  const fetchAssessmentData = async () => {
    try {
      // Mock data - replace with actual Supabase queries
      const mockAssessment: Assessment = {
        id: params.id as string,
        title: 'React Hooks Mastery Quiz',
        description: 'Test your knowledge of React Hooks including useState, useEffect, and custom hooks.',
        courseId: 'course-1',
        courseName: 'Advanced React Development',
        timeLimit: 30,
        totalQuestions: 10,
        passingScore: 70,
        attempts: 0,
        maxAttempts: 3
      }

      const mockQuestions: Question[] = [
        {
          id: '1',
          type: 'multiple-choice',
          question: 'Which hook is used to manage component state in functional components?',
          options: ['useEffect', 'useState', 'useContext', 'useReducer'],
          correctAnswers: [1],
          explanation: 'useState is the primary hook for managing local component state in functional components.',
          points: 10
        },
        {
          id: '2',
          type: 'multiple-select',
          question: 'Which of the following are valid dependency array patterns for useEffect?',
          options: [
            'Empty array []',
            'No dependency array',
            'Array with variables [count, name]',
            'Null value'
          ],
          correctAnswers: [0, 1, 2],
          explanation: 'useEffect can have an empty array (runs once), no array (runs every render), or an array with dependencies.',
          points: 15
        },
        {
          id: '3',
          type: 'true-false',
          question: 'Custom hooks must always start with the word "use".',
          options: ['True', 'False'],
          correctAnswers: [0],
          explanation: 'Custom hooks must start with "use" to follow React\'s naming convention and enable hook rules.',
          points: 10
        },
        {
          id: '4',
          type: 'multiple-choice',
          question: 'What happens when you call setState with the same value in useState?',
          options: [
            'Component always re-renders',
            'Component never re-renders',
            'React may skip the re-render (optimization)',
            'An error is thrown'
          ],
          correctAnswers: [2],
          explanation: 'React uses Object.is comparison and may skip re-renders if the new state is the same as the current state.',
          points: 15
        },
        {
          id: '5',
          type: 'multiple-choice',
          question: 'Which hook would you use to access context in a functional component?',
          options: ['useContext', 'useProvider', 'useConsumer', 'useState'],
          correctAnswers: [0],
          explanation: 'useContext is the hook specifically designed to consume context values in functional components.',
          points: 10
        }
      ]

      setAssessment(mockAssessment)
      setQuestions(mockQuestions)
      setTimeRemaining(mockAssessment.timeLimit * 60) // Convert to seconds
    } catch (error) {
      console.error('Error fetching assessment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartAssessment = () => {
    setStarted(true)
  }

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setShowExplanation(false)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
      setShowExplanation(false)
    }
  }

  const handleSubmitAssessment = async () => {
    if (!assessment || !questions.length) return

    let totalScore = 0
    let totalPoints = 0

    questions.forEach(question => {
      totalPoints += question.points
      const userAnswer = answers[question.id]
      
      if (userAnswer !== undefined) {
        if (question.type === 'multiple-choice' || question.type === 'true-false') {
          if (question.correctAnswers.includes(userAnswer)) {
            totalScore += question.points
          }
        } else if (question.type === 'multiple-select') {
          const correctSet = new Set(question.correctAnswers)
          const userSet = new Set(userAnswer || [])
          
          if (correctSet.size === userSet.size && 
              [...correctSet].every(x => userSet.has(x))) {
            totalScore += question.points
          }
        }
      }
    })

    const percentage = (totalScore / totalPoints) * 100
    const passed = percentage >= assessment.passingScore
    const timeSpent = (assessment.timeLimit * 60) - timeRemaining

    const attemptResult: AttemptResult = {
      score: totalScore,
      totalPoints,
      percentage,
      passed,
      timeSpent,
      answers
    }

    setResult(attemptResult)
    setCompleted(true)

    // Save result to database and award XP
    try {
      // Award XP based on performance
      if (user?.id) {
        let xpAmount = 0
        if (passed) {
          // Base XP for passing + bonus based on score
          xpAmount = 50 + Math.floor(percentage / 10) * 5
        } else {
          // Participation XP even if failed
          xpAmount = 20
        }
        
        const newAchievements = await awardXP(
          user.id, 
          xpAmount, 
          'assessment_complete', 
          `Completed assessment: ${assessment.title} (${percentage.toFixed(1)}%)`
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
      }

      // TODO: Implement result saving to database
    } catch (error) {
      console.error('Error saving assessment result:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    return ((currentQuestion + 1) / questions.length) * 100
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

  if (!assessment) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment not found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </DashboardLayout>
    )
  }

  if (completed && result) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  result.passed ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {result.passed ? (
                    <Trophy className="w-10 h-10 text-green-600" />
                  ) : (
                    <Target className="w-10 h-10 text-red-600" />
                  )}
                </div>
              </div>
              <CardTitle className="text-3xl">
                {result.passed ? 'Congratulations!' : 'Assessment Complete'}
              </CardTitle>
              <CardDescription>
                {result.passed 
                  ? 'You have successfully passed the assessment!'
                  : `You need ${assessment.passingScore}% to pass. Keep studying and try again!`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{result.percentage.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Score</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{result.score}</div>
                  <div className="text-sm text-gray-600">Points</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatTime(result.timeSpent)}</div>
                  <div className="text-sm text-gray-600">Time Spent</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{assessment.attempts + 1}</div>
                  <div className="text-sm text-gray-600">Attempt</div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button onClick={() => router.push(`/dashboard/courses/${assessment.courseId}`)}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Back to Course
                </Button>
                {!result.passed && assessment.attempts < assessment.maxAttempts - 1 && (
                  <Button 
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Review Answers */}
          <Card>
            <CardHeader>
              <CardTitle>Review Your Answers</CardTitle>
              <CardDescription>
                See how you performed on each question
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((question, index) => {
                const userAnswer = answers[question.id]
                const isCorrect = question.type === 'multiple-select' 
                  ? JSON.stringify(userAnswer?.sort()) === JSON.stringify(question.correctAnswers.sort())
                  : question.correctAnswers.includes(userAnswer)

                return (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {isCorrect ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-2">
                          Question {index + 1}: {question.question}
                        </h3>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`p-2 rounded border ${
                                question.correctAnswers.includes(optionIndex)
                                  ? 'bg-green-50 border-green-200'
                                  : userAnswer === optionIndex || userAnswer?.includes?.(optionIndex)
                                  ? 'bg-red-50 border-red-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                        {question.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm text-blue-800">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!started) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{assessment.title}</CardTitle>
              <CardDescription>{assessment.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <span>Time Limit: {assessment.timeLimit} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-gray-500" />
                  <span>Questions: {assessment.totalQuestions}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-gray-500" />
                  <span>Passing Score: {assessment.passingScore}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-gray-500" />
                  <span>Attempts: {assessment.attempts}/{assessment.maxAttempts}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-800">Important Instructions</h3>
                    <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                      <li>• You have {assessment.timeLimit} minutes to complete this assessment</li>
                      <li>• You can navigate between questions using the navigation buttons</li>
                      <li>• Make sure to answer all questions before submitting</li>
                      <li>• You have {assessment.maxAttempts - assessment.attempts} attempts remaining</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleStartAssessment}
                className="w-full"
                size="lg"
                disabled={assessment.attempts >= assessment.maxAttempts}
              >
                {assessment.attempts >= assessment.maxAttempts 
                  ? 'No More Attempts Available'
                  : 'Start Assessment'
                }
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const currentQ = questions[currentQuestion]
  if (!currentQ) return null

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">{assessment.title}</h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestion + 1} of {questions.length}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className={`font-mono ${timeRemaining < 300 ? 'text-red-600' : ''}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <Badge variant="outline">
                  {Object.keys(answers).length}/{questions.length} answered
                </Badge>
              </div>
            </div>
            <Progress value={getProgressPercentage()} className="mt-4" />
          </CardContent>
        </Card>

        {/* Question */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{currentQ.question}</CardTitle>
            <CardDescription>
              {currentQ.type === 'multiple-select' 
                ? 'Select all correct answers'
                : 'Select the best answer'
              } • {currentQ.points} points
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQ.type === 'multiple-choice' || currentQ.type === 'true-false' ? (
              <RadioGroup
                value={answers[currentQ.id]?.toString() || ''}
                onValueChange={(value) => handleAnswerChange(currentQ.id, parseInt(value))}
              >
                {currentQ.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={index.toString()} id={`q${currentQ.id}-${index}`} />
                    <Label htmlFor={`q${currentQ.id}-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-2">
                {currentQ.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`q${currentQ.id}-${index}`}
                      checked={answers[currentQ.id]?.includes(index) || false}
                      onCheckedChange={(checked) => {
                        const currentAnswers = answers[currentQ.id] || []
                        if (checked) {
                          handleAnswerChange(currentQ.id, [...currentAnswers, index])
                        } else {
                          handleAnswerChange(currentQ.id, currentAnswers.filter((i: number) => i !== index))
                        }
                      }}
                    />
                    <Label htmlFor={`q${currentQ.id}-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {currentQuestion === questions.length - 1 ? (
              <Button onClick={handleSubmitAssessment}>
                Submit Assessment
              </Button>
            ) : (
              <Button onClick={handleNextQuestion}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
