
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const PiggyBankIcon: React.FC<IconProps> = ({ className = "w-6 h-6", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h13.5m-13.5 4.5h13.5m-13.5 4.5h13.5m3-13.5V5.25A2.25 2.25 0 0 0 16.5 3H7.5A2.25 2.25 0 0 0 5.25 5.25v3.75m13.5 0v3.75m-13.5-3.75v3.75m1.5-9V3.75c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125V5.25m-3 0h3m6 0v2.25m0 0v1.5m0 0v1.5m0 0V15m0 0v-1.5m0 0V9.75M7.5 5.25h9M7.5 12h9m-9 4.5h9M5.25 19.5h13.5a2.25 2.25 0 0 0 2.25-2.25V5.25A2.25 2.25 0 0 0 16.5 3H7.5A2.25 2.25 0 0 0 5.25 5.25v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h-3m3 0V12m0 0v-2.25" />
  </svg>
);

export default PiggyBankIcon;