-- EMERGENCY FIX: Sync existing auth.users to public.users
-- Run this in your Supabase SQL Editor to fix the foreign key constraint error

-- Step 1: Insert missing users from auth.users to public.users
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

-- Step 2: Insert missing user_progress records
INSERT INTO public.user_progress (user_id)
SELECT pu.id
FROM public.users pu
LEFT JOIN public.user_progress up ON pu.id = up.user_id
WHERE up.user_id IS NULL;

-- Step 3: Insert missing usage_stats records
INSERT INTO public.usage_stats (user_id, reset_date)
SELECT pu.id, NOW()
FROM public.users pu
LEFT JOIN public.usage_stats us ON pu.id = us.user_id
WHERE us.user_id IS NULL;

-- Step 4: Create the trigger functions (if not already created)
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

-- Step 5: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 6: Create user_progress trigger function
CREATE OR REPLACE FUNCTION handle_new_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create user_progress trigger
DROP TRIGGER IF EXISTS on_public_user_created ON public.users;
CREATE TRIGGER on_public_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_progress();

-- Step 8: Create usage_stats trigger function
CREATE OR REPLACE FUNCTION handle_new_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usage_stats (user_id, reset_date)
  VALUES (NEW.id, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create usage_stats trigger
DROP TRIGGER IF EXISTS on_public_user_stats_created ON public.users;
CREATE TRIGGER on_public_user_stats_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_stats();
