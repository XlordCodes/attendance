import React, { useState } from 'react';
import { attendanceMigrationService } from '../../utils/attendanceMigration';
import { attendanceServiceSubcollection } from '../../services/attendanceServiceSubcollection';
import toast from 'react-hot-toast';

interface MigrationStats {
  usersProcessed: number;
  recordsMigrated: number;
  errors: string[];
}

const AttendanceMigrationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [migrationStats, setMigrationStats] = useState<MigrationStats | null>(null);
  const [verificationResults, setVerificationResults] = useState<string[]>([]);

  const handleMigrateAll = async () => {
    if (loading) return;
    
    setLoading(true);
    setMigrationStats(null);
    
    try {
      toast.info('Starting migration... This may take a few minutes.');
      const stats = await attendanceMigrationService.migrateAllAttendanceData();
      setMigrationStats(stats);
      
      if (stats.errors.length === 0) {
        toast.success(`Migration completed! ${stats.recordsMigrated} records migrated for ${stats.usersProcessed} users.`);
      } else {
        toast.error(`Migration completed with ${stats.errors.length} errors. Check details below.`);
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(`Migration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateUser = async () => {
    const userId = prompt('Enter User ID to migrate:');
    if (!userId || loading) return;
    
    setLoading(true);
    
    try {
      toast.info(`Starting migration for user: ${userId}`);
      const stats = await attendanceMigrationService.migrateUserAttendanceData(userId);
      
      if (stats.errors.length === 0) {
        toast.success(`User migration completed! ${stats.recordsMigrated} records migrated.`);
      } else {
        toast.error(`User migration completed with errors. Check console for details.`);
      }
    } catch (error: any) {
      console.error('User migration error:', error);
      toast.error(`User migration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMigration = async () => {
    const userId = prompt('Enter User ID to verify:');
    if (!userId || loading) return;
    
    setLoading(true);
    
    try {
      const result = await attendanceMigrationService.verifyMigration(userId);
      const resultText = `User ${userId}: ${result.success ? '✅ Success' : '❌ Failed'} - ${result.details}`;
      
      setVerificationResults(prev => [resultText, ...prev.slice(0, 9)]); // Keep last 10 results
      
      if (result.success) {
        toast.success('Verification passed!');
      } else {
        toast.error('Verification failed - check details');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSubcollection = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      // Test with a dummy user ID (you can modify this)
      const testUserId = prompt('Enter User ID to test attendance:');
      if (!testUserId) return;

      toast.info('Testing subcollection attendance service...');
      
      // Test getting today's attendance
      const todayAttendance = await attendanceServiceSubcollection.getTodayAttendance(testUserId);
      
      if (todayAttendance) {
        toast.success('Subcollection service working! Found today\'s attendance record.');
      } else {
        toast.info('Subcollection service working! No attendance record for today (which is normal).');
      }
      
      // Test getting attendance history
      const history = await attendanceServiceSubcollection.getAttendanceHistory(testUserId, 10);
      console.log('Attendance history:', history);
      
      toast.success(`Subcollection test completed. Found ${history.length} historical records.`);
      
    } catch (error: any) {
      console.error('Test error:', error);
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🔄 Attendance Data Migration
          </h1>
          
          <div className="space-y-6">
            {/* Migration Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                📋 What This Migration Does
              </h2>
              <ul className="text-blue-800 space-y-1 text-sm">
                <li>• Moves attendance data from user document arrays to subcollections</li>
                <li>• Improves performance and removes the 1MB document size limit</li>
                <li>• Each attendance record becomes a separate document under users/{userId}/attendance/{date}</li>
                <li>• Preserves all existing data while improving structure</li>
              </ul>
            </div>

            {/* Migration Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={handleMigrateAll}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Processing...' : 'Migrate All Users'}
              </button>
              
              <button
                onClick={handleMigrateUser}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Migrate Single User
              </button>
              
              <button
                onClick={handleVerifyMigration}
                disabled={loading}
                className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Verify Migration
              </button>
              
              <button
                onClick={handleTestSubcollection}
                disabled={loading}
                className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Test Subcollection
              </button>
            </div>

            {/* Migration Results */}
            {migrationStats && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Migration Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white p-3 rounded border">
                    <div className="text-2xl font-bold text-blue-600">{migrationStats.usersProcessed}</div>
                    <div className="text-sm text-gray-600">Users Processed</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-2xl font-bold text-green-600">{migrationStats.recordsMigrated}</div>
                    <div className="text-sm text-gray-600">Records Migrated</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-2xl font-bold text-red-600">{migrationStats.errors.length}</div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                </div>
                
                {migrationStats.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                    <div className="bg-red-50 border border-red-200 rounded p-3 max-h-40 overflow-y-auto">
                      {migrationStats.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-800 mb-1">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verification Results */}
            {verificationResults.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Verification Results</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {verificationResults.map((result, index) => (
                    <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                🚀 Migration Steps
              </h3>
              <ol className="text-yellow-800 space-y-1 text-sm list-decimal list-inside">
                <li>Click "Migrate All Users" to move all attendance data to subcollections</li>
                <li>Use "Verify Migration" to check if migration was successful for specific users</li>
                <li>Test the new system with "Test Subcollection"</li>
                <li>Once verified, update your app to use the new attendance service</li>
              </ol>
            </div>

            {/* Firebase Structure Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                📊 New Firebase Structure
              </h3>
              <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
{`users/
├── {userId}/
│   ├── email: "user@example.com"
│   ├── name: "User Name"
│   ├── role: "employee"
│   └── attendance/          ← New Subcollection
│       ├── 2025-07-01/      ← Date as Document ID
│       │   ├── clockIn: timestamp
│       │   ├── clockOut: timestamp
│       │   ├── breakTimes: array
│       │   └── totalHours: number
│       ├── 2025-07-02/
│       └── ...
└── ...`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceMigrationPage;
