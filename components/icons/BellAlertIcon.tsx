
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const BellAlertIcon: React.FC<IconProps> = ({ className = "w-6 h-6", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 11.25a.75.75 0 0 1 0-1.5m1.259 5.25a.75.75 0 0 1 0-1.5m15.257 1.5a.75.75 0 0 1 0-1.5M16.5 6.375a.75.75 0 0 1 0-1.5m-9.75 1.5a.75.75 0 0 1 0-1.5M21 9.75A.75.75 0 0 1 20.25 9M12 3.75a.75.75 0 0 1 .75-.75M3.75 9A.75.75 0 0 1 3 9.75m1.5-4.5a.75.75 0 0 1-.75-.75" />
  </svg>
);
export default BellAlertIcon;
