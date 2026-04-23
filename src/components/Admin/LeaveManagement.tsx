import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Check, 
  X, 
  Clock, 
  User, 
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { leaveService } from '../../services/leaveService';
import { LeaveRequest } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const LeaveManagement: React.FC = () => {
  const { employee } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

   useEffect(() => {
     loadLeaveRequests();
   }, []);

   const loadLeaveRequests = async () => {
     setLoading(true);
     try {
       const requests = await leaveService.getAllLeaveRequests();
       setLeaveRequests(requests);
     } catch (error) {
       console.error('Error loading leave requests:', error);
       toast.error('Failed to load leave requests');
     } finally {
       setLoading(false);
     }
   };

   const formatDate = (dateString: string) => {
     return format(new Date(`${dateString}T00:00:00`), 'MMM dd, yyyy');
   };

  const handleApproveRequest = async (id: string) => {
    try {
      if (!employee?.id) {
        toast.error('Admin identity not verified');
        return;
      }
      await leaveService.updateLeaveRequestStatus(
        id,
        'approved',
        employee.id,
        'Approved by admin'
      );
      setLeaveRequests(prev =>
        prev.map(req => req.id === id ? { ...req, status: 'approved' } : req)
      );
      toast.success('Leave request approved');
    } catch (error) {
      console.error('Error approving leave request:', error);
      toast.error('Failed to approve leave request');
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      if (!employee?.id) {
        toast.error('Admin identity not verified');
        return;
      }
      await leaveService.updateLeaveRequestStatus(
        id,
        'rejected',
        employee.id,
        'Rejected by admin'
      );
      setLeaveRequests(prev =>
        prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req)
      );
      toast.success('Leave request rejected');
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      toast.error('Failed to reject leave request');
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const getStatusColor = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getLeaveTypeColor = (type: LeaveRequest['leaveType']) => {
    switch (type) {
      case 'vacation': return 'text-blue-600 bg-blue-100';
      case 'sick': return 'text-red-600 bg-red-100';
      case 'personal': return 'text-purple-600 bg-purple-100';
      case 'emergency': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date
    return diffDays;
  };

  const pendingCount = leaveRequests.filter(req => req.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600">Manage employee leave requests and approvals</p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {pendingCount} pending requests
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex space-x-4">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-2 text-xs">
                  ({leaveRequests.filter(req => req.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Leave Requests */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave requests...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-gray-400" />
                        <span className="font-semibold text-gray-900">{request.employeeName}</span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(request.leaveType)}`}>
                        {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{calculateDays(request.startDate, request.endDate)} days</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        <span>Requested {request.appliedAt ? format(new Date(request.appliedAt), 'MMM dd, yyyy') : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        <strong>Reason:</strong> {request.reason}
                      </p>
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleApproveRequest(request.id!)}
                        className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id!)}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {filter === 'all' 
                  ? 'No leave requests found'
                  : `No ${filter} leave requests found`
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
