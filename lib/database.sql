-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE subscription_plan AS ENUM ('free', 'semester', 'session');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE task_category AS ENUM ('assignment', 'reading', 'practice', 'review', 'project');
CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed');
CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'completed', 'submitted');
CREATE TYPE group_role AS ENUM ('admin', 'moderator', 'member');
CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'voice');
CREATE TYPE event_type AS ENUM ('study_session', 'workshop', 'webinar', 'hackathon', 'networking');
CREATE TYPE companion_type AS ENUM ('dog', 'cat', 'tree');
CREATE TYPE achievement_category AS ENUM ('study', 'social', 'streak', 'course', 'assessment');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    university TEXT,
    major TEXT,
    year TEXT,
    student_id TEXT,
    role user_role DEFAULT 'student',
    subscription_plan subscription_plan DEFAULT 'free',
    subscription_status subscription_status DEFAULT 'inactive',
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE public.courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    semester TEXT,
    professor TEXT,
    thumbnail_url TEXT,
    file_count INTEGER DEFAULT 0,
    total_size BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course files table
CREATE TABLE public.course_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- Study sessions table
CREATE TABLE public.study_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    duration INTEGER NOT NULL, -- in minutes
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    activity_type TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessments table
CREATE TABLE public.assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL,
    time_limit INTEGER, -- in minutes
    difficulty difficulty_level DEFAULT 'medium',
    total_points INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment attempts table
CREATE TABLE public.assessment_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    score INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    time_taken INTEGER NOT NULL, -- in minutes
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study groups table
CREATE TABLE public.study_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    university TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    member_limit INTEGER,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    member_count INTEGER DEFAULT 1
);

-- Group members table
CREATE TABLE public.group_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role group_role DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Messages table
CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    file_url TEXT,
    reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table
CREATE TABLE public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_study_time INTEGER DEFAULT 0, -- in minutes
    courses_completed INTEGER DEFAULT 0,
    assessments_completed INTEGER DEFAULT 0,
    achievements TEXT[] DEFAULT '{}',
    companion_type companion_type DEFAULT 'dog',
    companion_name TEXT DEFAULT 'Buddy',
    companion_happiness INTEGER DEFAULT 100,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements table
CREATE TABLE public.achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category achievement_category NOT NULL,
    requirements JSONB NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    badge_color TEXT DEFAULT '#3B82F6'
);

-- Subscription plans table
CREATE TABLE public.subscription_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price INTEGER NOT NULL, -- in cents
    duration_months INTEGER NOT NULL,
    ai_queries_limit INTEGER NOT NULL,
    audio_minutes_limit INTEGER NOT NULL,
    project_generations_limit INTEGER NOT NULL,
    features TEXT[] NOT NULL,
    stripe_price_id TEXT UNIQUE
);

-- Usage stats table
CREATE TABLE public.usage_stats (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    ai_queries_used INTEGER DEFAULT 0,
    audio_minutes_used INTEGER DEFAULT 0,
    project_generations_used INTEGER DEFAULT 0,
    reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE public.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type event_type NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    is_virtual BOOLEAN DEFAULT FALSE,
    capacity INTEGER,
    registration_required BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attendee_count INTEGER DEFAULT 0
);

-- Projects table
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status project_status DEFAULT 'planning',
    collaborators UUID[],
    files TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category task_category NOT NULL,
    priority task_priority DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    status task_status DEFAULT 'todo',
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_courses_user_id ON public.courses(user_id);
CREATE INDEX idx_course_files_course_id ON public.course_files(course_id);
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_assessments_user_id ON public.assessments(user_id);
CREATE INDEX idx_assessment_attempts_user_id ON public.assessment_attempts(user_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_messages_group_id ON public.messages(group_id);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Users can manage their own courses
CREATE POLICY "Users can manage own courses" ON public.courses FOR ALL USING (auth.uid() = user_id);

-- Users can manage files in their own courses
CREATE POLICY "Users can manage own course files" ON public.course_files FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_files.course_id AND courses.user_id = auth.uid())
);

-- Users can manage their own study sessions
CREATE POLICY "Users can manage own study sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own assessments
CREATE POLICY "Users can manage own assessments" ON public.assessments FOR ALL USING (auth.uid() = user_id);

-- Users can manage their own assessment attempts
CREATE POLICY "Users can manage own assessment attempts" ON public.assessment_attempts FOR ALL USING (auth.uid() = user_id);

