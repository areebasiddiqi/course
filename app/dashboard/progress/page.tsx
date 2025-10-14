'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  TrendingUp,
  Calendar,
  Clock,
  Award,
  Target,
  BookOpen,
  Brain,
  Zap,
  Trophy,
  Star,
  CheckCircle,
  BarChart3,
  Activity,
  Flame
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface CourseProgress {
  id: string
  title: string
  thumbnail: string
  totalLessons: number
  completedLessons: number
  totalTime: number
  timeSpent: number
  lastAccessed: Date
  certificate?: {
    id: string
    earnedAt: Date
    score: number
  }
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earnedAt: Date
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface StudySession {
  id: string
  date: Date
  duration: number
  coursesStudied: string[]
  lessonsCompleted: number
  pointsEarned: number
}

interface LearningGoal {
  id: string
  title: string
  target: number
  current: number
  unit: string
  deadline: Date
  type: 'daily' | 'weekly' | 'monthly'
}

export default function ProgressPage() {
  const { user, userProfile } = useAuth()
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [studySessions, setStudySessions] = useState<StudySession[]>([])
  const [learningGoals, setLearningGoals] = useState<LearningGoal[]>([])
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalHours: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalPoints: 0,
    level: 1,
    xpToNext: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (user) {
      fetchProgressData()
    }
  }, [user])

  const fetchProgressData = async () => {
    if (!user) return

    try {
      // Fetch user progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Fetch courses with study sessions
      const { data: coursesData } = await supabase
        .from('courses')
        .select(`
          *,
          study_sessions(duration, start_time)
        `)
        .eq('user_id', user.id)

      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .in('name', progressData?.achievements || [])

      // Fetch recent study sessions
      const { data: sessionsData } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(10)

      // Transform courses data
      const courseProgress: CourseProgress[] = coursesData?.map(course => {
        const sessions = course.study_sessions || []
        const totalTime = sessions.reduce((acc: number, session: any) => acc + session.duration, 0)
        
        return {
          id: course.id,
          title: course.name,
          thumbnail: course.thumbnail_url || '/placeholder-course.jpg',
          totalLessons: 10, // Default value - would need lessons table
          completedLessons: Math.floor(sessions.length * 0.7), // Estimate based on sessions
          totalTime: totalTime,
          timeSpent: totalTime,
          lastAccessed: sessions.length > 0 ? new Date(sessions[0].start_time) : new Date(course.created_at)
        }
      }) || []

      // Transform achievements data
      const achievements: Achievement[] = achievementsData?.map(achievement => ({
        id: achievement.id,
        title: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        earnedAt: new Date(), // Would need user_achievements table for actual date
        rarity: 'common' as const // Default rarity
      })) || []

      // Transform study sessions
      const studySessions: StudySession[] = sessionsData?.map(session => ({
        id: session.id,
        date: new Date(session.start_time),
        duration: session.duration,
        coursesStudied: [session.course_id], // Simplified
        lessonsCompleted: 1, // Estimate
        pointsEarned: session.duration * 2 // 2 points per minute
      })) || []

      setCourseProgress(courseProgress)
      setAchievements(achievements)
      setStudySessions(studySessions)
      
      setStats({
        totalCourses: courseProgress.length,
        completedCourses: courseProgress.filter(c => c.completedLessons === c.totalLessons).length,
        totalHours: Math.floor(courseProgress.reduce((acc, c) => acc + c.timeSpent, 0) / 60),
        currentStreak: progressData?.current_streak || 0,
        longestStreak: progressData?.longest_streak || 0,
        totalPoints: progressData?.xp || 0,
        level: progressData?.level || 1,
        xpToNext: ((progressData?.level || 1) * 100) - (progressData?.xp || 0)
      })
    } catch (error) {
      console.error('Error fetching progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-green-100 text-green-800'
      case 'weekly': return 'bg-blue-100 text-blue-800'
      case 'monthly': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
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
            <h1 className="text-3xl font-bold">Learning Progress</h1>
            <p className="text-gray-600 mt-2">Track your learning journey and achievements</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="outline" asChild>
              <Link href="/dashboard/analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Detailed Analytics
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/calendar">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <div className="text-sm text-gray-600">Total Courses</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats.completedCourses}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats.totalHours}</div>
              <div className="text-sm text-gray-600">Hours Studied</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold">{stats.currentStreak}</div>
              <div className="text-sm text-gray-600">Day Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold">{stats.totalPoints}</div>
              <div className="text-sm text-gray-600">Total XP</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
              <div className="text-2xl font-bold">Level {stats.level}</div>
              <div className="text-sm text-gray-600">{stats.xpToNext} to next</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="courses">Course Progress</TabsTrigger>
            <TabsTrigger value="goals">Learning Goals</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Course Progress
                </CardTitle>
                <CardDescription>
                  Track your progress across all enrolled courses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {courseProgress.map((course) => {
                  const progressPercentage = (course.completedLessons / course.totalLessons) * 100
                  const timeProgressPercentage = (course.timeSpent / course.totalTime) * 100
                  
                  return (
                    <div key={course.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{course.title}</h3>
                              <p className="text-sm text-gray-600">
                                Last accessed: {formatDate(course.lastAccessed)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {course.certificate && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  <Award className="w-3 h-3 mr-1" />
                                  Certified
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {course.completedLessons}/{course.totalLessons} lessons
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Lesson Progress</span>
                                <span>{progressPercentage.toFixed(0)}%</span>
                              </div>
                              <Progress value={progressPercentage} />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Time Progress</span>
                                <span>{Math.floor(course.timeSpent / 60)}h / {Math.floor(course.totalTime / 60)}h</span>
                              </div>
                              <Progress value={timeProgressPercentage} className="bg-blue-100" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Learning Goals
                </CardTitle>
                <CardDescription>
                  Set and track your learning objectives
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {learningGoals.map((goal) => {
                  const progressPercentage = (goal.current / goal.target) * 100
                  const isCompleted = goal.current >= goal.target
                  
                  return (
                    <div key={goal.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{goal.title}</h3>
                          <p className="text-sm text-gray-600">
                            {goal.current} / {goal.target} {goal.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getGoalTypeColor(goal.type)}>
                            {goal.type}
                          </Badge>
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(progressPercentage, 100)} 
                        className={isCompleted ? 'bg-green-100' : ''} 
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Deadline: {formatDate(goal.deadline)}
                      </p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Achievements
                </CardTitle>
                <CardDescription>
                  Your learning milestones and accomplishments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`border-2 rounded-lg p-4 ${getRarityColor(achievement.rarity)}`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">{achievement.icon}</div>
                        <h3 className="font-semibold mb-1">{achievement.title}</h3>
                        <p className="text-sm mb-2">{achievement.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {achievement.rarity}
                        </Badge>
                        <p className="text-xs mt-2 opacity-75">
                          Earned {formatDate(achievement.earnedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Study Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {studySessions.map((session) => (
                    <div key={session.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{formatDate(session.date)}</h4>
                          <Badge variant="outline">{session.pointsEarned} XP</Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {session.duration} min • {session.lessonsCompleted} lessons • {session.coursesStudied.length} courses
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Learning Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Current Streak</span>
                      <span className="font-medium">{stats.currentStreak} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Longest Streak</span>
                      <span className="font-medium">{stats.longestStreak} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Average Session</span>
                      <span className="font-medium">
                        {Math.round(studySessions.reduce((acc, s) => acc + s.duration, 0) / studySessions.length)} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completion Rate</span>
                      <span className="font-medium">
                        {Math.round((stats.completedCourses / stats.totalCourses) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Achievements</span>
                      <span className="font-medium">{achievements.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
