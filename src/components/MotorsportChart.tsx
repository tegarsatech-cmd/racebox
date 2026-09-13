import React from 'react';
import { GPSTrackPoint } from '../types';
import { convertSpeed } from '../utils';

interface MotorsportChartProps {
  gpsTrack: GPSTrackPoint[];
  unit: 'KMH' | 'MPH';
  type: 'distance' | 'time';
}

export const MotorsportChart: React.FC<MotorsportChartProps> = ({ gpsTrack, unit, type }) => {
  if (!gpsTrack || gpsTrack.length < 2) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-card-border bg-[#0e1017] p-4 text-center">
        <p className="text-sm text-text-dim font-tech">Data GPS tidak cukup untuk menampilkan grafik</p>
      </div>
    );
  }

  // Width and height of SVG viewport
  const width = 600;
  const height = 240;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Extract X and Y data points
  const points = gpsTrack.map((pt) => {
    const yVal = convertSpeed(pt.speed, unit); // speed in display unit
    const xVal = type === 'distance' ? pt.cumulativeDistance : pt.timestamp / 1000; // in meters or seconds
    return { x: xVal, y: yVal };
  });

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);

  const minX = 0;
  const maxX = Math.max(...xValues, 1);
  const minY = 0;
  const maxY = Math.max(...yValues, 20) * 1.1; // Add 10% headroom

  // Helper to map actual coordinates to SVG viewport pixels
  const getX = (val: number) => {
    return paddingLeft + ((val - minX) / (maxX - minX)) * chartWidth;
  };

  const getY = (val: number) => {
    return height - paddingBottom - ((val - minY) / (maxY - minY)) * chartHeight;
  };

  // Generate SVG path string
  let pathD = '';
  points.forEach((pt, idx) => {
    const x = getX(pt.x);
    const y = getY(pt.y);
    if (idx === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
    }
  });

  // Highlight Max Point
  const maxIdx = yValues.indexOf(Math.max(...yValues));
  const maxPt = points[maxIdx];

  // Grid Lines
  const xGridTicks = 5;
  const yGridTicks = 4;

  const xTicks = Array.from({ length: xGridTicks }, (_, i) => minX + (maxX - minX) * (i / (xGridTicks - 1)));
  const yTicks = Array.from({ length: yGridTicks }, (_, i) => minY + (maxY - minY) * (i / (yGridTicks - 1)));

  return (
    <div className="w-full rounded-xl border border-card-border bg-[#0d0e14] p-4 font-sans shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-bold tracking-wider text-text-dim uppercase font-orbitron">
          {type === 'distance' ? 'GRAFIK: KECEPATAN vs JARAK' : 'GRAFIK: KECEPATAN vs WAKTU'}
        </h4>
        <div className="flex items-center gap-2 text-xs font-tech text-[#00ff66]">
          <span className="h-2 w-2 rounded-full bg-[#00ff66] animate-pulse"></span>
          <span>Sumbu Y: {unit}</span>
          <span className="text-text-dim">|</span>
          <span className="text-brand-orange">Sumbu X: {type === 'distance' ? 'Meter' : 'Detik'}</span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          id={`chart-${type}`}
        >
          {/* Background grid lines */}
          {yTicks.map((yVal, i) => {
            const y = getY(yVal);
            return (
              <g key={`y-grid-${i}`} className="opacity-20">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#1e2230"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="#8b949e"
                  fontSize="9"
                  textAnchor="end"
                  className="font-tech font-bold"
                >
                  {yVal.toFixed(0)}
                </text>
              </g>
            );
          })}

          {xTicks.map((xVal, i) => {
            const x = getX(xVal);
            return (
              <g key={`x-grid-${i}`} className="opacity-20">
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={height - paddingBottom}
                  stroke="#1e2230"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={height - paddingBottom + 16}
                  fill="#8b949e"
                  fontSize="9"
                  textAnchor="middle"
                  className="font-tech font-bold"
                >
                  {xVal.toFixed(1)}{type === 'distance' ? 'm' : 's'}
                </text>
              </g>
            );
          })}

          {/* Subtitle labels on Axes */}
          <text
            x={paddingLeft + chartWidth / 2}
            y={height - 8}
            fill="#8b949e"
            fontSize="10"
            textAnchor="middle"
            className="font-tech uppercase tracking-widest text-[8px] opacity-60"
          >
            {type === 'distance' ? 'Jarak (Meter)' : 'Waktu (Detik)'}
          </text>

          <text
            x={12}
            y={height / 2}
            fill="#8b949e"
            fontSize="10"
            textAnchor="middle"
            transform={`rotate(-90 12 ${height / 2})`}
            className="font-tech uppercase tracking-widest text-[8px] opacity-60"
          >
            Kecepatan ({unit})
          </text>

          {/* Solid Axes lines */}
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="#1e2230"
            strokeWidth="1.5"
          />
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={height - paddingBottom}
            stroke="#1e2230"
            strokeWidth="1.5"
          />

          {/* Main Chart Line Area and Stroke */}
          {/* Subtle Area Fill */}
          {points.length > 0 && (
            <path
              d={`${pathD} L ${getX(points[points.length - 1].x)} ${getY(0)} L ${getX(points[0].x)} ${getY(0)} Z`}
              fill={type === 'distance' ? 'url(#orange-grad)' : 'url(#green-grad)'}
              opacity="0.15"
            />
          )}

          {/* Main Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke={type === 'distance' ? 'var(--color-brand-orange)' : 'var(--color-neon-green)'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={type === 'distance' ? 'neon-glow-orange' : 'neon-glow-green'}
          />

          {/* Max Value Indicator circle & callout */}
          {maxPt && (
            <g>
              <circle
                cx={getX(maxPt.x)}
                cy={getY(maxPt.y)}
                r="5"
                fill={type === 'distance' ? 'var(--color-brand-orange)' : 'var(--color-neon-green)'}
                stroke="#090a0f"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(maxPt.x)}
                cy={getY(maxPt.y)}
                r="10"
                fill="none"
                stroke={type === 'distance' ? 'var(--color-brand-orange)' : 'var(--color-neon-green)'}
                strokeWidth="1"
                className="animate-ping"
                opacity="0.5"
              />
              
              {/* Tooltip callout */}
              <g transform={`translate(${Math.min(getX(maxPt.x), width - 110)}, ${Math.max(getY(maxPt.y) - 25, paddingTop + 5)})`}>
                <rect
                  x="-35"
                  y="-14"
                  width="70"
                  height="18"
                  rx="3"
                  fill="#12141d"
                  stroke="#1e2230"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-2"
                  fill="#ffffff"
                  fontSize="9"
                  textAnchor="middle"
                  className="font-tech font-bold"
                >
                  MAX: {maxPt.y.toFixed(1)} {unit}
                </text>
              </g>
            </g>
          )}

          {/* Linear gradients definitions */}
          <defs>
            <linearGradient id="orange-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-orange)" />
              <stop offset="100%" stopColor="var(--color-brand-orange)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="green-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-neon-green)" />
              <stop offset="100%" stopColor="var(--color-neon-green)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
