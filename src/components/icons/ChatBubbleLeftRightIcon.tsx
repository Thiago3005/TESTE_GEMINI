
import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

const ChatBubbleLeftRightIcon: React.FC<IconProps> = ({ className = "w-6 h-6", style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={style}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3.697-3.697c-.022-.021-.041-.044-.06-.067H6.75c-1.136 0-2.097-.847-2.193-1.98a18.75 18.75 0 0 1-.072-1.02c0-.884.284-1.5 2.097-1.5H13.5c.884 0 1.5-.284 2.097-1.5 1.136 0 2.1.847 2.193 1.98.027.34.052.68.072 1.02z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h-.008v.008H3.75V12zm0-3.75h.008v.008H3.75V8.25zm0 7.5h.008v.008H3.75v-.008zM4.5 6H15a2.25 2.25 0 0 1 2.25 2.25v1.5A2.25 2.25 0 0 1 15 12H4.5A2.25 2.25 0 0 1 2.25 9.75v-1.5A2.25 2.25 0 0 1 4.5 6z" />
  </svg>
);

export default ChatBubbleLeftRightIcon;