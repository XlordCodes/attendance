import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Coffee } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getScheduleForEmployee } from '../../constants/workingHours';
import type { RoleSchedule } from '../../types';

const WorkingHoursInfo: React.FC = () => {
  const { employee } = useAuth();
  const [schedule, setSchedule] = useState<RoleSchedule | null>(null);

  useEffect(() => {
    if (!employee?.id) return;

    let cancelled = false;

    const loadSchedule = async () => {
      const sched = await getScheduleForEmployee(employee.id);
      if (cancelled) return;
      if (sched) {
        setSchedule(sched);
      } else {
        setSchedule({
          role: 'employee',
          start_hour: 10,
          start_minute: 0,
          end_hour: 20,
          end_minute: 0,
          standard_work_hours: 10,
          lunch_start_hour: 14,
          lunch_start_minute: 0,
          lunch_end_hour: 15,
          lunch_end_minute: 0,
          overtime_threshold: 10
        });
      }
    };

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [employee?.id]);

  if (!schedule) {
    return (
      <div className="bg-[#EEF4F8] dark:bg-slate-800 border border-[#96C2DB]/40 dark:border-slate-700 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <Clock className="h-5 w-5 text-[#96C2DB] mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200">Working Hours</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading schedule...</p>
      </div>
    );
  }

  const formatTime12h = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
      <div className="bg-[#EEF4F8] dark:bg-slate-800 border border-[#96C2DB]/40 dark:border-slate-700 rounded-lg p-4 mb-6">
      <div className="flex items-center mb-3">
        <Clock className="h-5 w-5 text-[#96C2DB] mr-2" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200">Your Working Hours</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center">
          <Calendar className="h-4 w-4 text-[#96C2DB] mr-2" />
          <div>
            <div className="font-medium text-gray-900 dark:text-slate-200">Working Hours</div>
            <div className="text-gray-500 dark:text-gray-400">
              {formatTime12h(schedule.start_hour, schedule.start_minute)} - {formatTime12h(schedule.end_hour, schedule.end_minute)}
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <Coffee className="h-4 w-4 text-[#96C2DB] mr-2" />
          <div>
            <div className="font-medium text-gray-900 dark:text-slate-200">Lunch Break</div>
            <div className="text-gray-500 dark:text-gray-400">
              {formatTime12h(schedule.lunch_start_hour, schedule.lunch_start_minute)} - {formatTime12h(schedule.lunch_end_hour, schedule.lunch_end_minute)}
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <Clock className="h-4 w-4 text-[#96C2DB] mr-2" />
          <div>
            <div className="font-medium text-gray-900 dark:text-slate-200">Daily Target</div>
            <div className="text-gray-500 dark:text-gray-400">{schedule.standard_work_hours} hours</div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        <strong>Note:</strong> Attendance after {formatTime12h(schedule.start_hour, schedule.start_minute)} will be marked as late.
        Overtime is calculated for hours worked beyond {schedule.standard_work_hours} hours.
      </div>
    </div>
  );
};

export default WorkingHoursInfo;

