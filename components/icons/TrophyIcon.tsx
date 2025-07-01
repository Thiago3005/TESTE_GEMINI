
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const TrophyIcon: React.FC<IconProps> = ({ className = "w-6 h-6", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3.75 3.75 0 0 1-3.75 3.75m-3.75-3.75a3.75 3.75 0 0 1 3.75-3.75M9 15m-3 0h6m-6 0a3.75 3.75 0 0 0-3.75 3.75m15-3.75a3.75 3.75 0 0 0 3.75-3.75M9 15V9.375A2.625 2.625 0 0 1 11.625 6.75h.75A2.625 2.625 0 0 1 15 9.375V15" />
  </svg>
);

export default TrophyIcon;
