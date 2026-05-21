import { useState, useEffect, useCallback, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Calendar, TrendingUp, CalendarPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { globalAttendanceService } from '../../services/globalAttendanceService';
import { meetingService } from '../../services/meetingService';

import { format } from 'date-fns';
import { getOfficeNow, formatOffice } from '../../utils/timezoneUtils';
import { zonedTimeToUtc } from 'date-fns-tz';
import { OFFICE_TIMEZONE } from '../../utils/timezoneUtils';
import ClockInOutNew from '../Employee/ClockInOutNew';
import WorkingHoursInfo from '../common/WorkingHoursInfo';
import { formatDuration } from '../../utils/formatDuration';
import LeaveRequestModal from '../common/LeaveRequestModal';

const LiveClock = memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <span>{format(currentTime, 'EEEE, MMMM d, yyyy')}</span>;
});
LiveClock.displayName = 'LiveClock';

const EmployeeDashboardNew: React.FC = () => {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

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

      const weekStartString = `${officeYear}-${String(officeMonth + 1).padStart(2, '0')}-${String(mondayDay).padStart(2, '0')} 00:00:00`;
      const weekStart = zonedTimeToUtc(weekStartString, OFFICE_TIMEZONE);

      const weekEndString = `${officeYear}-${String(officeMonth + 1).padStart(2, '0')}-${String(sundayDay).padStart(2, '0')} 23:59:59.999`;
      const weekEnd = zonedTimeToUtc(weekEndString, OFFICE_TIMEZONE);
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

      const rawTotalHours = weeklyRecords.reduce((sum, record) => {
        // Guard against null/string DB values and the upstream worked_hours=0 bug:
        // Prefer the stored value when it looks valid (>0); otherwise fall back
        // to clockOut - clockIn (both already Date objects from convertDbToAttendance)
        const rawVal = record.hoursWorked;
        const stored = (rawVal != null && rawVal !== 0 && typeof rawVal !== 'string') ? Number(rawVal)
          : (typeof rawVal === 'string' && rawVal !== '' && !Number.isNaN(Number(rawVal)))
            ? Number(rawVal) : null;
        let hours: number;
        if (stored !== null && !Number.isNaN(stored)) {
          hours = stored;
        } else if (record.clockIn && record.clockOut) {
          const ms = record.clockOut.getTime() - record.clockIn.getTime();
          hours = ms > 0 ? ms / (1000 * 60 * 60) : 0;
        } else {
          hours = 0;
        }
        return sum + hours;
      }, 0);
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
          <p className="mt-4 text-gray-600 dark:text-neutral-400">Loading dashboard...</p>
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No User Data</h2>
          <p className="text-gray-600 dark:text-neutral-400">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Working Hours Information */}
      <WorkingHoursInfo />

      {/* Request Leave Button */}
      <button
        onClick={() => setIsLeaveModalOpen(true)}
        className="w-full flex items-center px-4 py-3 text-sm text-blue-700 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-neutral-800 rounded-lg border border-blue-200 dark:border-neutral-700 font-medium transition-colors"
      >
        <CalendarPlus className="h-4 w-4 mr-3" />
        Request Leave
      </button>

      {/* Welcome Header */}
      <div className="bg-[#1C2B3A] text-white rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-white font-semibold text-xl mb-2">
              Welcome back, {getEmployeeName()}!
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-gray-400 text-sm">
              <span className="text-white"><LiveClock /></span>
              <span>•</span>
              <span className="bg-white/10 text-white rounded-xl px-3 py-1 text-sm">{employee?.role || 'Employee'}</span>
              <span>•</span>
              <span className="bg-white/10 text-white rounded-xl px-3 py-1 text-sm">{getEmployeeDesignation()}</span>
              {employee?.department && (
                <>
                  <span>•</span>
                  <span className="bg-white/10 text-white rounded-xl px-3 py-1 text-sm">{employee.department}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats — nullish coalescing guards against undefined weeklyStats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5">
          <div className="flex items-center">
            <div className="bg-canvas dark:bg-neutral-800 p-2 rounded-xl">
              <Clock className="h-6 w-6 text-gray-700 dark:text-brand" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-neutral-400 dark:text-neutral-300">This Week</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(weeklyStats?.totalHours ?? 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5">
          <div className="flex items-center">
            <div className="bg-canvas dark:bg-neutral-800 p-2 rounded-xl">
              <Calendar className="h-6 w-6 text-gray-700 dark:text-brand" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-neutral-400 dark:text-neutral-300">Days Present</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{weeklyStats?.daysPresent ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5">
          <div className="flex items-center">
            <div className="bg-canvas dark:bg-neutral-800 p-2 rounded-xl">
              <TrendingUp className="h-6 w-6 text-gray-700 dark:text-brand" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-neutral-400 dark:text-neutral-300">Daily Average</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(weeklyStats?.averageHours ?? 0)}</p>
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
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Status</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-neutral-400">Status</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${!todayRecord?.clockIn
                  ? 'text-gray-600 dark:text-neutral-400 bg-gray-100'
                  : todayRecord?.isLate
                    ? 'text-yellow-600 bg-yellow-50'
                    : 'text-green-600 bg-green-50'
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
                    <span className="text-sm text-gray-600 dark:text-neutral-400">Clock in time</span>
                    <span className="text-sm font-medium">
                      {format(todayRecord.clockIn, 'HH:mm')}
                    </span>
                  </div>

                  {todayRecord.clockOut && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-neutral-400">Clock out time</span>
                      <span className="text-sm font-medium">
                        {format(todayRecord.clockOut, 'HH:mm')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-neutral-400">Hours worked</span>
                    <span className="text-sm font-medium">
                      {formatDuration(todayRecord.hoursWorked || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-neutral-400">Breaks taken</span>
                    <span className="text-sm font-medium">
                      {todayRecord.breaks.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Meetings</h3>
              <button
                onClick={() => refetchMeetings()}
                disabled={meetingsLoading}
                className={`text-sm font-medium flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${meetingsLoading
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-brand hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-800'
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
                <p className="text-gray-500 dark:text-neutral-400 text-sm">Loading meetings...</p>
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
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{meeting.title}</h4>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-700">
                          <Calendar className="h-4 w-4 mr-2 text-brand" />
                          <span className="font-medium">{dateDisplay}</span>
                          <span className="mx-2">•</span>
                          <Clock className="h-4 w-4 mr-1 text-brand" />
                          <span>{timeDisplay}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${meeting.status === 'scheduled' ? 'bg-emerald-50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 rounded-full' :
                          meeting.status === 'completed' ? 'bg-brand/10 text-gray-700 dark:text-white border border-brand/30 rounded-full' :
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
                <p className="text-gray-500 dark:text-neutral-400 text-sm">No upcoming meetings scheduled</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <LeaveRequestModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
      />
    </div>
  );
};

export default EmployeeDashboardNew;
