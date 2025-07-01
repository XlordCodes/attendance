import React from 'react';
import DatabaseSetup from '../components/Setup/DatabaseSetup';

const SetupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <DatabaseSetup />
    </div>
  );
};

export default SetupPage;
