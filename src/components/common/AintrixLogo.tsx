import { FC } from 'react';

interface AintrixLogoProps {
  variant: 'black' | 'white';
  size?: number;
  className?: string;
}

const AintrixLogo: FC<AintrixLogoProps> = ({ variant, size = 64, className = '' }) => {
  const color = variant === 'white' ? '#FFFFFF' : '#000000';
  
  return (
    <div className={`flex items-center ${className}`}>
      <svg
        width={size}
        height={size * 0.75}
        viewBox="0 0 200 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id={`gradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={variant === 'white' ? '#3B82F6' : '#1F2937'} />
            <stop offset="100%" stopColor={variant === 'white' ? '#1D4ED8' : '#374151'} />
          </linearGradient>
        </defs>
        
        <circle
          cx="100"
          cy="75"
          r="65"
          fill={`url(#gradient-${variant})`}
          stroke={color}
          strokeWidth="2"
        />
        
        {/* Modern "A" letterform */}
        <path
          d="M70 110 L85 50 L100 75 L115 50 L130 110 M80 85 L120 85"
          stroke={variant === 'white' ? '#FFFFFF' : '#FFFFFF'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Tech accent dots */}
        <circle cx="75" cy="40" r="3" fill={variant === 'white' ? '#FFFFFF' : '#FFFFFF'} opacity="0.8" />
        <circle cx="125" cy="40" r="3" fill={variant === 'white' ? '#FFFFFF' : '#FFFFFF'} opacity="0.8" />
        <circle cx="100" cy="30" r="2" fill={variant === 'white' ? '#FFFFFF' : '#FFFFFF'} opacity="0.6" />
      </svg>
      
      <div className="ml-4">
        <div 
          className={`text-2xl font-bold tracking-tight ${variant === 'white' ? 'text-white' : 'text-gray-900'}`}
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          AINTRIX
        </div>
        <div 
          className={`text-xs font-medium tracking-[0.2em] ${variant === 'white' ? 'text-gray-300' : 'text-gray-500'} mt-0.5`}
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          ATTENDANCE
        </div>
      </div>
    </div>
  );
};

export default AintrixLogo;
