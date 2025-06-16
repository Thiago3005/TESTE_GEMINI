
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const LightBulbIcon: React.FC<IconProps> = ({ className = "w-5 h-5", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.355a12.053 12.053 0 0 1-4.5 0M12 3V1.5M12 16.5h.008v.008H12V16.5Zm-4.508-2.656L6.292 12.64a9.018 9.018 0 0 1-.365-2.074 9.028 9.028 0 0 1 .365-2.073l1.208-1.208m5.832 5.46L17.708 12.36a9.018 9.018 0 0 0 .365-2.074 9.028 9.028 0 0 0-.365-2.073L16.5 6.992M12 1.5a9 9 0 0 0-9 9c0 2.21.81 4.286 2.186 5.885L6.9 17.72A9.03 9.03 0 0 0 12 22.5a9.03 9.03 0 0 0 5.1-4.78l1.714-1.335A8.973 8.973 0 0 0 21 10.5a9 9 0 0 0-9-9Z" />
  </svg>
);

export default LightBulbIcon;