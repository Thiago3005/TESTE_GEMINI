import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const PresentationChartLineIcon: React.FC<IconProps> = ({ className = "w-6 h-6", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V3M3.75 14.25m-1.5 0h3m12.75 0h3M4.5 19.5h15M6.75 3H9m1.5 0H12m1.5 0H15m2.25 0h1.5M3.75 6H6m1.5 0H9m1.5 0H12m1.5 0H15m2.25 0h1.5m-15 3H6m1.5 0H9m1.5 0H12m1.5 0H15m2.25 0h1.5M3 12h18" />
  </svg>
);
export default PresentationChartLineIcon;
