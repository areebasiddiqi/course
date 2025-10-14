export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  bio?: string
  university?: string
  major?: string
  year?: string
  student_id?: string
  role: 'student' | 'admin'
  subscription_plan?: 'free' | 'semester' | 'session'
  subscription_status?: 'active' | 'inactive' | 'cancelled'
  subscription_end_date?: string
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  user_id: string
  name: string
  description?: string
  subject: string
  semester?: string
  professor?: string
  thumbnail_url?: string
  file_count: number
  total_size: number
  created_at: string
  updated_at: string
  files?: CourseFile[]
}

export interface CourseFile {
  id: string
  course_id: string
  name: string
  original_name: string
  file_type: string
  file_size: number
  file_url: string
  upload_date: string
  processed: boolean
}

export interface StudySession {
  id: string
  user_id: string
  course_id?: string
  duration: number
  start_time: string
  end_time?: string
  activity_type: 'reading' | 'practice' | 'review' | 'assessment'
  notes?: string
  created_at: string
}

export interface Assessment {
  id: string
  user_id: string
  course_id: string
  title: string
  description?: string
  questions: Question[]
  time_limit?: number
  difficulty: 'easy' | 'medium' | 'hard'
  total_points: number
  created_at: string
}

export interface Question {
  id: string
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank'
  question_text: string
  options?: string[]
  correct_answer: string | string[]
  explanation?: string
  points: number
}

export interface AssessmentAttempt {
  id: string
  assessment_id: string
  user_id: string
  answers: Record<string, any>
  score: number
  total_points: number
  time_taken: number
  completed_at: string
  created_at: string
}

export interface StudyGroup {
  id: string
  name: string
  description?: string
  subject?: string
  university?: string
  is_public: boolean
  member_limit?: number
  created_by: string
  created_at: string
  member_count: number
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'moderator' | 'member'
  joined_at: string
}

export interface Message {
  id: string
  group_id?: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'voice'
  file_url?: string
  reply_to?: string
  edited: boolean
  created_at: string
  updated_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  level: number
  xp: number
  current_streak: number
  longest_streak: number
  total_study_time: number
  courses_completed: number
  assessments_completed: number
  achievements: string[]
  companion_type?: 'dog' | 'cat' | 'tree'
  companion_name?: string
  companion_happiness: number
  last_activity: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'study' | 'social' | 'streak' | 'course' | 'assessment'
  requirements: Record<string, any>
  xp_reward: number
  badge_color: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  duration_months: number
  ai_queries_limit: number
  audio_minutes_limit: number
  project_generations_limit: number
  features: string[]
  stripe_price_id: string
}

export interface UsageStats {
  user_id: string
  ai_queries_used: number
  audio_minutes_used: number
  project_generations_used: number
  reset_date: string
}

export interface Event {
  id: string
  title: string
  description?: string
  event_type: 'study_session' | 'workshop' | 'webinar' | 'hackathon' | 'networking'
  start_date: string
  end_date: string
  location?: string
  is_virtual: boolean
  capacity?: number
  registration_required: boolean
  created_by: string
  created_at: string
  attendee_count: number
}

export interface Project {
  id: string
  user_id: string
  title: string
  description?: string
  subject: string
  due_date?: string
  status: 'planning' | 'in_progress' | 'completed' | 'submitted'
  collaborators?: string[]
  files: string[]
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  category: 'assignment' | 'reading' | 'practice' | 'review' | 'project'
  priority: 'high' | 'medium' | 'low'
  due_date?: string
  status: 'todo' | 'in_progress' | 'completed'
  course_id?: string
  project_id?: string
  created_at: string
  updated_at: string
}
