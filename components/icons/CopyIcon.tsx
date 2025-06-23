
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const CopyIcon: React.FC<IconProps> = ({ className = "w-5 h-5", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376H3.375m0 0h3.75m-3.75 0h3.75m0 0v3.375M9.75 7.5h3.75m-3.75 0h3.75M9.75 7.5v3.375M9.75 7.5H6M9.75 7.5H3.375m0 0h3.75m6.375 0H9.75m6.375 0H9.75m6.375 0V3.375c0-.621-.504-1.125-1.125-1.125H9.75A1.125 1.125 0 0 0 8.625 3.375v3.375M12 12.75H3.375M12 12.75H9.75M12 12.75v3.375M12 12.75V9.75M12 12.75H6.375m5.625 3H12m0 0H9.75m2.25 0V18M12 18v-2.25m0 0h-1.5m1.5 0h1.5M12 18v-2.25m0 0H9.75M12 18H9.75M12 18H6.375m0 0h-3M12 18h3.75m0 0h3.75M12 18h3.75M12 18h3.75M12 18H3.375m2.25-7.5H3.375m2.25-7.5H3.375m2.25-7.5v3.375M12 3.375H3.375M12 3.375H9.75m2.25 0H3.375m2.25 0H9.75m2.25 0V1.125c0-.621-.504-1.125-1.125-1.125H9.75A1.125 1.125 0 0 0 8.625 1.125M12 3.375V1.125m0 2.25V6M12 6H9.75M12 6H3.375M12 6h2.25M12 6h2.25m0 0H18M12 6h2.25m0 0V3.375M12 6V3.375m2.25 2.625V3.375m0 2.625V3.375m0 2.625H18m2.25-2.625H18m2.25-2.625H18M20.25 3.375H18M20.25 3.375H18M20.25 3.375V1.125c0-.621-.504-1.125-1.125-1.125H18M20.25 3.375V1.125" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5h6M9 10.5h6m-6 6h6m-6-3h6m-6-3h6M9 7.5h6M9 4.5h6M9 1.5h6M9 19.5h6" />
    <rect x="3" y="3" width="18" height="18" rx="2.25" strokeWidth="0" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V15.75a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5V8.25m6.75-1.5H7.5v9h7.5V6.75Z" />
 </svg>
);
export default CopyIcon;
