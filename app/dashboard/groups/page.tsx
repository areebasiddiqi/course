'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users,
  Plus,
  Search,
  MessageSquare,
  Crown,
  Shield,
  User,
  Globe,
  Lock,
  Calendar,
  BookOpen,
  TrendingUp,
  Settings,
  UserPlus,
  LogOut
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
  user_role?: 'admin' | 'moderator' | 'member'
  joined_at?: string
}

interface GroupStats {
  totalGroups: number
  myGroups: number
  adminGroups: number
  recentActivity: number
}

export default function GroupsPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<StudyGroup[]>([])
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([])
  const [stats, setStats] = useState<GroupStats>({
    totalGroups: 0,
    myGroups: 0,
    adminGroups: 0,
    recentActivity: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState<'discover' | 'my-groups'>('my-groups')
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (user) {
      fetchGroups()
    }
  }, [user])

  const fetchGroups = async () => {
    if (!user) return

    try {
      // Fetch user's groups
      const { data: userGroups, error: userGroupsError } = await supabase
        .from('group_members')
        .select(`
          *,
          study_groups(
            *,
            users!study_groups_created_by_fkey(full_name, avatar_url)
          )
        `)
        .eq('user_id', user.id)

      if (userGroupsError) {
        console.error('Error fetching user groups:', userGroupsError)
      }

      // Fetch public groups for discovery
      const { data: publicGroups, error: publicGroupsError } = await supabase
        .from('study_groups')
        .select(`
          *,
          users!study_groups_created_by_fkey(full_name, avatar_url)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (publicGroupsError) {
        console.error('Error fetching public groups:', publicGroupsError)
      }

      // Transform user groups
      const transformedMyGroups: StudyGroup[] = userGroups?.map(membership => ({
        id: membership.study_groups.id,
        name: membership.study_groups.name,
        description: membership.study_groups.description,
        subject: membership.study_groups.subject,
        university: membership.study_groups.university,
        is_public: membership.study_groups.is_public,
        member_limit: membership.study_groups.member_limit,
        created_by: membership.study_groups.created_by,
        created_at: membership.study_groups.created_at,
        member_count: membership.study_groups.member_count,
        creator: membership.study_groups.users,
        user_role: membership.role,
        joined_at: membership.joined_at
      })) || []

      // Transform public groups (exclude already joined groups)
      const joinedGroupIds = new Set(transformedMyGroups.map(g => g.id))
      const transformedPublicGroups: StudyGroup[] = publicGroups?.filter(group => 
        !joinedGroupIds.has(group.id)
      ).map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        subject: group.subject,
        university: group.university,
        is_public: group.is_public,
        member_limit: group.member_limit,
        created_by: group.created_by,
        created_at: group.created_at,
        member_count: group.member_count,
        creator: group.users
      })) || []

      setMyGroups(transformedMyGroups)
      setGroups(transformedPublicGroups)

      // Calculate stats
      const adminCount = transformedMyGroups.filter(g => g.user_role === 'admin').length
      
      setStats({
        totalGroups: transformedPublicGroups.length + transformedMyGroups.length,
        myGroups: transformedMyGroups.length,
        adminGroups: adminCount,
        recentActivity: transformedMyGroups.filter(g => 
          new Date().getTime() - new Date(g.joined_at || g.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
        ).length
      })
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        })

      if (error) {
        console.error('Error joining group:', error)
        return
      }

      // Refresh groups
      fetchGroups()
    } catch (error) {
      console.error('Error joining group:', error)
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error leaving group:', error)
        return
      }

      // Refresh groups
      fetchGroups()
    } catch (error) {
      console.error('Error leaving group:', error)
    }
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.university?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredMyGroups = myGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-yellow-600" />
      case 'moderator': return <Shield className="w-4 h-4 text-blue-600" />
      default: return <User className="w-4 h-4 text-gray-600" />
    }
  }

  const getRoleColor = (role?: string) => {
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Study Groups</h1>
            <p className="text-gray-600 mt-2">Connect with fellow learners and study together</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/groups/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Link>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats.myGroups}</div>
              <div className="text-sm text-gray-600">My Groups</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Crown className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold">{stats.adminGroups}</div>
              <div className="text-sm text-gray-600">Admin</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Globe className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{stats.totalGroups}</div>
              <div className="text-sm text-gray-600">Available</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats.recentActivity}</div>
              <div className="text-sm text-gray-600">Recent</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search groups by name, subject, or university..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Groups Tabs */}
        <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
          <TabsList>
            <TabsTrigger value="my-groups">My Groups ({stats.myGroups})</TabsTrigger>
            <TabsTrigger value="discover">Discover Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="my-groups" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">{group.name}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {group.description || 'No description available'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        {group.is_public ? (
                          <Globe className="w-4 h-4 text-green-600" />
                        ) : (
                          <Lock className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getRoleColor(group.user_role)}>
                        {getRoleIcon(group.user_role)}
                        <span className="ml-1 capitalize">{group.user_role}</span>
                      </Badge>
                      {group.subject && (
                        <Badge variant="outline">{group.subject}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{group.member_count} members</span>
                        {group.member_limit && (
                          <span className="text-gray-400">/ {group.member_limit}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {formatDate(new Date(group.joined_at || group.created_at))}</span>
                      </div>
                    </div>

                    {group.creator && (
                      <div className="flex items-center gap-2 text-sm">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={group.creator.avatar_url} />
                          <AvatarFallback>
                            {group.creator.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-gray-600">
                          Created by {group.creator.full_name || 'Unknown'}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link href={`/dashboard/groups/${group.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Open
                        </Button>
                      </Link>
                      {group.user_role === 'admin' ? (
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleLeaveGroup(group.id)}
                        >
                          <LogOut className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredMyGroups.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No groups found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm 
                      ? 'No groups match your search criteria.'
                      : "You haven't joined any study groups yet."
                    }
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => setSelectedTab('discover')}>
                      Discover Groups
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/groups/create">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Group
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="discover" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">{group.name}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {group.description || 'No description available'}
                        </CardDescription>
                      </div>
                      <Globe className="w-4 h-4 text-green-600 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {group.subject && (
                        <Badge variant="outline">{group.subject}</Badge>
                      )}
                      {group.university && (
                        <Badge variant="secondary">{group.university}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{group.member_count} members</span>
                        {group.member_limit && (
                          <span className="text-gray-400">/ {group.member_limit}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(new Date(group.created_at))}</span>
                      </div>
                    </div>

                    {group.creator && (
                      <div className="flex items-center gap-2 text-sm">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={group.creator.avatar_url} />
                          <AvatarFallback>
                            {group.creator.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-gray-600">
                          Created by {group.creator.full_name || 'Unknown'}
                        </span>
                      </div>
                    )}

                    <Button 
                      className="w-full" 
                      onClick={() => handleJoinGroup(group.id)}
                      disabled={group.member_limit ? group.member_count >= group.member_limit : false}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {group.member_limit && group.member_count >= group.member_limit 
                        ? 'Group Full' 
                        : 'Join Group'
                      }
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredGroups.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Globe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No public groups found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm 
                      ? 'No groups match your search criteria.'
                      : 'No public groups are available at the moment.'
                    }
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/groups/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Group
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
