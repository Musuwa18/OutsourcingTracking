import React from 'react';
import { CompetencyRatings } from '../types';

interface RadarChartProps {
  ratings: CompetencyRatings;
  size?: number;
  showLabels?: boolean;
}

interface AxisPoint {
  key: keyof CompetencyRatings;
  label: string;
  pillar: string;
  angle: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  ratings,
  size = 360,
  showLabels = true,
}) => {
  const center = size / 2;
  const radius = size * 0.38;

  const axes: AxisPoint[] = [
    { key: 'qualityOfWork', label: 'Kualitas', pillar: 'Kualitas', angle: 0 },
    { key: 'quantityOfWork', label: 'Kuantitas', pillar: 'Kualitas', angle: (2 * Math.PI) / 11 * 1 },
    { key: 'timeManagement', label: 'Manajemen Waktu', pillar: 'Kualitas', angle: (2 * Math.PI) / 11 * 2 },
    { key: 'initiative', label: 'Inisiatif', pillar: 'Sikap', angle: (2 * Math.PI) / 11 * 3 },
    { key: 'accountability', label: 'Tanggung Jawab', pillar: 'Sikap', angle: (2 * Math.PI) / 11 * 4 },
    { key: 'punctuality', label: 'Kedisiplinan', pillar: 'Sikap', angle: (2 * Math.PI) / 11 * 5 },
    { key: 'teamwork', label: 'Kerja Tim', pillar: 'Interpersonal', angle: (2 * Math.PI) / 11 * 6 },
    { key: 'communication', label: 'Komunikasi', pillar: 'Interpersonal', angle: (2 * Math.PI) / 11 * 7 },
    { key: 'customerOrientation', label: 'Layanan Pengguna', pillar: 'Interpersonal', angle: (2 * Math.PI) / 11 * 8 },
    { key: 'adaptability', label: 'Adaptasi', pillar: 'Adaptabilitas', angle: (2 * Math.PI) / 11 * 9 },
    { key: 'problemSolving', label: 'Pemecahan Masalah', pillar: 'Adaptabilitas', angle: (2 * Math.PI) / 11 * 10 },
  ];

  // Helper to calculate coordinates
  const getCoordinates = (angle: number, valueRatio: number) => {
    // offset angle so 1st axis points directly up (-PI/2)
    const adjustedAngle = angle - Math.PI / 2;
    const x = center + radius * valueRatio * Math.cos(adjustedAngle);
    const y = center + radius * valueRatio * Math.sin(adjustedAngle);
    return { x, y };
  };

  // Concentric polygon background levels (1 to 5)
  const levels = [1, 2, 3, 4, 5];

  // Actual data polygon
  const actualPolygonPoints = axes
    .map((axis) => {
      const val = ratings[axis.key] || 1;
      const ratio = val / 5;
      const { x, y } = getCoordinates(axis.angle, ratio);
      return `${x},${y}`;
    })
    .join(' ');

  // Benchmark target 4.0 points (standard expected baseline)
  const targetPolygonPoints = axes
    .map((axis) => {
      const { x, y } = getCoordinates(axis.angle, 4.0 / 5);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible select-none"
      >
        {/* Background Web Grid */}
        {levels.map((lvl) => {
          const ratio = lvl / 5;
          const points = axes
            .map((axis) => {
              const { x, y } = getCoordinates(axis.angle, ratio);
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <g key={lvl}>
              <polygon
                points={points}
                fill={lvl === 5 ? 'rgba(241, 245, 249, 0.3)' : 'none'}
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-200 dark:text-slate-800"
              />
              <text
                x={center}
                y={center - radius * ratio + 10}
                className="text-[9px] fill-slate-400 font-mono"
                textAnchor="middle"
              >
                {lvl}
              </text>
            </g>
          );
        })}

        {/* Axis Lines */}
        {axes.map((axis) => {
          const { x, y } = getCoordinates(axis.angle, 1);
          return (
            <line
              key={axis.key}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 3"
              className="text-slate-200 dark:text-slate-800"
            />
          );
        })}

        {/* Benchmark 4.0 polygon */}
        <polygon
          points={targetPolygonPoints}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          opacity="0.8"
        />

        {/* Actual polygon filled */}
        <polygon
          points={actualPolygonPoints}
          fill="rgba(99, 102, 241, 0.22)"
          stroke="#6366f1"
          strokeWidth="2"
          className="transition-all duration-300"
        />

        {/* Vertex dots */}
        {axes.map((axis) => {
          const val = ratings[axis.key] || 1;
          const { x, y } = getCoordinates(axis.angle, val / 5);
          return (
            <circle
              key={axis.key}
              cx={x}
              cy={y}
              r="3.5"
              fill="#4f46e5"
              stroke="#ffffff"
              strokeWidth="1.5"
              className="dark:stroke-slate-900"
            />
          );
        })}

        {/* Labels around perimeter */}
        {showLabels &&
          axes.map((axis) => {
            const { x, y } = getCoordinates(axis.angle, 1.2);
            const val = ratings[axis.key] || 1;

            return (
              <g key={`lbl-${axis.key}`}>
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-medium fill-slate-700 dark:fill-slate-300"
                >
                  {axis.label}
                </text>
                <text
                  x={x}
                  y={y + 11}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[9px] font-mono font-semibold fill-indigo-600 dark:fill-indigo-400"
                >
                  {val.toFixed(1)}★
                </text>
              </g>
            );
          })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-500/30 border border-indigo-600 inline-block" />
          <span className="text-slate-600 dark:text-slate-400">Skor Staf Aktual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0 border-t border-dashed border-slate-400 inline-block" />
          <span className="text-slate-500">Standar Target (4.0★)</span>
        </div>
      </div>
    </div>
  );
};
