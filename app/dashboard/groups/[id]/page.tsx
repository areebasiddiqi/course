'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users,
  ArrowLeft,
  Crown,
  Shield,
  User,
  Settings,
  UserPlus,
  Calendar,
  Globe,
  Lock,
  MoreVertical
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface StudyGroup {
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
  creator?: {
    full_name?: string
    avatar_url?: string
  }
}

interface GroupMember {
  id: string
  user_id: string
  role: 'admin' | 'moderator' | 'member'
  joined_at: string
  user: {
    full_name?: string
    avatar_url?: string
    email: string
  }
}

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [group, setGroup] = useState<StudyGroup | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'member' | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (params.id && user) {
      fetchGroupData()
    }
  }, [params.id, user])

  const fetchGroupData = async () => {
    if (!user) return

    try {
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .select(`
          *,
          users!study_groups_created_by_fkey(full_name, avatar_url)
        `)
        .eq('id', params.id)
        .single()

      if (groupError) {
        console.error('Error fetching group:', groupError)
        return
      }

      // Check if user is a member
      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', params.id)
        .eq('user_id', user.id)
        .single()

      if (membershipError && membershipError.code !== 'PGRST116') {
        console.error('Error checking membership:', membershipError)
        return
      }

      if (!membershipData) {
        // User is not a member, redirect or show join option
        router.push('/dashboard/groups')
        return
      }

      // Fetch group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(`
          *,
          users(full_name, avatar_url, email)
        `)
        .eq('group_id', params.id)
        .order('joined_at', { ascending: true })

      if (membersError) {
        console.error('Error fetching members:', membersError)
      }

      // Transform data
      const transformedGroup: StudyGroup = {
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        subject: groupData.subject,
        university: groupData.university,
        is_public: groupData.is_public,
        member_limit: groupData.member_limit,
        created_by: groupData.created_by,
        created_at: groupData.created_at,
        member_count: groupData.member_count,
        creator: groupData.users
      }

      const transformedMembers: GroupMember[] = membersData?.map(member => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        user: member.users
      })) || []

      setGroup(transformedGroup)
      setMembers(transformedMembers)
      setUserRole(membershipData.role)
    } catch (error) {
      console.error('Error fetching group data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-yellow-600" />
      case 'moderator': return <Shield className="w-4 h-4 text-blue-600" />
      default: return <User className="w-4 h-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-yellow-100 text-yellow-800'
      case 'moderator': return 'bg-blue-100 text-blue-800'
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

  if (!group) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Group not found</h1>
          <Link href="/dashboard/groups">
            <Button>Back to Groups</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/groups">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Groups
            </Button>
          </Link>
        </div>

        {/* Group Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">{group.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {group.is_public ? (
                      <Globe className="w-5 h-5 text-green-600" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-600" />
                    )}
                    {userRole && (
                      <Badge className={getRoleColor(userRole)}>
                        {getRoleIcon(userRole)}
                        <span className="ml-1 capitalize">{userRole}</span>
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {group.description || 'No description available'}
                </CardDescription>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{group.member_count} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Created {formatDate(new Date(group.created_at))}</span>
                  </div>
                  {group.subject && (
                    <Badge variant="outline">{group.subject}</Badge>
                  )}
                </div>
              </div>
              {(userRole === 'admin' || userRole === 'moderator') && (
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          {/* Members Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Members ({members.length})</span>
                  {(userRole === 'admin' || userRole === 'moderator') && (
                    <Button variant="outline" size="sm">
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.user.avatar_url} />
                      <AvatarFallback>
                        {member.user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {member.user.full_name || 'Unknown User'}
                      </div>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        <span className="text-xs text-gray-500 capitalize">
                          {member.role}
                        </span>
                      </div>
                    </div>
                    {(userRole === 'admin' || (userRole === 'moderator' && member.role === 'member')) && (
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Group Info */}
            <Card>
              <CardHeader>
                <CardTitle>Group Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Created:</span>
                  <div className="text-gray-600">{formatDate(new Date(group.created_at))}</div>
                </div>
                {group.subject && (
                  <div>
                    <span className="font-medium">Subject:</span>
                    <div className="text-gray-600">{group.subject}</div>
                  </div>
                )}
                {group.university && (
                  <div>
                    <span className="font-medium">University:</span>
                    <div className="text-gray-600">{group.university}</div>
                  </div>
                )}
                <div>
                  <span className="font-medium">Visibility:</span>
                  <div className="text-gray-600">
                    {group.is_public ? 'Public' : 'Private'}
                  </div>
                </div>
                {group.member_limit && (
                  <div>
                    <span className="font-medium">Member Limit:</span>
                    <div className="text-gray-600">{group.member_limit}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
