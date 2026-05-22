import React, { useState } from 'react';
import { X, Calendar, FileText, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { leaveService } from '../../services/leaveService';
import { LeaveRequest } from '../../types';
import toast from 'react-hot-toast';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ isOpen, onClose }) => {
  const { employee } = useAuth();
  const [formData, setFormData] = useState({
    leaveType: 'vacation' as LeaveRequest['leaveType'],
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayLocal = new Date().toLocaleDateString('en-CA');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee?.id) {
      toast.error('You must be logged in to request leave');
      return;
    }

    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setIsSubmitting(true);

    try {
      const leaveRequest: Omit<LeaveRequest, 'id' | 'appliedAt'> = {
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
        status: 'pending'
      };

      await leaveService.submitLeaveRequest(leaveRequest);
      toast.success('Leave request submitted successfully!');

      // Reset form
      setFormData({
        leaveType: 'vacation',
        startDate: '',
        endDate: '',
        reason: ''
      });

      onClose();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error('Failed to submit leave request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-gray-100 dark:border-neutral-800 w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Request Leave</h2>
          <button
            onClick={onClose}
            className="bg-transparent hover:bg-canvas dark:hover:bg-neutral-800 rounded-xl p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              <Clock className="h-4 w-4 inline mr-1" />
              Leave Type
            </label>
            <select
              value={formData.leaveType}
              onChange={(e) => handleInputChange('leaveType', e.target.value)}
              className="w-full border border-gray-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent [color-scheme:light] dark:[color-scheme:dark]"
              required
            >
              <option value="vacation">Vacation</option>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal</option>
              <option value="emergency">Emergency</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                min={todayLocal}
                className="w-full border border-gray-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent [color-scheme:light] dark:[color-scheme:dark]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                min={formData.startDate || todayLocal}
                className="w-full border border-gray-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent [color-scheme:light] dark:[color-scheme:dark]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Reason
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Please provide a reason for your leave request..."
              rows={4}
              className="w-full border border-gray-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-600 px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent resize-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 font-medium transition-all duration-200 ${isSubmitting
                ? 'bg-gray-200 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500 cursor-not-allowed rounded-xl'
                : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm rounded-xl'
                }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestModal;
