'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Bell,
  Shield,
  Eye,
  Camera,
  Save,
  Trash2,
  Settings,
  Award,
  BookOpen,
  Clock
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'

interface ProfileData {
  fullName: string
  email: string
  phone: string
  bio: string
  location: string
  website: string
  avatar: string
  joinedAt: Date
}

interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  courseUpdates: boolean
  marketingEmails: boolean
  weeklyDigest: boolean
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends'
  showEmail: boolean
  showProgress: boolean
  showCertificates: boolean
}

export default function ProfilePage() {
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    website: '',
    avatar: '',
    joinedAt: new Date()
  })
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    courseUpdates: true,
    marketingEmails: false,
    weeklyDigest: true
  })
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showEmail: false,
    showProgress: true,
    showCertificates: true
  })
  const [stats, setStats] = useState({
    coursesCompleted: 0,
    totalHours: 0,
    certificates: 0,
    currentStreak: 0
  })
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (user) {
      loadProfileData()
    }
  }, [user])

  const loadProfileData = async () => {
    try {
      // Fetch real user profile data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      // Fetch user stats
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', user?.id)

      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', user?.id)

      const { data: progress } = await supabase
        .from('user_progress')
        .select('current_streak')
        .eq('user_id', user?.id)
        .single()

      const totalHours = sessions?.reduce((acc, session) => acc + Math.floor(session.duration / 60), 0) || 0

      setProfileData({
        fullName: profile?.full_name || user?.user_metadata?.full_name || '',
        email: user?.email || '',
        phone: profile?.phone || '',
        bio: profile?.bio || '',
        location: profile?.location || '',
        website: profile?.website || '',
        avatar: profile?.avatar_url || user?.user_metadata?.avatar_url || '',
        joinedAt: new Date(user?.created_at || Date.now())
      })

      setStats({
        coursesCompleted: courses?.length || 0,
        totalHours,
        certificates: 0, // Would need certificates table
        currentStreak: progress?.current_streak || 0
      })

      // Load notification preferences
      const { data: notifSettings } = await supabase
        .from('user_settings')
        .select('notification_settings')
        .eq('user_id', user?.id)
        .single()

      if (notifSettings?.notification_settings) {
        setNotifications(notifSettings.notification_settings)
      }

      // Load privacy settings
      const { data: privacySettings } = await supabase
        .from('user_settings')
        .select('privacy_settings')
        .eq('user_id', user?.id)
        .single()

      if (privacySettings?.privacy_settings) {
        setPrivacy(privacySettings.privacy_settings)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      // Fallback to basic user data
      setProfileData({
        fullName: user?.user_metadata?.full_name || '',
        email: user?.email || '',
        phone: '',
        bio: '',
        location: '',
        website: '',
        avatar: user?.user_metadata?.avatar_url || '',
        joinedAt: new Date(user?.created_at || Date.now())
      })
    }
  }

  const handleProfileUpdate = async () => {
    setLoading(true)
    try {
      // Update user profile in database
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user?.id,
          full_name: profileData.fullName,
          phone: profileData.phone,
          bio: profileData.bio,
          location: profileData.location,
          website: profileData.website,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      // Update auth metadata if needed
      if (profileData.fullName !== user?.user_metadata?.full_name) {
        await supabase.auth.updateUser({
          data: { full_name: profileData.fullName }
        })
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully!'
      })
    } catch (error) {
      console.error('Profile update error:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationUpdate = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          notification_settings: notifications,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Notification settings updated!'
      })
    } catch (error) {
      console.error('Notification update error:', error)
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePrivacyUpdate = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          privacy_settings: privacy,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Privacy settings updated!'
      })
    } catch (error) {
      console.error('Privacy update error:', error)
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user?.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })

      if (updateError) throw updateError

      // Update local state
      setProfileData(prev => ({ ...prev, avatar: publicUrl }))

      toast({
        title: 'Success',
        description: 'Avatar updated successfully!'
      })
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast({
        title: 'Error',
        description: 'Failed to upload avatar',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmText = 'DELETE'
    const userInput = prompt(`This action cannot be undone. Type "${confirmText}" to confirm account deletion:`)
    
    if (userInput !== confirmText) {
      toast({
        title: 'Cancelled',
        description: 'Account deletion cancelled.'
      })
      return
    }

    try {
      setLoading(true)
      
      // Delete user data from all tables
      await supabase.from('user_profiles').delete().eq('user_id', user?.id)
      await supabase.from('user_settings').delete().eq('user_id', user?.id)
      await supabase.from('user_progress').delete().eq('user_id', user?.id)
      await supabase.from('courses').delete().eq('user_id', user?.id)
      await supabase.from('study_sessions').delete().eq('user_id', user?.id)
      
      // Sign out and delete auth user
      await supabase.auth.signOut()
      
      toast({
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted.'
      })
    } catch (error) {
      console.error('Account deletion error:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete account',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={profileData.avatar} />
                    <AvatarFallback className="text-2xl">
                      {profileData.fullName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <Badge variant="secondary" className="text-sm">
                  Member since {profileData.joinedAt.getFullYear()}
                </Badge>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold">{profileData.fullName}</h1>
                  <p className="text-gray-600 mt-2">{profileData.bio}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="font-bold text-xl">{stats.coursesCompleted}</div>
                    <div className="text-sm text-gray-600">Courses</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="font-bold text-xl">{stats.totalHours}</div>
                    <div className="text-sm text-gray-600">Hours</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Award className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="font-bold text-xl">{stats.certificates}</div>
                    <div className="text-sm text-gray-600">Certificates</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                    <div className="font-bold text-xl">{stats.currentStreak}</div>
                    <div className="text-sm text-gray-600">Day Streak</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profileData.website}
                      onChange={(e) => setProfileData({...profileData, website: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    value={profileData.bio}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <Button onClick={handleProfileUpdate} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Manage how you receive notifications and updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotifications({...notifications, emailNotifications: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Push Notifications</h4>
                      <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => 
                        setNotifications({...notifications, pushNotifications: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Course Updates</h4>
                      <p className="text-sm text-gray-600">Get notified about course updates and new content</p>
                    </div>
                    <Switch
                      checked={notifications.courseUpdates}
                      onCheckedChange={(checked) => 
                        setNotifications({...notifications, courseUpdates: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Marketing Emails</h4>
                      <p className="text-sm text-gray-600">Receive promotional content and offers</p>
                    </div>
                    <Switch
                      checked={notifications.marketingEmails}
                      onCheckedChange={(checked) => 
                        setNotifications({...notifications, marketingEmails: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Weekly Digest</h4>
                      <p className="text-sm text-gray-600">Get a weekly summary of your progress</p>
                    </div>
                    <Switch
                      checked={notifications.weeklyDigest}
                      onCheckedChange={(checked) => 
                        setNotifications({...notifications, weeklyDigest: checked})
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleNotificationUpdate} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control who can see your profile and activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="visibility">Profile Visibility</Label>
                    <select
                      id="visibility"
                      className="w-full mt-1 p-2 border rounded-md"
                      value={privacy.profileVisibility}
                      onChange={(e) => 
                        setPrivacy({...privacy, profileVisibility: e.target.value as any})
                      }
                    >
                      <option value="public">Public - Anyone can see</option>
                      <option value="friends">Friends only</option>
                      <option value="private">Private - Only you</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Show Email Address</h4>
                      <p className="text-sm text-gray-600">Display your email on your public profile</p>
                    </div>
                    <Switch
                      checked={privacy.showEmail}
                      onCheckedChange={(checked) => 
                        setPrivacy({...privacy, showEmail: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Show Learning Progress</h4>
                      <p className="text-sm text-gray-600">Display your course progress and achievements</p>
                    </div>
                    <Switch
                      checked={privacy.showProgress}
                      onCheckedChange={(checked) => 
                        setPrivacy({...privacy, showProgress: checked})
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Show Certificates</h4>
                      <p className="text-sm text-gray-600">Display your earned certificates</p>
                    </div>
                    <Switch
                      checked={privacy.showCertificates}
                      onCheckedChange={(checked) => 
                        setPrivacy({...privacy, showCertificates: checked})
                      }
                    />
                  </div>
                </div>
                <Button onClick={handlePrivacyUpdate} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Account Security
                </CardTitle>
                <CardDescription>
                  Manage your account security and data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={async () => {
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
                          redirectTo: `${window.location.origin}/auth/reset-password`
                        })
                        if (error) throw error
                        toast({
                          title: 'Password Reset Email Sent',
                          description: 'Check your email for password reset instructions.'
                        })
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Failed to send password reset email.',
                          variant: 'destructive'
                        })
                      }
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Reset Password
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={async () => {
                      try {
                        // Export user data as JSON
                        const userData = {
                          profile: profileData,
                          stats,
                          notifications,
                          privacy,
                          exportDate: new Date().toISOString()
                        }
                        
                        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                        
                        toast({
                          title: 'Data Downloaded',
                          description: 'Your data has been downloaded successfully.'
                        })
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Failed to download data.',
                          variant: 'destructive'
                        })
                      }
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Download My Data
                  </Button>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Delete Account</h4>
                    <p className="text-sm text-red-700 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteAccount}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete My Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
