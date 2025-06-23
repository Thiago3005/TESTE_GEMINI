
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const TrendingUpIcon: React.FC<IconProps> = ({ className = "w-6 h-6", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28L18.75 3.75M2.25 18v3.75A2.25 2.25 0 0 0 4.5 24h15A2.25 2.25 0 0 0 21.75 21.75V18M2.25 4.5A2.25 2.25 0 0 1 4.5 2.25h15A2.25 2.25 0 0 1 21.75 4.5V8.25M2.25 4.5 9 11.25l4.306-4.307a11.95 11.95 0 0 1 5.814 5.518" />
  </svg>
);

export default TrendingUpIcon;
