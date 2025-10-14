'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  Target, 
  Trophy,
  BookOpen,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Award,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface Assessment {
  id: string
  title: string
  description: string
  courseId: string
  courseName: string
  courseImage: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  timeLimit: number
  totalQuestions: number
  passingScore: number
  attempts: number
  maxAttempts: number
  bestScore?: number
  lastAttempt?: Date
  status: 'not-started' | 'in-progress' | 'completed' | 'failed'
  dueDate?: Date
  points: number
  category: string
}

interface AssessmentStats {
  totalAssessments: number
  completedAssessments: number
  averageScore: number
  totalPoints: number
  passRate: number
}

export default function AssessmentsPage() {
  const { user } = useAuth()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([])
  const [stats, setStats] = useState<AssessmentStats>({
    totalAssessments: 0,
    completedAssessments: 0,
    averageScore: 0,
    totalPoints: 0,
    passRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'available' | 'completed' | 'failed'>('all')
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (user) {
      fetchAssessments()
    }
  }, [user])

  useEffect(() => {
    filterAssessments()
  }, [assessments, searchTerm, selectedFilter])

  const fetchAssessments = async () => {
    if (!user) return

    try {
      // Fetch assessments with course information and attempts
      const { data: assessmentsData, error } = await supabase
        .from('assessments')
        .select(`
          *,
          courses(name, subject),
          assessment_attempts(score, completed_at)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching assessments:', error)
        return
      }

      // Transform database data to match Assessment interface
      const transformedAssessments: Assessment[] = assessmentsData?.map(assessment => {
        const attempts = assessment.assessment_attempts || []
        const bestAttempt = attempts.length > 0 ? 
          attempts.reduce((best: any, current: any) => current.score > best.score ? current : best) : null

        return {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description || '',
          courseId: assessment.course_id,
          courseName: assessment.courses?.name || 'Unknown Course',
          courseImage: `/api/courses/${assessment.course_id}/thumbnail`,
          difficulty: assessment.difficulty === 'easy' ? 'Beginner' : 
                     assessment.difficulty === 'medium' ? 'Intermediate' : 'Advanced',
          timeLimit: assessment.time_limit || 30,
          totalQuestions: assessment.questions?.length || 0,
          passingScore: 70, // Default passing score
          attempts: attempts.length,
          maxAttempts: 3, // Default max attempts
          bestScore: bestAttempt?.score,
          lastAttempt: bestAttempt ? new Date(bestAttempt.completed_at) : undefined,
          status: attempts.length === 0 ? 'not-started' : 
                 bestAttempt?.score >= 70 ? 'completed' : 'failed',
          points: assessment.total_points,
          category: assessment.courses?.subject || 'General'
        }
      }) || []

      setAssessments(transformedAssessments)
      
      // Calculate stats
      const completed = transformedAssessments.filter(a => a.status === 'completed')
      const totalScore = completed.reduce((sum, a) => sum + (a.bestScore || 0), 0)
      const passed = completed.filter(a => (a.bestScore || 0) >= a.passingScore)
      
      setStats({
        totalAssessments: transformedAssessments.length,
        completedAssessments: completed.length,
        averageScore: completed.length > 0 ? totalScore / completed.length : 0,
        totalPoints: completed.reduce((sum, a) => sum + a.points, 0),
        passRate: completed.length > 0 ? (passed.length / completed.length) * 100 : 0
      })
    } catch (error) {
      console.error('Error fetching assessments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAssessments = () => {
    let filtered = assessments

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(assessment =>
        assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    switch (selectedFilter) {
      case 'available':
        filtered = filtered.filter(a => a.status === 'not-started' || (a.status === 'failed' && a.attempts < a.maxAttempts))
        break
      case 'completed':
        filtered = filtered.filter(a => a.status === 'completed')
        break
      case 'failed':
        filtered = filtered.filter(a => a.status === 'failed')
        break
      default:
        // 'all' - no additional filtering
        break
    }

    setFilteredAssessments(filtered)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-800'
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'Advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canTakeAssessment = (assessment: Assessment) => {
    return assessment.status === 'not-started' || 
           (assessment.status === 'failed' && assessment.attempts < assessment.maxAttempts)
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Assessments</h1>
          <p className="text-gray-600 mt-2">Test your knowledge and track your progress</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats.totalAssessments}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats.completedAssessments}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats.averageScore.toFixed(0)}%</div>
              <div className="text-sm text-gray-600">Avg Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold">{stats.totalPoints}</div>
              <div className="text-sm text-gray-600">Points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
              <div className="text-2xl font-bold">{stats.passRate.toFixed(0)}%</div>
              <div className="text-sm text-gray-600">Pass Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search assessments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Tabs value={selectedFilter} onValueChange={(value: any) => setSelectedFilter(value)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="available">Available</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="failed">Failed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Assessments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((assessment) => (
            <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{assessment.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {assessment.courseName}
                    </CardDescription>
                  </div>
                  {getStatusIcon(assessment.status)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getStatusColor(assessment.status)}>
                    {assessment.status.replace('-', ' ')}
                  </Badge>
                  <Badge variant="outline" className={getDifficultyColor(assessment.difficulty)}>
                    {assessment.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {assessment.description}
                </p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{assessment.timeLimit} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span>{assessment.totalQuestions} questions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-gray-400" />
                    <span>{assessment.passingScore}% to pass</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-gray-400" />
                    <span>{assessment.points} points</span>
                  </div>
                </div>

                {assessment.bestScore && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span>Best Score:</span>
                      <span className="font-medium">{assessment.bestScore}%</span>
                    </div>
                    {assessment.lastAttempt && (
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Last attempt:</span>
                        <span>{formatDate(assessment.lastAttempt)}</span>
                      </div>
                    )}
                  </div>
                )}

                {assessment.dueDate && (
                  <div className="flex items-center gap-1 text-sm text-orange-600">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {formatDate(assessment.dueDate)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Attempts: {assessment.attempts}/{assessment.maxAttempts}</span>
                  <span>{assessment.category}</span>
                </div>

                <div className="pt-2">
                  {canTakeAssessment(assessment) ? (
                    <Link href={`/dashboard/assessments/${assessment.id}`}>
                      <Button className="w-full">
                        <Play className="w-4 h-4 mr-2" />
                        {assessment.status === 'not-started' ? 'Start Assessment' : 'Retake Assessment'}
                      </Button>
                    </Link>
                  ) : assessment.status === 'completed' ? (
                    <Link href={`/dashboard/assessments/${assessment.id}`}>
                      <Button variant="outline" className="w-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        View Results
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      <XCircle className="w-4 h-4 mr-2" />
                      No Attempts Left
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAssessments.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No assessments found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No assessments are available at the moment.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
