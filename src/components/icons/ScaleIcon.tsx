
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const ScaleIcon: React.FC<IconProps> = ({ className = "w-6 h-6", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52M6.25 4.97A48.416 48.416 0 0 1 12 4.5c2.291 0 4.545.16 6.75.47m-13.5 0C4.146 5.116 3.146 5.29 2.25 5.5m3.75-.48a25.293 25.293 0 0 0-3.75.48M12 12.75h.008v.008H12v-.008Zm0 3h.008v.008H12v-.008Zm0 3h.008v.008H12v-.008Zm0-9h.008v.008H12V9.75Z" />
  </svg>
);
export default ScaleIcon;