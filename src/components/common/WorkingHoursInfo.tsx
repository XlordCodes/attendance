import React from 'react';
import { Clock, Calendar, Coffee } from 'lucide-react';
import { WORKING_HOURS, formatWorkingHours } from '../../constants/workingHours';

const WorkingHoursInfo: React.FC = () => {
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
            <div className="text-blue-700">{formatWorkingHours()}</div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Coffee className="h-4 w-4 text-blue-600 mr-2" />
          <div>
            <div className="font-medium text-blue-900">Lunch Break</div>
            <div className="text-blue-700">
              {WORKING_HOURS.LUNCH_START_HOUR}:00 PM - {WORKING_HOURS.LUNCH_END_HOUR}:00 PM
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-blue-600 mr-2" />
          <div>
            <div className="font-medium text-blue-900">Daily Target</div>
            <div className="text-blue-700">{WORKING_HOURS.STANDARD_WORK_HOURS} hours</div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-blue-600">
        <strong>Note:</strong> Attendance after {WORKING_HOURS.START_HOUR}:00 AM will be marked as late. 
        Overtime is calculated for hours worked beyond {WORKING_HOURS.STANDARD_WORK_HOURS} hours.
      </div>
    </div>
  );
};

export default WorkingHoursInfo;
