
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const UsersIcon: React.FC<IconProps> = ({ className = "w-6 h-6", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-3.741-5.602M12 12.75a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0H7.5M12 12.75V15m0 0H7.5M12 15A6.75 6.75 0 0 0 5.25 9.75M12 15A6.75 6.75 0 0 1 18.75 9.75M12 2.25A6.75 6.75 0 0 0 5.25 9m6.75-6.75v1.5m0 1.5V9m0-3a2.25 2.25 0 0 0-2.25-2.25H7.5A2.25 2.25 0 0 0 5.25 6m13.5 6.75a2.25 2.25 0 0 0-2.25-2.25H15a2.25 2.25 0 0 0-2.25 2.25m3.75 0v1.5m0 1.5V18m0-3a2.25 2.25 0 0 0-2.25-2.25H15A2.25 2.25 0 0 0 12.75 15m3.75 0h-3.75M3.375 19.5a2.25 2.25 0 0 1 2.25-2.25H10.5a2.25 2.25 0 0 1 2.25 2.25" />
  </svg>
);

export default UsersIcon;