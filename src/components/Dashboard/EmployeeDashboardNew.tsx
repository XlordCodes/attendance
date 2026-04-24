import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { globalAttendanceService } from '../../services/globalAttendanceService';
import { meetingService } from '../../services/meetingService';
import { Meeting, AttendanceRecord } from '../../types';
import { format } from 'date-fns';
import { getOfficeNow, formatOffice } from '../../utils/timezoneUtils';
import { zonedTimeToUtc } from 'date-fns-tz';
import { OFFICE_TIMEZONE } from '../../utils/timezoneUtils';
import ClockInOutNew from '../Employee/ClockInOutNew';
import WorkingHoursInfo from '../common/WorkingHoursInfo';
import { formatDuration } from '../../utils/formatDuration';

const EmployeeDashboardNew: React.FC = () => {
  const { employee, user } = useAuth();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

    // ✅ TanStack Query: Today's attendance record
    const { data: todayRecord, isLoading: todayLoading } = useQuery({
      queryKey: ['employeeAttendanceToday', employee?.id],
      queryFn: async () => {
        if (!employee) return null;
        return globalAttendanceService.getTodayAttendance(employee.id);
      },
      enabled: !!employee,
    });

    // ✅ TanStack Query: Weekly attendance statistics
   const { data: weeklyStats, isLoading: weeklyLoading } = useQuery({
     queryKey: ['employeeWeeklyStats', employee?.id],
     queryFn: async () => {
       if (!employee) return { totalHours: 0, daysPresent: 0, averageHours: 0, totalBreaks: 0 };
       
        // Compute week boundaries in office timezone
        const officeNow = getOfficeNow();
        const officeYear = parseInt(formatOffice(officeNow, 'yyyy'), 10);
        const officeMonth = parseInt(formatOffice(officeNow, 'MM'), 10) - 1; // 0-indexed
        const officeDay = parseInt(formatOffice(officeNow, 'dd'), 10);
        const officeDayOfWeek = parseInt(formatOffice(officeNow, 'u'), 10); // 1=Mon, 7=Sun

        const mondayDay = officeDay - (officeDayOfWeek - 1);
        const sundayDay = officeDay + (7 - officeDayOfWeek);

        const weekStart = zonedTimeToUtc(
          {
            year: officeYear,
            month: officeMonth + 1,
            day: mondayDay,
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0
          },
          OFFICE_TIMEZONE
        );

        const weekEnd = zonedTimeToUtc(
          {
            year: officeYear,
            month: officeMonth + 1,
            day: sundayDay,
            hour: 23,
            minute: 59,
            second: 59,
            millisecond: 999
          },
          OFFICE_TIMEZONE
        );
        const weeklyRecords = await globalAttendanceService.getAttendanceRange(
          employee.id,
          weekStart,
          weekEnd
        );

        // 🕵️‍♂️ TRACE: Weekly Records Fetched
        console.log('🕵️‍♂️ TRACE: Weekly Records Fetched:', {
          count: weeklyRecords.length,
          records: weeklyRecords.map(r => ({
            date: r.date,
            hoursWorked: r.hoursWorked,
            totalHours: r.totalHours,
            clockIn: r.clockIn,
            clockOut: r.clockOut
          }))
        });

        const rawTotalHours = weeklyRecords.reduce((sum, record) => sum + (record.hoursWorked || 0), 0);
        // Round to 2 decimal places to preserve micro-shifts
        const totalHours = Math.round(rawTotalHours * 100) / 100;
        const daysPresent = weeklyRecords.filter(record => record.clockIn).length;
        const totalBreaks = weeklyRecords.reduce((sum, record) => sum + record.breaks.length, 0);

        const calculatedStats = {
          totalHours,
          daysPresent,
          averageHours: daysPresent > 0 ? Math.round((rawTotalHours / daysPresent) * 100) / 100 : 0,
          totalBreaks
        };

        // 🕵️‍♂️ TRACE: Calculated Weekly Stats
        console.log('🕵️‍♂️ TRACE: Calculated Weekly Stats:', calculatedStats);

        return calculatedStats;
     },
      enabled: !!employee,
    });

   // ✅ TanStack Query: Upcoming meetings (use employee-specific endpoint)
   const { data: meetings = [], isLoading: meetingsLoading, refetch: refetchMeetings } = useQuery({
     queryKey: ['employeeMeetings', employee?.id],
     queryFn: async () => {
       if (!employee) return [];

       // Fetch meetings assigned to this employee only (server enforces authorization)
       const allMeetings = await meetingService.getMeetingsForEmployee(employee.id);

       // Filter for today and future meetings
       const today = new Date();
       today.setHours(0, 0, 0, 0);

       const upcomingMeetings = allMeetings.filter(meeting => {
         const meetingDate = new Date(meeting.date);
         return !isNaN(meetingDate.getTime()) && meetingDate >= today;
       });

       // Sort by date and take next 5 meetings
       upcomingMeetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
       return upcomingMeetings.slice(0, 5);
     },
     enabled: !!employee,
   });

  // Combined loading state (derived from TanStack Query — no manual useState)
  const loading = todayLoading || weeklyLoading || meetingsLoading;

  // Helper function to get display name from employee data
  const getEmployeeName = useCallback(() => {
    if (!employee) return 'User';
    
    // Safely get employee name with fallbacks
    return employee.name || 
           employee.Name || // Alternative field name
           employee.email?.split('@')[0] || 
           'User';
  }, [employee]);

  // Define a type for Employee with possible fields
  type EmployeeType = {
    id: string;
    name?: string;
    Name?: string;
    email?: string;
    Designation?: string;
    designation?: string;
    position?: string;
    role?: string;
    department?: string;
  };
  
    // Helper function to get employee designation/role
    const getEmployeeDesignation = useCallback(() => {
      if (!employee) return 'Employee';
  
      // Type assertion for employee
      const emp = employee as EmployeeType;
  
      // Safely get employee designation with fallbacks (check both cases)
      const designation = emp.Designation ||
                         emp.designation ||
                         emp.position ||
                         emp.role ||
                         'Employee';
  
      return designation;
    }, [employee]);

  // Clock tick — the only legitimate useEffect in this component
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ────────────────────────────────────────────────────────
  // GHOST CODE DELETED (Defect 9)
  //
  // A massive useEffect block referencing setLoading, setError,
  // loadTodayRecord, loadWeeklyStats, loadMeetings was here.
  // None of those functions existed in scope — they were
  // remnants of the pre-TanStack migration.  The useEffect
  // would throw ReferenceError at runtime.
  //
  // All data fetching is now handled exclusively by the three
  // useQuery hooks above.  Refresh intervals are managed via
  // TanStack Query's refetchInterval option if needed.
  // ────────────────────────────────────────────────────────

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // No employee data
  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No User Data</h2>
          <p className="text-gray-600">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Working Hours Information */}
      <WorkingHoursInfo />

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-sm text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {getEmployeeName()}!
            </h1>
            <p className="text-blue-100">
              {format(currentTime, 'EEEE, MMMM d, yyyy')} • {employee?.role || 'Employee'} • {getEmployeeDesignation()}
            </p>
            <p className="text-blue-100 text-sm mt-1">
              {employee?.department}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats — nullish coalescing guards against undefined weeklyStats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(weeklyStats?.totalHours ?? 0)}</p>
              <p className="text-xs text-gray-500">Total hours worked</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Days Present</p>
              <p className="text-2xl font-bold text-gray-900">{weeklyStats?.daysPresent ?? 0}</p>
              <p className="text-xs text-gray-500">This week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Daily Average</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(weeklyStats?.averageHours ?? 0)}</p>
              <p className="text-xs text-gray-500">Hours per day</p>
            </div>
          </div>
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Clock In/Out Section */}
         <div className="space-y-6">
           <ClockInOutNew onAttendanceChange={() => {
             queryClient.invalidateQueries({ queryKey: ['employeeAttendanceToday', employee?.id] });
             queryClient.invalidateQueries({ queryKey: ['employeeWeeklyStats', employee?.id] });
             queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
           }} />
         </div>

        {/* Today's Status & Upcoming Meetings */}
        <div className="space-y-6">
          {/* Today's Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Status</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  !todayRecord?.clockIn 
                    ? 'text-gray-600 bg-gray-100' 
                    : todayRecord?.isLate 
                      ? 'text-yellow-600 bg-yellow-100'
                      : 'text-green-600 bg-green-100'
                }`}>
                  {!todayRecord?.clockIn 
                    ? 'Not clocked in' 
                    : todayRecord?.isLate 
                      ? 'Late arrival'
                      : 'On time'
                  }
                </span>
              </div>

              {todayRecord?.clockIn && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Clock in time</span>
                    <span className="text-sm font-medium">
                      {format(todayRecord.clockIn, 'HH:mm')}
                    </span>
                  </div>

                  {todayRecord.clockOut && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Clock out time</span>
                      <span className="text-sm font-medium">
                        {format(todayRecord.clockOut, 'HH:mm')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Hours worked</span>
                    <span className="text-sm font-medium">
                      {formatDuration(todayRecord.hoursWorked || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Breaks taken</span>
                    <span className="text-sm font-medium">
                      {todayRecord.breaks.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h3>
              <button 
                onClick={() => refetchMeetings()}
                disabled={meetingsLoading}
                className={`text-sm font-medium flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
                  meetingsLoading 
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                }`}
              >
                {meetingsLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>
            </div>
            
            {meetingsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-500 text-sm">Loading meetings...</p>
              </div>
            ) : meetings.length > 0 ? (
              <div className="space-y-3">
                {meetings.map((meeting) => {
                  const meetingDate = new Date(meeting.date);
                  
                  if (isNaN(meetingDate.getTime())) {
                    return null;
                  }
                  
                  // Create proper date and time for the meeting
                  const [hours, minutes] = meeting.time.split(':').map(Number);
                  const meetingDateTime = new Date(meetingDate);
                  meetingDateTime.setHours(hours, minutes, 0, 0);
                  
                  // Format date and time properly
                  const isToday = format(meetingDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const isTomorrow = format(meetingDate, 'yyyy-MM-dd') === format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
                  
                  let dateDisplay;
                  if (isToday) {
                    dateDisplay = 'Today';
                  } else if (isTomorrow) {
                    dateDisplay = 'Tomorrow';
                  } else {
                    dateDisplay = format(meetingDate, 'MMM d, yyyy');
                  }
                  
                  const timeDisplay = format(meetingDateTime, 'h:mm a');
                  
                  return (
                    <div key={meeting.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50">
                      <h4 className="font-semibold text-gray-900 mb-1">{meeting.title}</h4>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-700">
                          <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="font-medium">{dateDisplay}</span>
                          <span className="mx-2">•</span>
                          <Clock className="h-4 w-4 mr-1 text-blue-600" />
                          <span>{timeDisplay}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          meeting.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                          meeting.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {meeting.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">No upcoming meetings scheduled</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardNew;
