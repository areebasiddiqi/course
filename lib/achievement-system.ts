import { createSupabaseClient } from './supabase-client'

export interface AchievementRequirement {
  courses_completed?: number
  courses_uploaded?: number
  study_hours?: number
  study_sessions?: number
  assessments_completed?: number
  streak_days?: number
  longest_streak?: number
  xp_earned?: number
  files_viewed?: number
  sessions_completed?: number
  groups_joined?: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'study' | 'social' | 'streak' | 'course' | 'assessment'
  requirements: AchievementRequirement
  xp_reward: number
  badge_color: string
}

export async function checkAndUnlockAchievements(userId: string) {
  const supabase = createSupabaseClient()
  
  try {
    // Get user's current progress
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!userProgress) return []

    // Get user's activity stats
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id')
      .eq('user_id', userId)

    const { data: sessionsData } = await supabase
      .from('study_sessions')
      .select('duration, end_time')
      .eq('user_id', userId)

    const { data: assessmentAttempts } = await supabase
      .from('assessment_attempts')
      .select('id')
      .eq('user_id', userId)

    const { data: xpActivities } = await supabase
      .from('xp_activities')
      .select('activity_type')
      .eq('user_id', userId)

    const { data: groupMemberships } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', userId)

    // Calculate user stats
    const totalCoursesUploaded = coursesData?.length || 0
    const totalStudyTime = sessionsData?.reduce((acc, session) => acc + session.duration, 0) || 0
    const totalStudySessions = sessionsData?.filter(s => s.end_time !== null).length || 0
    const totalAssessments = assessmentAttempts?.length || 0
    const filesViewed = xpActivities?.filter(a => a.activity_type === 'file_view').length || 0
    const sessionsCompleted = xpActivities?.filter(a => a.activity_type === 'session_complete').length || 0
    const groupsJoined = groupMemberships?.length || 0

    // Get all achievements
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*')

    if (!allAchievements) return []

    const unlockedAchievements: Achievement[] = []
    const currentAchievements = userProgress.achievements || []

    for (const achievement of allAchievements) {
      // Skip if already unlocked
      if (currentAchievements.includes(achievement.name)) continue

      const req = achievement.requirements as AchievementRequirement
      let shouldUnlock = false

      // Check each requirement type
      if (req.courses_completed && totalCoursesUploaded >= req.courses_completed) {
        shouldUnlock = true
      } else if (req.courses_uploaded && totalCoursesUploaded >= req.courses_uploaded) {
        shouldUnlock = true
      } else if (req.study_sessions && totalStudySessions >= req.study_sessions) {
        shouldUnlock = true
      } else if (req.study_hours && Math.floor(totalStudyTime / 60) >= req.study_hours) {
        shouldUnlock = true
      } else if (req.assessments_completed && totalAssessments >= req.assessments_completed) {
        shouldUnlock = true
      } else if (req.streak_days && userProgress.current_streak >= req.streak_days) {
        shouldUnlock = true
      } else if (req.longest_streak && userProgress.longest_streak >= req.longest_streak) {
        shouldUnlock = true
      } else if (req.xp_earned && userProgress.xp >= req.xp_earned) {
        shouldUnlock = true
      } else if (req.files_viewed && filesViewed >= req.files_viewed) {
        shouldUnlock = true
      } else if (req.sessions_completed && sessionsCompleted >= req.sessions_completed) {
        shouldUnlock = true
      } else if (req.groups_joined && groupsJoined >= req.groups_joined) {
        shouldUnlock = true
      }

      if (shouldUnlock) {
        // Add achievement to user's unlocked achievements
        const updatedAchievements = [...currentAchievements, achievement.name]
        
        // Update user progress with new achievement and bonus XP
        await supabase
          .from('user_progress')
          .update({
            achievements: updatedAchievements,
            xp: userProgress.xp + achievement.xp_reward
          })
          .eq('user_id', userId)

        // Log the achievement unlock as an XP activity
        await supabase
          .from('xp_activities')
          .insert({
            user_id: userId,
            activity_type: 'achievement_unlock',
            xp_earned: achievement.xp_reward,
            description: `Unlocked achievement: ${achievement.name}`
          })

        unlockedAchievements.push(achievement)
      }
    }

    return unlockedAchievements
  } catch (error) {
    console.error('Error checking achievements:', error)
    return []
  }
}

export async function awardXP(
  userId: string, 
  amount: number, 
  activity: string, 
  description: string
): Promise<Achievement[]> {
  const supabase = createSupabaseClient()
  
  try {
    // Get current user progress
    const { data: currentProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single()

    const newXP = (currentProgress?.xp || 0) + amount
    const newLevel = Math.floor(newXP / 100) + 1
    const currentStreak = currentProgress?.current_streak || 0

    // Update user progress
    await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        xp: newXP,
        level: newLevel,
        current_streak: currentStreak,
        longest_streak: Math.max(currentStreak, currentProgress?.longest_streak || 0),
        last_activity: new Date().toISOString()
      })

    // Log the XP activity
    await supabase
      .from('xp_activities')
      .insert({
        user_id: userId,
        activity_type: activity,
        xp_earned: amount,
        description: description
      })

    // Check for newly unlocked achievements
    const newAchievements = await checkAndUnlockAchievements(userId)
    
    return newAchievements
  } catch (error) {
    console.error('Error awarding XP:', error)
    return []
  }
}
