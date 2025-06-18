
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const BanknotesIcon: React.FC<IconProps> = ({ className = "w-6 h-6", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6V5.25m0 0A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25v.75m0 0a2.25 2.25 0 0 1-2.25 2.25h-13.5A2.25 2.25 0 0 1 3 6m18 0v12.75A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V6.75m15-3h-15" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12H18m-2.25 3H18m-2.25-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12 6.75h.008v.008H12V6.75Z" />
  </svg>
);
export default BanknotesIcon;
