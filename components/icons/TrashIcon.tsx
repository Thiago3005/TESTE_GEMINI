
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const TrashIcon: React.FC<IconProps> = ({ className = "w-5 h-5", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c1.153 0 2.24.03 3.22.077m3.22-.077L10.877 4.684a2.25 2.25 0 0 1 2.244-2.077h.093a2.25 2.25 0 0 1 2.244 2.077L14.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c1.153 0 2.24.03 3.22.077m3.22-.077L10.877 4.684a2.25 2.25 0 0 1 2.244-2.077h.093a2.25 2.25 0 0 1 2.244 2.077L14.772 5.79M5.25 5.79h13.5" />
  </svg>
);
export default TrashIcon;