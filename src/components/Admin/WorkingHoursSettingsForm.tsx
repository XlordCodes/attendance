import React, { useState, useEffect } from 'react';
import { Save, Clock, Coffee, Workflow } from 'lucide-react';
import toast from 'react-hot-toast';
import { configService, type WorkingHoursDBConfig } from '../../services/configService';
import { updateWorkingHours } from '../../constants/workingHours';

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
  OVERTIME_THRESHOLD: number;
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const dbConfig: WorkingHoursDBConfig = await configService.getWorkingHoursConfig();
        setFormData({
          START_HOUR: dbConfig.start_hour,
          START_MINUTE: dbConfig.start_minute,
          END_HOUR: dbConfig.end_hour,
          END_MINUTE: dbConfig.end_minute,
          STANDARD_WORK_HOURS: dbConfig.standard_work_hours,
          LUNCH_START_HOUR: dbConfig.lunch_start_hour,
          LUNCH_START_MINUTE: dbConfig.lunch_start_minute,
          LUNCH_END_HOUR: dbConfig.lunch_end_hour,
          LUNCH_END_MINUTE: dbConfig.lunch_end_minute,
          OVERTIME_THRESHOLD: dbConfig.overtime_threshold,
        });
      } catch (error) {
        console.error('Failed to load config:', error);
        toast.error('Failed to load working hours configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

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
      await updateWorkingHours(formData);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Work Hours Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center mb-4">
          <Clock className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Daily Working Hours</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="23"
                value={formData.START_HOUR}
                onChange={(e) => handleChange('START_HOUR', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <span className="text-gray-500">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.START_MINUTE}
                onChange={(e) => handleChange('START_MINUTE', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="23"
                value={formData.END_HOUR}
                onChange={(e) => handleChange('END_HOUR', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <span className="text-gray-500">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.END_MINUTE}
                onChange={(e) => handleChange('END_MINUTE', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lunch Break Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center mb-4">
          <Coffee className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Lunch Break</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lunch Start
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="23"
                value={formData.LUNCH_START_HOUR}
                onChange={(e) => handleChange('LUNCH_START_HOUR', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <span className="text-gray-500">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.LUNCH_START_MINUTE}
                onChange={(e) => handleChange('LUNCH_START_MINUTE', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lunch End
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="23"
                value={formData.LUNCH_END_HOUR}
                onChange={(e) => handleChange('LUNCH_END_HOUR', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <span className="text-gray-500">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.LUNCH_END_MINUTE}
                onChange={(e) => handleChange('LUNCH_END_MINUTE', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Settings */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center mb-4">
          <Workflow className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Calculation Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Standard Work Hours (hours)
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              value={formData.STANDARD_WORK_HOURS}
              onChange={(e) => handleChange('STANDARD_WORK_HOURS', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Expected daily work hours (used for overtime calculation)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Overtime Threshold (hours)
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              value={formData.OVERTIME_THRESHOLD}
              onChange={(e) => handleChange('OVERTIME_THRESHOLD', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Hours above this count as overtime
            </p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
