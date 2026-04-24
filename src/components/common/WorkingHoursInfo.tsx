import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Coffee } from 'lucide-react';
import { configService } from '../../services/configService';

const WorkingHoursInfo: React.FC = () => {
  const [hoursConfig, setHoursConfig] = useState<{
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    lunchStartHour: number;
    lunchStartMinute: number;
    lunchEndHour: number;
    lunchEndMinute: number;
    standardWorkHours: number;
  } | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await configService.getWorkingHoursConfig();
      if (config) {
        setHoursConfig({
          startHour: config.start_hour,
          startMinute: config.start_minute,
          endHour: config.end_hour,
          endMinute: config.end_minute,
          lunchStartHour: config.lunch_start_hour,
          lunchStartMinute: config.lunch_start_minute,
          lunchEndHour: config.lunch_end_hour,
          lunchEndMinute: config.lunch_end_minute,
          standardWorkHours: config.standard_work_hours,
        });
      }
    };
    loadConfig();
  }, []);

  if (!hoursConfig) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <Clock className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-blue-900">Office Working Hours</h3>
        </div>
        <p className="text-sm text-blue-700">Loading schedule...</p>
      </div>
    );
  }

  const formatTime12h = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center mb-3">
        <Clock className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-blue-900">Office Working Hours</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center">
          <Calendar className="h-4 w-4 text-blue-600 mr-2" />
          <div>
            <div className="font-medium text-blue-900">Working Hours</div>
            <div className="text-blue-700">
              {formatTime12h(hoursConfig.startHour, hoursConfig.startMinute)} - {formatTime12h(hoursConfig.endHour, hoursConfig.endMinute)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Coffee className="h-4 w-4 text-blue-600 mr-2" />
          <div>
            <div className="font-medium text-blue-900">Lunch Break</div>
            <div className="text-blue-700">
              {formatTime12h(hoursConfig.lunchStartHour, hoursConfig.lunchStartMinute)} - {formatTime12h(hoursConfig.lunchEndHour, hoursConfig.lunchEndMinute)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-blue-600 mr-2" />
          <div>
            <div className="font-medium text-blue-900">Daily Target</div>
            <div className="text-blue-700">{hoursConfig.standardWorkHours} hours</div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-blue-600">
        <strong>Note:</strong> Attendance after {formatTime12h(hoursConfig.startHour, hoursConfig.startMinute)} will be marked as late. 
        Overtime is calculated for hours worked beyond {hoursConfig.standardWorkHours} hours.
      </div>
    </div>
  );
};

export default WorkingHoursInfo;
