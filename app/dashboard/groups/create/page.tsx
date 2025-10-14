'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Globe, 
  Lock, 
  BookOpen, 
  GraduationCap,
  Save,
  ArrowLeft,
  UserPlus,
  Settings,
  Eye,
  EyeOff,
  Lightbulb
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'

interface GroupData {
  name: string
  description: string
  subject: string
  university: string
  is_public: boolean
  member_limit: number
  tags: string[]
}

export default function CreateGroupPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseClient()

  const [groupData, setGroupData] = useState<GroupData>({
    name: '',
    description: '',
    subject: '',
    university: '',
    is_public: true,
    member_limit: 50,
    tags: []
  })

  const [newTag, setNewTag] = useState('')

  // Demo group generator
  const generateDemoGroup = () => {
    const demoGroups = [
      {
        name: 'React Developers Study Circle',
        description: 'A collaborative space for React developers to share knowledge, discuss best practices, and work on projects together. We focus on modern React patterns, hooks, and state management.',
        subject: 'Computer Science',
        university: 'Tech University',
        is_public: true,
        member_limit: 30,
        tags: ['React', 'JavaScript', 'Frontend', 'Web Development']
      },
      {
        name: 'Data Science & ML Enthusiasts',
        description: 'Join us to explore the fascinating world of data science and machine learning. We share resources, discuss algorithms, and collaborate on real-world projects.',
        subject: 'Data Science',
        university: 'Data Institute',
        is_public: true,
        member_limit: 25,
        tags: ['Machine Learning', 'Python', 'Statistics', 'AI']
      },
      {
        name: 'Physics Problem Solvers',
        description: 'A study group dedicated to tackling challenging physics problems together. From quantum mechanics to thermodynamics, we help each other understand complex concepts.',
        subject: 'Physics',
        university: 'Science College',
        is_public: false,
        member_limit: 15,
        tags: ['Physics', 'Mathematics', 'Problem Solving', 'Theory']
      }
    ]

    const randomGroup = demoGroups[Math.floor(Math.random() * demoGroups.length)]
    setGroupData(randomGroup)

    toast({
      title: 'Demo Group Generated!',
      description: `Created "${randomGroup.name}" with sample data.`
    })
  }

  const addTag = () => {
    if (newTag.trim() && !groupData.tags.includes(newTag.trim())) {
      setGroupData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setGroupData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleCreateGroup = async () => {
    if (!groupData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a group name.',
        variant: 'destructive'
      })
      return
    }

    if (!groupData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a group description.',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      // Create the study group
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          name: groupData.name,
          description: groupData.description,
          subject: groupData.subject || null,
          university: groupData.university || null,
          is_public: groupData.is_public,
          member_limit: groupData.member_limit,
          tags: groupData.tags,
          created_by: user?.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user?.id,
          role: 'admin',
          joined_at: new Date().toISOString()
        })

      if (memberError) throw memberError

      toast({
        title: 'Group Created Successfully!',
        description: `"${groupData.name}" has been created and you are now the admin.`
      })

      // Redirect to the new group
      router.push(`/dashboard/groups/${group.id}`)
    } catch (error) {
      console.error('Error creating group:', error)
      toast({
        title: 'Error',
        description: 'Failed to create group. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const subjects = [
    'Computer Science',
    'Data Science',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Engineering',
    'Business',
    'Economics',
    'Psychology',
    'Literature',
    'History',
    'Art & Design',
    'Music',
    'Other'
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/groups">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Groups
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold">Create Study Group</h1>
            <p className="text-gray-600 mt-2">Build a community of learners around your interests</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button 
              variant="outline" 
              onClick={generateDemoGroup}
              className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Generate Demo Group
            </Button>
            <Button onClick={handleCreateGroup} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>

        {/* Preview Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    {groupData.name ? groupData.name.charAt(0).toUpperCase() : 'G'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {groupData.name || 'Your Group Name'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {groupData.is_public ? (
                        <>
                          <Globe className="w-4 h-4" />
                          <span>Public Group</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Private Group</span>
                        </>
                      )}
                      <span>•</span>
                      <UserPlus className="w-4 h-4" />
                      <span>Max {groupData.member_limit} members</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 mb-3">
                  {groupData.description || 'Your group description will appear here...'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Set up the fundamental details of your study group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., React Developers Study Circle"
                  value={groupData.name}
                  onChange={(e) => setGroupData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what your group is about, what you'll study together, and what members can expect..."
                  value={groupData.description}
                  onChange={(e) => setGroupData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select 
                  value={groupData.subject} 
                  onValueChange={(value) => setGroupData(prev => ({ ...prev, subject: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="university">University/Institution</Label>
                <Input
                  id="university"
                  placeholder="e.g., MIT, Stanford University"
                  value={groupData.university}
                  onChange={(e) => setGroupData(prev => ({ ...prev, university: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings & Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Group Settings
              </CardTitle>
              <CardDescription>
                Configure privacy and membership settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Group Visibility</Label>
                  <p className="text-sm text-gray-600">
                    {groupData.is_public 
                      ? 'Anyone can find and join this group' 
                      : 'Only invited members can join this group'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {groupData.is_public ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-600" />
                  )}
                  <Switch
                    checked={groupData.is_public}
                    onCheckedChange={(checked) => 
                      setGroupData(prev => ({ ...prev, is_public: checked }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="memberLimit">Member Limit</Label>
                <Input
                  id="memberLimit"
                  type="number"
                  min="2"
                  max="500"
                  value={groupData.member_limit}
                  onChange={(e) => setGroupData(prev => ({ 
                    ...prev, 
                    member_limit: parseInt(e.target.value) || 50 
                  }))}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Maximum number of members (2-500)
                </p>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupData.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-red-100"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Tags help others discover your group. Click to remove.
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Group Features</h4>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Discussion forums and messaging</li>
                      <li>• Shared study materials and resources</li>
                      <li>• Event scheduling and reminders</li>
                      <li>• Progress tracking and achievements</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Group Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium mb-2">✅ Best Practices</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Choose a clear, descriptive name</li>
                  <li>• Write a detailed description</li>
                  <li>• Set appropriate member limits</li>
                  <li>• Use relevant tags for discoverability</li>
                  <li>• Foster inclusive discussions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">🚫 Avoid</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Vague or misleading names</li>
                  <li>• Empty or minimal descriptions</li>
                  <li>• Inappropriate content or language</li>
                  <li>• Spam or promotional material</li>
                  <li>• Discrimination or harassment</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
