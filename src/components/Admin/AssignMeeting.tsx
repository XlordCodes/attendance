import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Send } from 'lucide-react';
import { userService } from '../../services/userService';
import { meetingService } from '../../services/meetingService';
import { Employee, Meeting } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const AssignMeeting: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    loadEmployees();
    loadMeetings();
  }, []);

  const loadEmployees = async () => {
    try {
      const employeesList = await userService.getAllUsers();
      // Filter out admin users for meeting assignment
      const nonAdminEmployees = employeesList.filter(emp => emp.role !== 'admin');
      setEmployees(nonAdminEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const loadMeetings = async () => {
    try {
      const meetingsList = await meetingService.getAllMeetings();
      setMeetings(meetingsList);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleAssignMeeting = async () => {
    if (!meetingTitle.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }
    if (!meetingDate || !meetingTime) {
      toast.error('Please select date and time');
      return;
    }
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    setLoading(true);
    try {
      const newMeeting = await meetingService.createMeeting({
        title: meetingTitle,
        description: meetingDescription,
        date: meetingDate,
        time: meetingTime,
        assignedEmployees: selectedEmployees,
        createdBy: 'current-admin-id', // TODO: Get actual admin ID
      });

      // Add to local state
      setMeetings(prev => [newMeeting, ...prev]);
      
      // Reset form
      setMeetingTitle('');
      setMeetingDescription('');
      setMeetingDate('');
      setMeetingTime('');
      setSelectedEmployees([]);
      
      toast.success(`Meeting assigned to ${selectedEmployees.length} employees`);
    } catch (error) {
      console.error('Error assigning meeting:', error);
      toast.error('Failed to assign meeting');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedEmployeeNames = () => {
    return employees
      .filter(emp => selectedEmployees.includes(emp.id))
      .map(emp => emp.name)
      .join(', ');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Assign Meeting</h1>
        <p className="text-gray-600">Schedule meetings and notify selected employees</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting Assignment Form */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Meeting</h2>
          
          <div className="space-y-4">
            {/* Meeting Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Title *
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter meeting title"
              />
            </div>

            {/* Meeting Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={meetingDescription}
                onChange={(e) => setMeetingDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter meeting description (optional)"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Selected Employees Summary */}
            {selectedEmployees.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Selected ({selectedEmployees.length}):</strong> {getSelectedEmployeeNames()}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleAssignMeeting}
              disabled={loading || !meetingTitle.trim() || !meetingDate || !meetingTime || selectedEmployees.length === 0}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Assigning...' : 'Assign Meeting'}</span>
            </button>
          </div>
        </div>

        {/* Employee Selection */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Employees</h2>
          
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No employees found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {employees.map((employee) => (
                <label
                  key={employee.id}
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.id)}
                    onChange={() => handleEmployeeToggle(employee.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.email}</p>
                      </div>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        {employee.department}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Meetings */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Meetings</h2>
        
        {meetings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No meetings assigned yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                    {meeting.description && (
                      <p className="text-sm text-gray-600 mt-1">{meeting.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(new Date(meeting.date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {meeting.time}
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {meeting.assignedEmployees.length} employees
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignMeeting;
