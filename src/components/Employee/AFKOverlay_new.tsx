import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth_new';

interface AFKOverlayProps {
  onEndAFK: () => void;
}

const AFKOverlay: React.FC<AFKOverlayProps> = ({ onEndAFK }) => {
  const { endAFK } = useAuth();
  const [startTime] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (start: Date, current: Date) => {
    const diff = Math.floor((current.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleEndAFK = async () => {
    try {
      await endAFK();
      onEndAFK();
    } catch (error) {
      console.error('Failed to end AFK:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center text-white">
        <div className="mb-8">
          <h1 className="text-6xl font-light mb-4">😴</h1>
          <h2 className="text-3xl font-light mb-2">Away From Keyboard</h2>
          <p className="text-lg text-gray-300">You are currently in AFK mode</p>
        </div>

        <div className="mb-12">
          <div className="text-6xl font-mono font-light mb-2">
            {formatDuration(startTime, currentTime)}
          </div>
          <p className="text-gray-400">Duration</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleEndAFK}
            className="px-8 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            End AFK
          </button>
          <p className="text-sm text-gray-400">
            Click "End AFK" to return to work
          </p>
        </div>

        <div className="mt-12 text-xs text-gray-500">
          <p>AFK started at {startTime.toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

export default AFKOverlay;
