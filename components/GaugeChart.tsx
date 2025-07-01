
import React from 'react';

const GaugeChart = ({ score }: { score: number }) => {
  // score is 0-100
  const normalizedScore = Math.max(0, Math.min(100, score));

  // SVG dimensions and gauge properties
  const width = 220;
  const height = 110;
  const cx = width / 2;
  const cy = height;
  const radius = 90;
  const strokeWidth = 20;

  // Colors based on score
  const getColor = (s: number) => {
    if (s < 0) return "#94a3b8"; // Slate-400 for privacy mode
    if (s < 40) return "#ef4444"; // red-500
    if (s < 70) return "#f59e0b"; // amber-500
    return "#22c55e"; // green-500
  };
  const color = getColor(normalizedScore);

  // SVG arc calculation
  const totalAngle = 180;
  const angle = (normalizedScore / 100) * totalAngle;
  
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const endPoint = polarToCartesian(cx, cy, radius, angle);
  const largeArcFlag = angle <= 180 ? "0" : "1";

  const pathData = [
    "M", cx - radius, cy,
    "A", radius, radius, 0, largeArcFlag, 1, endPoint.x, endPoint.y
  ].join(" ");
  
  // Base path for the background arc
  const baseEndPoint = polarToCartesian(cx, cy, radius, 180);
   const basePathData = [
    "M", cx - radius, cy,
    "A", radius, radius, 0, 1, 1, baseEndPoint.x, baseEndPoint.y
  ].join(" ");

  return (
    <div className="relative w-full flex flex-col items-center justify-center -mb-4">
      <svg width={width} height={height + 10} viewBox={`0 0 ${width} ${height + 10}`}>
        {/* Background Arc */}
        <path
          d={basePathData}
          stroke="#e2e8f0" /* slate-200 */
          className="dark:stroke-slate-700"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        {/* Score Arc */}
        {normalizedScore >= 0 && (
          <path
            d={pathData}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out, stroke 0.5s ease-in-out' }}
          />
        )}
      </svg>
      <div className="absolute bottom-0 text-center">
        <span className="text-4xl font-bold" style={{ color: color }}>
          {normalizedScore < 0 ? '***' : normalizedScore.toFixed(0)}
        </span>
        <span className="text-lg text-textMuted dark:text-textMutedDark font-medium">/ 100</span>
      </div>
    </div>
  );
};
export default GaugeChart;
