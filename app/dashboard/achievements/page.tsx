'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Trophy,
  Award,
  Star,
  Target,
  Zap,
  BookOpen,
  Users,
  Calendar,
  TrendingUp,
  Lock,
  CheckCircle,
  Clock,
  Flame,
  Brain
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'study' | 'social' | 'streak' | 'course' | 'assessment'
  requirements: Record<string, any>
  xp_reward: number
  badge_color: string
  unlocked: boolean
  unlockedAt?: Date
  progress?: number
  maxProgress?: number
}

interface AchievementStats {
  totalAchievements: number
  unlockedAchievements: number
  totalXP: number
  completionRate: number
  recentUnlocks: number
}

export default function AchievementsPage() {
  const { user, userProfile } = useAuth()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [stats, setStats] = useState<AchievementStats>({
    totalAchievements: 0,
    unlockedAchievements: 0,
    totalXP: 0,
    completionRate: 0,
    recentUnlocks: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'study' | 'social' | 'streak' | 'course' | 'assessment'>('all')
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (user) {
      fetchAchievements()
    }
  }, [user])

  const fetchAchievements = async () => {
    if (!user) return

    try {
      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true })

      if (achievementsError) {
        console.error('Error fetching achievements:', achievementsError)
        return
      }

      // Fetch user progress
      const { data: userProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Fetch user stats for progress calculation
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', user.id)

      const { data: sessionsData } = await supabase
        .from('study_sessions')
        .select('duration, start_time')
        .eq('user_id', user.id)

      const { data: assessmentAttempts } = await supabase
        .from('assessment_attempts')
        .select('score, total_points')
        .eq('user_id', user.id)

      // Calculate user stats
      const totalCourses = coursesData?.length || 0
      const totalStudyTime = sessionsData?.reduce((acc, session) => acc + session.duration, 0) || 0
      const totalAssessments = assessmentAttempts?.length || 0
      const currentStreak = userProgress?.current_streak || 0
      const longestStreak = userProgress?.longest_streak || 0

      // Transform achievements with unlock status and progress
      const transformedAchievements: Achievement[] = allAchievements?.map(achievement => {
        const isUnlocked = userProgress?.achievements?.includes(achievement.name) || false
        let progress = 0
        let maxProgress = 1

        // Calculate progress based on achievement requirements
        if (!isUnlocked && achievement.requirements) {
          const req = achievement.requirements
          
          if (req.courses_completed) {
            maxProgress = req.courses_completed
            progress = Math.min(totalCourses, maxProgress)
          } else if (req.study_hours) {
            maxProgress = req.study_hours
            progress = Math.min(Math.floor(totalStudyTime / 60), maxProgress)
          } else if (req.assessments_completed) {
            maxProgress = req.assessments_completed
            progress = Math.min(totalAssessments, maxProgress)
          } else if (req.streak_days) {
            maxProgress = req.streak_days
            progress = Math.min(currentStreak, maxProgress)
          } else if (req.longest_streak) {
            maxProgress = req.longest_streak
            progress = Math.min(longestStreak, maxProgress)
          }
        }

        return {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          requirements: achievement.requirements,
          xp_reward: achievement.xp_reward,
          badge_color: achievement.badge_color,
          unlocked: isUnlocked,
          unlockedAt: isUnlocked ? new Date() : undefined, // Would need user_achievements table for actual date
          progress: isUnlocked ? maxProgress : progress,
          maxProgress
        }
      }) || []

      setAchievements(transformedAchievements)

      // Calculate stats
      const unlockedCount = transformedAchievements.filter(a => a.unlocked).length
      const totalXP = transformedAchievements
        .filter(a => a.unlocked)
        .reduce((acc, a) => acc + a.xp_reward, 0)
      const recentUnlocks = transformedAchievements
        .filter(a => a.unlocked && a.unlockedAt && 
          new Date().getTime() - a.unlockedAt.getTime() < 7 * 24 * 60 * 60 * 1000)
        .length

      setStats({
        totalAchievements: transformedAchievements.length,
        unlockedAchievements: unlockedCount,
        totalXP,
        completionRate: transformedAchievements.length > 0 ? (unlockedCount / transformedAchievements.length) * 100 : 0,
        recentUnlocks
      })
    } catch (error) {
      console.error('Error fetching achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAchievements = achievements.filter(achievement => 
    selectedCategory === 'all' || achievement.category === selectedCategory
  )

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'study': return <BookOpen className="w-4 h-4" />
      case 'social': return <Users className="w-4 h-4" />
      case 'streak': return <Flame className="w-4 h-4" />
      case 'course': return <Trophy className="w-4 h-4" />
      case 'assessment': return <Brain className="w-4 h-4" />
      default: return <Award className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'study': return 'bg-blue-100 text-blue-800'
      case 'social': return 'bg-green-100 text-green-800'
      case 'streak': return 'bg-orange-100 text-orange-800'
      case 'course': return 'bg-purple-100 text-purple-800'
      case 'assessment': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRarityFromXP = (xp: number) => {
    if (xp >= 500) return { label: 'Legendary', color: 'border-yellow-400 bg-yellow-50' }
    if (xp >= 200) return { label: 'Epic', color: 'border-purple-400 bg-purple-50' }
    if (xp >= 100) return { label: 'Rare', color: 'border-blue-400 bg-blue-50' }
    return { label: 'Common', color: 'border-gray-400 bg-gray-50' }
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
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-gray-600 mt-2">Track your learning milestones and unlock rewards</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold">{stats.unlockedAchievements}</div>
              <div className="text-sm text-gray-600">Unlocked</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats.totalAchievements}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats.totalXP}</div>
              <div className="text-sm text-gray-600">XP Earned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats.completionRate.toFixed(0)}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold">{stats.recentUnlocks}</div>
              <div className="text-sm text-gray-600">This Week</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Overall Progress</h3>
              <span className="text-sm text-gray-600">
                {stats.unlockedAchievements} / {stats.totalAchievements}
              </span>
            </div>
            <Progress value={stats.completionRate} className="h-3" />
          </CardContent>
        </Card>

        {/* Category Filters */}
        <Tabs value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="study">Study</TabsTrigger>
            <TabsTrigger value="course">Course</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="streak">Streak</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAchievements.map((achievement) => {
                const rarity = getRarityFromXP(achievement.xp_reward)
                const progressPercentage = achievement.maxProgress ? 
                  (achievement.progress! / achievement.maxProgress) * 100 : 0

                return (
                  <Card 
                    key={achievement.id} 
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${
                      achievement.unlocked 
                        ? `border-2 ${rarity.color}` 
                        : 'opacity-75 hover:opacity-90'
                    }`}
                  >
                    {achievement.unlocked && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                    )}
                    
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                          achievement.unlocked ? 'bg-white' : 'bg-gray-100'
                        }`}>
                          {achievement.unlocked ? achievement.icon : '🔒'}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{achievement.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getCategoryColor(achievement.category)}>
                              {getCategoryIcon(achievement.category)}
                              <span className="ml-1 capitalize">{achievement.category}</span>
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rarity.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                      
                      {!achievement.unlocked && achievement.maxProgress && achievement.maxProgress > 1 && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress} / {achievement.maxProgress}</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">{achievement.xp_reward} XP</span>
                        </div>
                        {achievement.unlocked && achievement.unlockedAt && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(achievement.unlockedAt)}</span>
                          </div>
                        )}
                      </div>
                      
                      {!achievement.unlocked && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          {achievement.requirements && Object.entries(achievement.requirements).map(([key, value]) => (
                            <div key={key}>
                              {key.replace('_', ' ')}: {value}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filteredAchievements.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No achievements found</h3>
                  <p className="text-gray-600">
                    {selectedCategory === 'all' 
                      ? 'No achievements are available at the moment.'
                      : `No ${selectedCategory} achievements found.`
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
