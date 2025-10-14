'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  BookOpen,
  Brain,
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  Calendar as CalendarDays,
  Filter,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'

interface Event {
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
  creator?: {
    full_name?: string
    avatar_url?: string
  }
  is_attending?: boolean
}

interface StudySession {
  id: string
  course_id?: string
  duration: number
  start_time: string
  end_time?: string
  activity_type: string
  notes?: string
  course?: {
    name: string
    subject: string
  }
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: Event[]
  studySessions: StudySession[]
}

export default function CalendarPage() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [studySessions, setStudySessions] = useState<StudySession[]>([])
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'events' | 'sessions'>('all')
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (user) {
      fetchCalendarData()
    }
  }, [user, currentDate])

  useEffect(() => {
    generateCalendarDays()
  }, [currentDate, events, studySessions])

  const fetchCalendarData = async () => {
    if (!user) return

    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      // Fetch events for the current month
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          users!events_created_by_fkey(full_name, avatar_url)
        `)
        .gte('start_date', startOfMonth.toISOString())
        .lte('start_date', endOfMonth.toISOString())
        .order('start_date', { ascending: true })

      if (eventsError) {
        console.error('Error fetching events:', eventsError)
      }

      // Fetch study sessions for the current month
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select(`
          *,
          courses(name, subject)
        `)
        .eq('user_id', user.id)
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .order('start_time', { ascending: true })

      if (sessionsError) {
        console.error('Error fetching study sessions:', sessionsError)
      }

      // Transform events data
      const transformedEvents: Event[] = eventsData?.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        event_type: event.event_type,
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location,
        is_virtual: event.is_virtual,
        capacity: event.capacity,
        registration_required: event.registration_required,
        created_by: event.created_by,
        created_at: event.created_at,
        attendee_count: event.attendee_count,
        creator: event.users,
        is_attending: false // Would need event_attendees table to check
      })) || []

      // Transform study sessions data
      const transformedSessions: StudySession[] = sessionsData?.map(session => ({
        id: session.id,
        course_id: session.course_id,
        duration: session.duration,
        start_time: session.start_time,
        end_time: session.end_time,
        activity_type: session.activity_type,
        notes: session.notes,
        course: session.courses
      })) || []

      setEvents(transformedEvents)
      setStudySessions(transformedSessions)
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDayOfMonth.getDay()
    
    const days: CalendarDay[] = []
    
    // Add days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isToday(date),
        events: [],
        studySessions: []
      })
    }
    
    // Add days from current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day)
      const dayEvents = events.filter(event => 
        isSameDay(new Date(event.start_date), date)
      )
      const daySessions = studySessions.filter(session => 
        isSameDay(new Date(session.start_time), date)
      )
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isToday(date),
        events: dayEvents,
        studySessions: daySessions
      })
    }
    
    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isToday(date),
        events: [],
        studySessions: []
      })
    }
    
    setCalendarDays(days)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'study_session': return 'bg-blue-100 text-blue-800'
      case 'workshop': return 'bg-green-100 text-green-800'
      case 'webinar': return 'bg-purple-100 text-purple-800'
      case 'hackathon': return 'bg-orange-100 text-orange-800'
      case 'networking': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'study_session': return <BookOpen className="w-3 h-3" />
      case 'workshop': return <Brain className="w-3 h-3" />
      case 'webinar': return <Users className="w-3 h-3" />
      case 'hackathon': return <Zap className="w-3 h-3" />
      case 'networking': return <Users className="w-3 h-3" />
      default: return <CalendarIcon className="w-3 h-3" />
    }
  }

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'reading': return 'bg-blue-50 border-blue-200'
      case 'practice': return 'bg-green-50 border-green-200'
      case 'review': return 'bg-yellow-50 border-yellow-200'
      case 'assessment': return 'bg-red-50 border-red-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const selectedDayData = selectedDate ? calendarDays.find(day => 
    isSameDay(day.date, selectedDate)
  ) : null

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="text-gray-600 mt-2">Manage your study schedule and events</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {dayNames.map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {calendarDays.map((day, index) => {
                    const hasEvents = day.events.length > 0 || day.studySessions.length > 0
                    const filteredEvents = selectedFilter === 'sessions' ? [] : day.events
                    const filteredSessions = selectedFilter === 'events' ? [] : day.studySessions
                    
                    return (
                      <div
                        key={index}
                        className={`
                          min-h-[100px] p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
                          ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                          ${day.isToday ? 'bg-blue-50 border-blue-300' : ''}
                          ${selectedDate && isSameDay(day.date, selectedDate) ? 'ring-2 ring-blue-500' : ''}
                        `}
                        onClick={() => setSelectedDate(day.date)}
                      >
                        <div className={`text-sm font-medium mb-1 ${day.isToday ? 'text-blue-600' : ''}`}>
                          {day.date.getDate()}
                        </div>
                        
                        {/* Events */}
                        <div className="space-y-1">
                          {filteredEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className={`text-xs px-1 py-0.5 rounded truncate ${getEventTypeColor(event.event_type)}`}
                            >
                              {event.title}
                            </div>
                          ))}
                          
                          {/* Study Sessions */}
                          {filteredSessions.slice(0, 2 - filteredEvents.length).map(session => (
                            <div
                              key={session.id}
                              className={`text-xs px-1 py-0.5 rounded border truncate ${getActivityTypeColor(session.activity_type)}`}
                            >
                              {session.course?.name || session.activity_type}
                            </div>
                          ))}
                          
                          {/* More indicator */}
                          {(filteredEvents.length + filteredSessions.length) > 2 && (
                            <div className="text-xs text-gray-500 px-1">
                              +{(filteredEvents.length + filteredSessions.length) - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">This Month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Events</span>
                  <span className="font-medium">{events.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Study Sessions</span>
                  <span className="font-medium">{studySessions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Hours</span>
                  <span className="font-medium">
                    {Math.floor(studySessions.reduce((acc, s) => acc + s.duration, 0) / 60)}h
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Selected Day Details */}
            {selectedDayData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedDate?.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Events for selected day */}
                  {selectedDayData.events.map(event => (
                    <div key={event.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <Badge className={getEventTypeColor(event.event_type)}>
                          {getEventTypeIcon(event.event_type)}
                          <span className="ml-1 capitalize">{event.event_type.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(event.start_date).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{event.attendee_count} attending</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Study sessions for selected day */}
                  {selectedDayData.studySessions.map(session => (
                    <div key={session.id} className={`border rounded-lg p-3 ${getActivityTypeColor(session.activity_type)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">
                          {session.course?.name || 'Study Session'}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {session.activity_type}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{session.duration} minutes</span>
                        </div>
                        {session.course?.subject && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>{session.course.subject}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {selectedDayData.events.length === 0 && selectedDayData.studySessions.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No events or sessions scheduled</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.slice(0, 3).map(event => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.event_type).split(' ')[0]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(new Date(event.start_date))}
                      </p>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    No upcoming events
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
