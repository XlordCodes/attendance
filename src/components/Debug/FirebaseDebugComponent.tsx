import React, { useState, useEffect } from 'react';
import { testFirebaseConnection } from '../../utils/firebaseTest';
import { userService } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';

const FirebaseDebugComponent: React.FC = () => {
  const { user, employee } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runTests = async () => {
      try {
        // Test Firebase connection
        const connectionTest = await testFirebaseConnection();
        setConnectionStatus(connectionTest.success ? 'Connected' : `Failed: ${connectionTest.message}`);
        
        if (connectionTest.success) {
          // Test loading employees
          const employeeList = await userService.getAllEmployees();
          setEmployees(employeeList);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    };
    
    runTests();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg border">
      <h3 className="text-lg font-bold mb-4">Firebase Debug</h3>
      
      <div className="space-y-4">
        <div>
          <strong>Auth User:</strong> {user?.email || 'Not logged in'}
        </div>
        
        <div>
          <strong>Employee Data:</strong> {employee?.name || 'No employee data'} ({employee?.role || 'No role'})
        </div>
        
        <div>
          <strong>Connection Status:</strong> {connectionStatus}
        </div>
        
        <div>
          <strong>Employees Found:</strong> {employees.length}
        </div>
        
        {error && (
          <div className="text-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div>
          <strong>Employee Data:</strong>
          <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-40">
            {JSON.stringify(employees, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default FirebaseDebugComponent;