-- Study groups policies
CREATE POLICY "Users can view public groups" ON public.study_groups FOR SELECT USING (is_public = true);
CREATE POLICY "Group members can view private groups" ON public.study_groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = study_groups.id AND group_members.user_id = auth.uid())
);
CREATE POLICY "Users can create groups" ON public.study_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group admins can update groups" ON public.study_groups FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = study_groups.id AND group_members.user_id = auth.uid() AND group_members.role = 'admin')
);

-- Group members policies
CREATE POLICY "Users can view group members" ON public.group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Group members can view messages" ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = messages.group_id AND group_members.user_id = auth.uid())
);
CREATE POLICY "Group members can send messages" ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = messages.group_id AND group_members.user_id = auth.uid())
);

-- User progress policies
CREATE POLICY "Users can view own progress" ON public.user_progress FOR ALL USING (auth.uid() = user_id);

-- Usage stats policies
CREATE POLICY "Users can view own usage stats" ON public.usage_stats FOR ALL USING (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Users can view all events" ON public.events FOR SELECT TO authenticated;
CREATE POLICY "Users can create events" ON public.events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Event creators can update events" ON public.events FOR UPDATE USING (auth.uid() = created_by);

-- Projects policies
CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, price, duration_months, ai_queries_limit, audio_minutes_limit, project_generations_limit, features) VALUES
('Semester Plan', 1500, 4, 500, 120, 20, ARRAY['Unlimited course uploads', 'Unlimited mock tests', 'Full group study access', 'Basic analytics', 'Email support']),
('Session Plan', 2500, 12, 2000, 500, 100, ARRAY['Unlimited course uploads', 'Unlimited mock tests', 'Full group study access', 'Advanced analytics', 'Priority support', 'Early access to beta features']);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, category, requirements, xp_reward, badge_color) VALUES
('First Steps', 'Complete your first study session', '🎯', 'study', '{"study_sessions": 1}', 50, '#10B981'),
('Study Streak', 'Maintain a 7-day study streak', '🔥', 'streak', '{"streak_days": 7}', 100, '#F59E0B'),
('Course Master', 'Upload your first course', '📚', 'course', '{"courses_uploaded": 1}', 75, '#3B82F6'),
('Test Taker', 'Complete your first assessment', '✅', 'assessment', '{"assessments_completed": 1}', 60, '#8B5CF6'),
('Social Butterfly', 'Join your first study group', '👥', 'social', '{"groups_joined": 1}', 80, '#EC4899');

-- Functions to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation in public.users table
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create public.users record when auth.users is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to handle user profile updates
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the public.users record if it exists
  UPDATE public.users
  SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    updated_at = NOW()
  WHERE id = NEW.id;

  -- If no record exists, create one (handles edge cases)
  IF NOT FOUND THEN
    INSERT INTO public.users (id, email, full_name, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle auth.users updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- Also create the user_progress record when a new user is created
CREATE OR REPLACE FUNCTION handle_new_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user_progress when public.users is created
DROP TRIGGER IF EXISTS on_public_user_created ON public.users;
CREATE TRIGGER on_public_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_progress();

-- Also create usage_stats record
CREATE OR REPLACE FUNCTION handle_new_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usage_stats (user_id, reset_date)
  VALUES (NEW.id, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create usage_stats when public.users is created
DROP TRIGGER IF EXISTS on_public_user_stats_created ON public.users;
CREATE TRIGGER on_public_user_stats_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_stats();

-- Function to sync existing auth.users to public.users (run once to fix existing users)
CREATE OR REPLACE FUNCTION sync_existing_users()
RETURNS void AS $$
BEGIN
  -- Insert missing users from auth.users to public.users
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
    au.created_at,
    au.updated_at
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;

  -- Insert missing user_progress records
  INSERT INTO public.user_progress (user_id)
  SELECT pu.id
  FROM public.users pu
  LEFT JOIN public.user_progress up ON pu.id = up.user_id
  WHERE up.user_id IS NULL;

  -- Insert missing usage_stats records
  INSERT INTO public.usage_stats (user_id, reset_date)
  SELECT pu.id, NOW()
  FROM public.users pu
  LEFT JOIN public.usage_stats us ON pu.id = us.user_id
  WHERE us.user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function to fix existing users
SELECT sync_existing_users();
