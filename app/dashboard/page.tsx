'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, 
  TrendingUp, 
  Users, 
  Brain, 
  Upload, 
  MessageSquare, 
  Target, 
  Trophy, 
  Zap,
  Sparkles,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createSupabaseClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalCourses: 0,
    studyHours: 0,
    currentStreak: 0,
    level: 1,
    xp: 0,
    xpToNext: 100
  })
  const [aiInsight, setAiInsight] = useState<string>('')
  const [insightLoading, setInsightLoading] = useState(false)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    } else if (user) {
      fetchDashboardData()
    }
  }, [user, loading, router])

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      // Fetch user progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Fetch courses count
      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Fetch total study time from study sessions
      const { data: studyData } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', user.id)

      const totalStudyMinutes = studyData?.reduce((acc: number, session: any) => acc + session.duration, 0) || 0

      setStats({
        totalCourses: coursesCount || 0,
        studyHours: Math.floor(totalStudyMinutes / 60),
        currentStreak: progressData?.current_streak || 0,
        level: progressData?.level || 1,
        xp: progressData?.xp || 0,
        xpToNext: ((progressData?.level || 1) * 100) - (progressData?.xp || 0)
      })
      
      // Fetch recent activities
      await fetchRecentActivities()
      
      // Fetch AI insights
      fetchAIInsight()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const fetchRecentActivities = async () => {
    if (!user) return

    try {
      // Fetch recent XP activities
      const { data: xpActivities } = await supabase
        .from('xp_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch recent courses
      const { data: recentCourses } = await supabase
        .from('courses')
        .select('name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      // Fetch recent study sessions
      const { data: recentSessions } = await supabase
        .from('study_sessions')
        .select('duration, start_time, courses(name)')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(3)

      // Combine and format activities
      const activities = [
        ...(xpActivities?.map(activity => ({
          type: 'xp',
          title: activity.description,
          time: activity.created_at,
          icon: 'star',
          color: 'purple'
        })) || []),
        ...(recentCourses?.map(course => ({
          type: 'course',
          title: `Uploaded "${course.name}" course`,
          time: course.created_at,
          icon: 'book',
          color: 'blue'
        })) || []),
        ...(recentSessions?.map(session => ({
          type: 'session',
          title: `Studied for ${Math.floor(session.duration / 60)} minutes`,
          time: session.start_time,
          icon: 'target',
          color: 'green'
        })) || [])
      ]

      // Sort by time and take top 5
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setRecentActivities(activities.slice(0, 5))
    } catch (error) {
      console.error('Error fetching recent activities:', error)
    }
  }

  const fetchAIInsight = async () => {
    if (!user) return
    
    setInsightLoading(true)
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          type: 'study_recommendations'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAiInsight(data.insight)
      }
    } catch (error) {
      console.error('Error fetching AI insight:', error)
    } finally {
      setInsightLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {userProfile?.full_name || user.email}! 👋
            </h1>
            <p className="text-gray-600 mt-2">
              Ready to continue your learning journey?
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button asChild>
              <Link href="/dashboard/courses/upload">
                <Upload className="w-4 h-4 mr-2" />
                Upload Course
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/ai-assistant">
                <Brain className="w-4 h-4 mr-2" />
                AI Assistant
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalCourses === 0 ? 'Upload your first course' : 'Courses uploaded'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.studyHours}h</div>
              <p className="text-xs text-muted-foreground">
                {stats.studyHours === 0 ? 'Start your first study session' : 'Total study time'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentStreak} days</div>
              <p className="text-xs text-muted-foreground">
                {stats.currentStreak === 0 ? 'Start your streak today!' : 'Keep it up! 🔥'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Level</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Level {stats.level}</div>
              <div className="mt-2">
                <Progress value={(stats.xp / stats.xpToNext) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.xp}/{stats.xpToNext} XP
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              AI Study Insights
            </CardTitle>
            <CardDescription>
              Personalized recommendations based on your learning patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insightLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span className="text-sm text-gray-600">Analyzing your learning data...</span>
              </div>
            ) : aiInsight ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 whitespace-pre-line">{aiInsight}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => fetchAIInsight()}>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Get New Insight
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/dashboard/ai-assistant">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Chat with AI
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">Get personalized study insights</p>
                <Button size="sm" onClick={() => fetchAIInsight()}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Generate Insights
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Upload New Course</CardTitle>
              <CardDescription>
                Add your study materials and let AI organize them for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/dashboard/courses/upload">
                  Get Started
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>AI Study Assistant</CardTitle>
              <CardDescription>
                Get instant help with your questions and study materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/ai-assistant">
                  Start Chatting
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Join Study Groups</CardTitle>
              <CardDescription>
                Connect with classmates and study together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/groups">
                  Explore Groups
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => {
                    const getIcon = () => {
                      switch (activity.icon) {
                        case 'book': return <BookOpen className="w-4 h-4 text-blue-600" />
                        case 'target': return <Target className="w-4 h-4 text-green-600" />
                        case 'star': return <Sparkles className="w-4 h-4 text-purple-600" />
                        default: return <Clock className="w-4 h-4 text-gray-600" />
                      }
                    }

                    const getBgColor = () => {
                      switch (activity.color) {
                        case 'blue': return 'bg-blue-100'
                        case 'green': return 'bg-green-100'
                        case 'purple': return 'bg-purple-100'
                        default: return 'bg-gray-100'
                      }
                    }

                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-8 h-8 ${getBgColor()} rounded-full flex items-center justify-center`}>
                          {getIcon()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-gray-500">{formatDate(new Date(activity.time))}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs mt-1">Start studying to see your activity here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.totalCourses > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        Continue your active courses
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        You have {stats.totalCourses} course{stats.totalCourses > 1 ? 's' : ''} to study
                      </p>
                    </div>
                    {stats.studyHours > 0 && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-900">
                          Great progress on your studies!
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          You've studied for {stats.studyHours} hours total
                        </p>
                      </div>
                    )}
                    {stats.currentStreak > 0 && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm font-medium text-purple-900">
                          Keep your {stats.currentStreak}-day streak going!
                        </p>
                        <p className="text-xs text-purple-700 mt-1">
                          Study today to maintain your momentum
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recommendations yet</p>
                    <p className="text-xs mt-1">Upload courses and start studying to get personalized recommendations</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Status */}
        {userProfile?.subscription_plan === 'free' && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Upgrade Your Experience</CardTitle>
              <CardDescription className="text-blue-700">
                Unlock unlimited AI queries, advanced analytics, and more features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild>
                  <Link href="/pricing">
                    View Plans
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/features">
                    Learn More
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
