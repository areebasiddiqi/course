'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp,
  Calendar,
  Clock,
  BookOpen,
  Brain,
  Target,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Trophy,
  Users,
  Star,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface AnalyticsData {
  studyTime: {
    daily: number[]
    weekly: number[]
    monthly: number[]
    labels: string[]
  }
  performance: {
    assessmentScores: number[]
    courseCompletion: number[]
    subjects: string[]
  }
  productivity: {
    streakData: number[]
    sessionsPerDay: number[]
    focusTime: number[]
  }
  comparison: {
    thisWeek: number
    lastWeek: number
    thisMonth: number
    lastMonth: number
    trend: 'up' | 'down' | 'stable'
  }
}

interface SubjectAnalytics {
  subject: string
  totalTime: number
  sessions: number
  averageScore: number
  coursesCompleted: number
  trend: 'up' | 'down' | 'stable'
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([])
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (user) {
      fetchAnalyticsData()
    }
  }, [user, timeRange])

  const fetchAnalyticsData = async () => {
    if (!user) return

    try {
      const now = new Date()
      let startDate: Date
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
      }

      // Fetch study sessions
      const { data: sessionsData } = await supabase
        .from('study_sessions')
        .select(`
          *,
          courses(name, subject)
        `)
        .eq('user_id', user.id)
        .gte('start_time', startDate.toISOString())
        .order('start_time', { ascending: true })

      // Fetch assessment attempts
      const { data: attemptsData } = await supabase
        .from('assessment_attempts')
        .select(`
          *,
          assessments(
            title,
            courses(subject)
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)

      // Process study time data
      const dailyStudyTime = new Array(30).fill(0)
      const dailyLabels = []
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        dailyLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
        
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
        
        const dayMinutes = sessionsData?.filter(session => {
          const sessionDate = new Date(session.start_time)
          return sessionDate >= dayStart && sessionDate < dayEnd
        }).reduce((acc, session) => acc + session.duration, 0) || 0
        
        dailyStudyTime[29 - i] = Math.floor(dayMinutes / 60) // Convert to hours
      }

      // Process subject analytics
      const subjectMap = new Map<string, {
        totalTime: number
        sessions: number
        scores: number[]
        coursesCompleted: number
      }>()

      sessionsData?.forEach(session => {
        const subject = session.courses?.subject || 'Other'
        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, { totalTime: 0, sessions: 0, scores: [], coursesCompleted: 0 })
        }
        const data = subjectMap.get(subject)!
        data.totalTime += session.duration
        data.sessions += 1
      })

      attemptsData?.forEach(attempt => {
        const subject = attempt.assessments?.courses?.subject || 'Other'
        if (subjectMap.has(subject)) {
          const data = subjectMap.get(subject)!
          const scorePercentage = (attempt.score / attempt.total_points) * 100
          data.scores.push(scorePercentage)
        }
      })

      // Count completed courses by subject
      coursesData?.forEach(course => {
        const subject = course.subject || 'Other'
        if (subjectMap.has(subject)) {
          const data = subjectMap.get(subject)!
          data.coursesCompleted += 1 // Simplified - would need completion status
        }
      })

      const subjectAnalyticsData: SubjectAnalytics[] = Array.from(subjectMap.entries()).map(([subject, data]) => ({
        subject,
        totalTime: Math.floor(data.totalTime / 60), // Convert to hours
        sessions: data.sessions,
        averageScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
        coursesCompleted: data.coursesCompleted,
        trend: 'stable' as const // Would need historical data for real trend
      }))

      // Calculate comparison data
      const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      
      const thisWeekTime = sessionsData?.filter(s => 
        new Date(s.start_time) >= thisWeekStart
      ).reduce((acc, s) => acc + s.duration, 0) || 0
      
      const lastWeekTime = sessionsData?.filter(s => {
        const date = new Date(s.start_time)
        return date >= lastWeekStart && date < thisWeekStart
      }).reduce((acc, s) => acc + s.duration, 0) || 0

      const analyticsData: AnalyticsData = {
        studyTime: {
          daily: dailyStudyTime,
          weekly: [], // Would implement weekly aggregation
          monthly: [], // Would implement monthly aggregation
          labels: dailyLabels
        },
        performance: {
          assessmentScores: attemptsData?.map(a => (a.score / a.total_points) * 100) || [],
          courseCompletion: [], // Would need course completion tracking
          subjects: Array.from(subjectMap.keys())
        },
        productivity: {
          streakData: [], // Would need streak history
          sessionsPerDay: dailyStudyTime.map(hours => Math.ceil(hours / 2)), // Estimate sessions
          focusTime: dailyStudyTime
        },
        comparison: {
          thisWeek: Math.floor(thisWeekTime / 60),
          lastWeek: Math.floor(lastWeekTime / 60),
          thisMonth: Math.floor(dailyStudyTime.reduce((a, b) => a + b, 0)),
          lastMonth: 0, // Would need last month's data
          trend: thisWeekTime > lastWeekTime ? 'up' : thisWeekTime < lastWeekTime ? 'down' : 'stable'
        }
      }

      setAnalytics(analyticsData)
      setSubjectAnalytics(subjectAnalyticsData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-600" />
      case 'down': return <ArrowDown className="w-4 h-4 text-red-600" />
      default: return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Learning Analytics</h1>
            <p className="text-gray-600 mt-2">Deep insights into your learning patterns and performance</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="outline" asChild>
              <Link href="/dashboard/progress">
                <Activity className="w-4 h-4 mr-2" />
                Back to Progress
              </Link>
            </Button>
            <div className="flex border rounded-lg">
              {(['week', 'month', 'year'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">This Week</p>
                    <p className="text-2xl font-bold">{analytics.comparison.thisWeek}h</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(analytics.comparison.trend)}
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <span className={getTrendColor(analytics.comparison.trend)}>
                    {analytics.comparison.trend === 'up' ? '+' : analytics.comparison.trend === 'down' ? '-' : ''}
                    {Math.abs(analytics.comparison.thisWeek - analytics.comparison.lastWeek)}h
                  </span>
                  <span className="text-gray-500">vs last week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Score</p>
                    <p className="text-2xl font-bold">
                      {analytics.performance.assessmentScores.length > 0 
                        ? Math.round(analytics.performance.assessmentScores.reduce((a, b) => a + b, 0) / analytics.performance.assessmentScores.length)
                        : 0}%
                    </p>
                  </div>
                  <Brain className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  {analytics.performance.assessmentScores.length} assessments
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Study Sessions</p>
                    <p className="text-2xl font-bold">
                      {analytics.productivity.sessionsPerDay.reduce((a, b) => a + b, 0)}
                    </p>
                  </div>
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Last {timeRange}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Subjects</p>
                    <p className="text-2xl font-bold">{subjectAnalytics.length}</p>
                  </div>
                  <BookOpen className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Active subjects
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="subjects">By Subject</TabsTrigger>
            <TabsTrigger value="patterns">Study Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Study Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Study Time Trend
                </CardTitle>
                <CardDescription>
                  Daily study hours over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics && (
                  <div className="space-y-4">
                    {/* Simple bar chart representation */}
                    <div className="grid grid-cols-15 gap-1 h-32">
                      {analytics.studyTime.daily.slice(-15).map((hours, index) => {
                        const maxHours = Math.max(...analytics.studyTime.daily)
                        const height = maxHours > 0 ? (hours / maxHours) * 100 : 0
                        return (
                          <div key={index} className="flex flex-col justify-end">
                            <div 
                              className="bg-blue-500 rounded-t"
                              style={{ height: `${height}%`, minHeight: hours > 0 ? '4px' : '0' }}
                              title={`${hours}h on ${analytics.studyTime.labels[analytics.studyTime.labels.length - 15 + index]}`}
                            />
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{analytics.studyTime.labels[analytics.studyTime.labels.length - 15]}</span>
                      <span>{analytics.studyTime.labels[analytics.studyTime.labels.length - 1]}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Study Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {analytics ? analytics.studyTime.daily.reduce((a, b) => a + b, 0) : 0}h
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Average Daily</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {analytics ? Math.round((analytics.studyTime.daily.reduce((a, b) => a + b, 0) / 30) * 10) / 10 : 0}h
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Per day</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Best Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {analytics ? Math.max(...analytics.studyTime.daily) : 0}h
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Single day record</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Performance</CardTitle>
                <CardDescription>
                  Your test scores and performance trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics && analytics.performance.assessmentScores.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(analytics.performance.assessmentScores.reduce((a, b) => a + b, 0) / analytics.performance.assessmentScores.length)}%
                        </div>
                        <div className="text-sm text-gray-600">Average Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.max(...analytics.performance.assessmentScores).toFixed(0)}%
                        </div>
                        <div className="text-sm text-gray-600">Best Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {analytics.performance.assessmentScores.length}
                        </div>
                        <div className="text-sm text-gray-600">Total Tests</div>
                      </div>
                    </div>
                    
                    {/* Score distribution */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Score Distribution</h4>
                      {[
                        { range: '90-100%', color: 'bg-green-500', count: analytics.performance.assessmentScores.filter(s => s >= 90).length },
                        { range: '80-89%', color: 'bg-blue-500', count: analytics.performance.assessmentScores.filter(s => s >= 80 && s < 90).length },
                        { range: '70-79%', color: 'bg-yellow-500', count: analytics.performance.assessmentScores.filter(s => s >= 70 && s < 80).length },
                        { range: 'Below 70%', color: 'bg-red-500', count: analytics.performance.assessmentScores.filter(s => s < 70).length }
                      ].map(({ range, color, count }) => (
                        <div key={range} className="flex items-center gap-3">
                          <div className="w-20 text-sm">{range}</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`${color} h-2 rounded-full`}
                              style={{ width: `${(count / analytics.performance.assessmentScores.length) * 100}%` }}
                            />
                          </div>
                          <div className="w-8 text-sm text-right">{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">No assessment data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjectAnalytics.map((subject) => (
                <Card key={subject.subject}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{subject.subject}</span>
                      {getTrendIcon(subject.trend)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Study Time</div>
                        <div className="font-medium">{subject.totalTime}h</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Sessions</div>
                        <div className="font-medium">{subject.sessions}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Avg Score</div>
                        <div className="font-medium">
                          {subject.averageScore > 0 ? `${subject.averageScore.toFixed(0)}%` : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Courses</div>
                        <div className="font-medium">{subject.coursesCompleted}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {subjectAnalytics.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No subject data</h3>
                  <p className="text-gray-600">Start studying to see subject-wise analytics</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Study Consistency</CardTitle>
                  <CardDescription>
                    How consistent are your study habits?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {analytics.studyTime.daily.filter(h => h > 0).length}
                        </div>
                        <div className="text-sm text-gray-600">Active days (last 30)</div>
                      </div>
                      <Progress 
                        value={(analytics.studyTime.daily.filter(h => h > 0).length / 30) * 100} 
                        className="h-3"
                      />
                      <div className="text-sm text-center text-gray-600">
                        {Math.round((analytics.studyTime.daily.filter(h => h > 0).length / 30) * 100)}% consistency rate
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Focus Quality</CardTitle>
                  <CardDescription>
                    Average session length and focus metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {analytics.productivity.focusTime.length > 0 
                            ? Math.round((analytics.productivity.focusTime.reduce((a, b) => a + b, 0) / analytics.productivity.sessionsPerDay.reduce((a, b) => a + b, 0)) * 10) / 10
                            : 0}h
                        </div>
                        <div className="text-sm text-gray-600">Avg session length</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium">
                            {Math.max(...(analytics.productivity.focusTime || [0]))}h
                          </div>
                          <div className="text-gray-600">Longest session</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">
                            {analytics.productivity.sessionsPerDay.reduce((a, b) => a + b, 0)}
                          </div>
                          <div className="text-gray-600">Total sessions</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
