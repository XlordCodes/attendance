import React, { useState, useEffect } from 'react';
import { Save, Clock, Coffee, Workflow, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { configService } from '../../services/configService';

interface FormData {
  START_HOUR: number;
  START_MINUTE: number;
  END_HOUR: number;
  END_MINUTE: number;
  STANDARD_WORK_HOURS: number;
  LUNCH_START_HOUR: number;
  LUNCH_START_MINUTE: number;
  LUNCH_END_HOUR: number;
  LUNCH_END_MINUTE: number;
  OVERTIME_THRESHOLD: number,
  REQUIRE_IP_MATCH: boolean;
  REQUIRE_GEO_MATCH: boolean;
  REST_DAYS: number[];
}

const WorkingHoursSettingsForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    START_HOUR: 10,
    START_MINUTE: 0,
    END_HOUR: 20,
    END_MINUTE: 0,
    STANDARD_WORK_HOURS: 10,
    LUNCH_START_HOUR: 14,
    LUNCH_START_MINUTE: 0,
    LUNCH_END_HOUR: 15,
    LUNCH_END_MINUTE: 0,
    OVERTIME_THRESHOLD: 10,
    REQUIRE_IP_MATCH: true,
    REQUIRE_GEO_MATCH: true,
    REST_DAYS: [],
  });
  const [selectedRole, setSelectedRole] = useState<string>('employee');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Global config for security toggles (once)
        const dbConfig = await configService.getWorkingHoursConfig();
        if (dbConfig) {
          setFormData(prev => ({
            ...prev,
            REQUIRE_IP_MATCH: dbConfig.require_ip_match,
            REQUIRE_GEO_MATCH: dbConfig.require_geo_match
          }));
        }

        // Role-specific schedule for selected role
        const schedule = await configService.getScheduleByRole(selectedRole);
        if (schedule) {
          setFormData(prev => ({
            ...prev,
            START_HOUR: schedule.start_hour,
            START_MINUTE: schedule.start_minute,
            END_HOUR: schedule.end_hour,
            END_MINUTE: schedule.end_minute,
            STANDARD_WORK_HOURS: schedule.standard_work_hours,
            LUNCH_START_HOUR: schedule.lunch_start_hour,
            LUNCH_START_MINUTE: schedule.lunch_start_minute,
            LUNCH_END_HOUR: schedule.lunch_end_hour,
            LUNCH_END_MINUTE: schedule.lunch_end_minute,
            OVERTIME_THRESHOLD: schedule.overtime_threshold,
            REST_DAYS: schedule.restDays || [],
          }));
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        toast.error('Failed to load working hours configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // }, [selectedRole]);
  }, [selectedRole]);

  const handleChange = (field: keyof FormData, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    const { START_HOUR, START_MINUTE, END_HOUR, END_MINUTE, LUNCH_START_HOUR, LUNCH_START_MINUTE, LUNCH_END_HOUR, LUNCH_END_MINUTE } = formData;

    // Validate work period
    const workStart = START_HOUR * 60 + START_MINUTE;
    const workEnd = END_HOUR * 60 + END_MINUTE;
    if (workEnd <= workStart) {
      toast.error('End time must be after start time');
      return false;
    }

    // Validate lunch period
    const lunchStart = LUNCH_START_HOUR * 60 + LUNCH_START_MINUTE;
    const lunchEnd = LUNCH_END_HOUR * 60 + LUNCH_END_MINUTE;
    if (lunchEnd <= lunchStart) {
      toast.error('Lunch end time must be after lunch start time');
      return false;
    }

    // Ensure lunch is within work hours (optional but recommended)
    if (lunchStart < workStart || lunchEnd > workEnd) {
      toast.error('Lunch break must be within working hours');
      return false;
    }

    if (formData.STANDARD_WORK_HOURS <= 0) {
      toast.error('Standard work hours must be positive');
      return false;
    }

    if (formData.OVERTIME_THRESHOLD < 0) {
      toast.error('Overtime threshold cannot be negative');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      // Update global security settings (working_hours_config)
      await configService.updateWorkingHoursConfig({
        require_ip_match: formData.REQUIRE_IP_MATCH,
        require_geo_match: formData.REQUIRE_GEO_MATCH
      });

      // Update role-specific schedule (role_schedules)
      await configService.updateRoleSchedule(selectedRole, {
        start_hour: formData.START_HOUR,
        start_minute: formData.START_MINUTE,
        end_hour: formData.END_HOUR,
        end_minute: formData.END_MINUTE,
        standard_work_hours: formData.STANDARD_WORK_HOURS,
        lunch_start_hour: formData.LUNCH_START_HOUR,
        lunch_start_minute: formData.LUNCH_START_MINUTE,
        lunch_end_hour: formData.LUNCH_END_HOUR,
        lunch_end_minute: formData.LUNCH_END_MINUTE,
        overtime_threshold: formData.OVERTIME_THRESHOLD,
        restDays: formData.REST_DAYS,
      });

      toast.success('Working hours updated successfully');
    } catch (error) {
      console.error('Error updating working hours:', error);
      toast.error('Failed to update working hours. Make sure you are an admin.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Role Selector */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-gray-200 dark:border-neutral-700">
        <div className="flex items-center mb-3">
          <Users className="h-5 w-5 text-brand mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Role Schedule</h3>
        </div>
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Select Role to Configure
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
          >
            <option value="admin">Admin</option>
            <option value="core">Core</option>
            <option value="employee">Employee</option>
            <option value="trainee">Trainee</option>
            <option value="intern">Intern</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
            Adjust the schedule for the selected role. Security settings (IP/Geo) apply globally.
          </p>
        </div>
      </div>

      {/* Work Hours Section */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-gray-100 dark:border-neutral-800">
        <div className="flex items-center mb-4">
          <Clock className="h-5 w-5 text-brand mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Working Hours</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Start Time
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="23"
                value={formData.START_HOUR}
                onChange={(e) => handleChange('START_HOUR', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl bg-transparent dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
                required
              />
              <span className="text-gray-500 dark:text-neutral-400">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.START_MINUTE}
                onChange={(e) => handleChange('START_MINUTE', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl bg-transparent dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              End Time
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="23"
                value={formData.END_HOUR}
                onChange={(e) => handleChange('END_HOUR', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl bg-transparent dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
                required
              />
              <span className="text-gray-500 dark:text-neutral-400">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.END_MINUTE}
                onChange={(e) => handleChange('END_MINUTE', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl bg-transparent dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lunch Break Section */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-gray-100 dark:border-neutral-800">
        <div className="flex items-center mb-4">
          <Coffee className="h-5 w-5 text-brand mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lunch Break</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Lunch Start
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="23"
                value={formData.LUNCH_START_HOUR}
                onChange={(e) => handleChange('LUNCH_START_HOUR', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl bg-transparent dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
                required
              />
              <span className="text-gray-500 dark:text-neutral-400">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.LUNCH_START_MINUTE}
                onChange={(e) => handleChange('LUNCH_START_MINUTE', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl bg-transparent dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Lunch End
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="23"
                value={formData.LUNCH_END_HOUR}
                onChange={(e) => handleChange('LUNCH_END_HOUR', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl bg-transparent dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
                required
              />
              <span className="text-gray-500 dark:text-neutral-400">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.LUNCH_END_MINUTE}
                onChange={(e) => handleChange('LUNCH_END_MINUTE', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-xl bg-transparent dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Settings */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-gray-100 dark:border-neutral-800">
        <div className="flex items-center mb-4">
          <Workflow className="h-5 w-5 text-brand mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Calculation Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Standard Work Hours (hours)
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              value={formData.STANDARD_WORK_HOURS}
              onChange={(e) => handleChange('STANDARD_WORK_HOURS', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-800 rounded-xl bg-transparent dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
              Expected daily work hours (used for overtime calculation)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Overtime Threshold (hours)
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              value={formData.OVERTIME_THRESHOLD}
              onChange={(e) => handleChange('OVERTIME_THRESHOLD', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-800 rounded-xl bg-transparent dark:bg-black text-gray-900 dark:text-white dark:text-white focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
              Hours above this count as overtime
            </p>
          </div>
        </div>
      </div>

      {/* Scheduled Rest Days */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-gray-100 dark:border-neutral-800">
        <div className="flex items-center mb-4">
          <svg className="h-5 w-5 text-brand mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scheduled Rest Days</h3>
        </div>
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800 rounded-xl">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName, index) => {
            const restDaysList = formData.REST_DAYS;
            const isChecked = restDaysList.includes(index);
            const isDisabled = !isChecked && restDaysList.length >= 2;
            return (
              <label
                key={dayName}
                className={`flex items-center space-x-2 cursor-pointer ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => {
                    const updated = isChecked
                      ? restDaysList.filter((d) => d !== index)
                      : [...restDaysList, index].sort((a, b) => a - b);
                    setFormData(prev => ({ ...prev, REST_DAYS: updated }));
                  }}
                  className="h-4 w-4 rounded border-gray-300 dark:border-neutral-700 text-brand focus:ring-brand dark:bg-neutral-800 dark:checked:bg-brand dark:checked:border-brand"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-neutral-300 w-16">{dayName}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1.5">
          Select days when employees of this role do not work. Maximum of 2 rest days allowed.
        </p>
      </div>

      {/* Security & Validation Section */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-gray-100 dark:border-neutral-800">
        <div className="flex items-center mb-4">
          <svg className="h-5 w-5 text-brand mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security &amp; Validation</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-neutral-800/50 dark:border-neutral-700">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">IP Address Verification</h4>
              <p className="text-sm text-gray-600 dark:text-neutral-400 dark:text-gray-400">Require employees to be on the office network to clock in</p>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, REQUIRE_IP_MATCH: !prev.REQUIRE_IP_MATCH }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.REQUIRE_IP_MATCH ? 'bg-brand dark:bg-accent-500' : 'bg-gray-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.REQUIRE_IP_MATCH ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-neutral-800/50 dark:border-neutral-700">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Geofence Verification</h4>
              <p className="text-sm text-gray-600 dark:text-neutral-400 dark:text-gray-400">Require employees to be within office premises to clock in</p>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, REQUIRE_GEO_MATCH: !prev.REQUIRE_GEO_MATCH }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.REQUIRE_GEO_MATCH ? 'bg-brand dark:bg-accent-500' : 'bg-gray-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.REQUIRE_GEO_MATCH ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default WorkingHoursSettingsForm;
