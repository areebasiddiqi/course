'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users,
  Send,
  ArrowLeft,
  Crown,
  Shield,
  User,
  Settings,
  UserPlus,
  MessageSquare,
  Calendar,
  Globe,
  Lock,
  MoreVertical,
  Edit,
  Trash2,
  Reply
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

interface Message {
  id: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'voice'
  file_url?: string
  reply_to?: string
  edited: boolean
  created_at: string
  updated_at: string
  sender: {
    full_name?: string
    avatar_url?: string
  }
  reply_message?: {
    content: string
    sender: {
      full_name?: string
    }
  }
}

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [group, setGroup] = useState<StudyGroup | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'member' | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (params.id && user) {
      fetchGroupData()
    }
  }, [params.id, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          users!messages_sender_id_fkey(full_name, avatar_url),
          reply_message:messages!messages_reply_to_fkey(
            content,
            users!messages_sender_id_fkey(full_name)
          )
        `)
        .eq('group_id', params.id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
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

      const transformedMessages: Message[] = messagesData?.map(message => ({
        id: message.id,
        sender_id: message.sender_id,
        content: message.content,
        message_type: message.message_type,
        file_url: message.file_url,
        reply_to: message.reply_to,
        edited: message.edited,
        created_at: message.created_at,
        updated_at: message.updated_at,
        sender: message.users,
        reply_message: message.reply_message ? {
          content: message.reply_message.content,
          sender: message.reply_message.users
        } : undefined
      })) || []

      setGroup(transformedGroup)
      setMembers(transformedMembers)
      setMessages(transformedMessages)
      setUserRole(membershipData.role)
    } catch (error) {
      console.error('Error fetching group data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || sendingMessage) return

    setSendingMessage(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: params.id,
          sender_id: user.id,
          content: newMessage.trim(),
          message_type: 'text'
        })

      if (error) {
        console.error('Error sending message:', error)
        return
      }

      setNewMessage('')
      // Refresh messages
      fetchGroupData()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Group Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={message.sender.avatar_url} />
                        <AvatarFallback>
                          {message.sender.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {message.sender.full_name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(new Date(message.created_at))}
                          </span>
                          {message.edited && (
                            <span className="text-xs text-gray-400">(edited)</span>
                          )}
                        </div>
                        {message.reply_message && (
                          <div className="bg-gray-100 border-l-2 border-gray-300 pl-3 py-1 mb-2 text-sm">
                            <div className="text-gray-600">
                              Replying to {message.reply_message.sender.full_name}
                            </div>
                            <div className="text-gray-800 truncate">
                              {message.reply_message.content}
                            </div>
                          </div>
                        )}
                        <div className="text-sm text-gray-900 break-words">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t p-4">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sendingMessage}
                    />
                    <Button type="submit" disabled={!newMessage.trim() || sendingMessage}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>

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
