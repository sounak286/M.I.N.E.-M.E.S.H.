"use client";

import React, { useState, useCallback } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  ShieldCheck,
  Radio,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { EdgeAlertLevel, EdgeNodeActuatorState } from '@/types/edgeAlert';
import { EDGE_ALERT_CONFIGS } from '@/types/edgeAlert';

interface SosButtonGroupProps {
  nodeId: string;
  zoneId: string;
  actuatorState?: EdgeNodeActuatorState;
  onDispatch: (params: { nodeId: string; zoneId: string; level: EdgeAlertLevel }) => void;
  /** Compact mode for inline use in NodeCard */
  compact?: boolean;
}

const LEVEL_ORDER: EdgeAlertLevel[] = ['CRITICAL', 'WARNING', 'ADVISORY', 'NORMAL'];

const LEVEL_STYLES: Record<
  EdgeAlertLevel,
  {
    bg: string;
    hoverBg: string;
    activeBg: string;
    ring: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
    glow: string;
  }
> = {
  CRITICAL: {
    bg: 'bg-red-600',
    hoverBg: 'hover:bg-red-700',
    activeBg: 'bg-red-700',
    ring: 'ring-red-500/60',
    text: 'text-white',
    icon: ShieldAlert,
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
  },
  WARNING: {
    bg: 'bg-amber-500',
    hoverBg: 'hover:bg-amber-600',
    activeBg: 'bg-amber-600',
    ring: 'ring-amber-400/60',
    text: 'text-white',
    icon: AlertTriangle,
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
  },
  ADVISORY: {
    bg: 'bg-blue-500',
    hoverBg: 'hover:bg-blue-600',
    activeBg: 'bg-blue-600',
    ring: 'ring-blue-400/60',
    text: 'text-white',
    icon: Info,
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
  },
  NORMAL: {
    bg: 'bg-emerald-500',
    hoverBg: 'hover:bg-emerald-600',
    activeBg: 'bg-emerald-600',
    ring: 'ring-emerald-400/60',
    text: 'text-white',
    icon: ShieldCheck,
    glow: 'shadow-[0_0_16px_rgba(16,185,129,0.35)]',
  },
};

const LED_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-400',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
};

export const SosButtonGroup = React.memo(function SosButtonGroup({
  nodeId,
  zoneId,
  actuatorState,
  onDispatch,
  compact = false,
}: SosButtonGroupProps) {
  const [dispatching, setDispatching] = useState<EdgeAlertLevel | null>(null);

  const handleClick = useCallback(
    (level: EdgeAlertLevel) => {
      setDispatching(level);
      onDispatch({ nodeId, zoneId, level });
      setTimeout(() => setDispatching(null), 1500);
    },
    [nodeId, zoneId, onDispatch],
  );

  const activeLevel = actuatorState?.level;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {/* Compact: Actuator status indicator */}
        {actuatorState ? (
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[#f1f5f9] dark:bg-[#14213d]/50 border border-[#e2e8f0] dark:border-white/10">
            <span
              className={`w-2 h-2 rounded-full ${LED_COLORS[actuatorState.color] || 'bg-gray-400'} ${
                actuatorState.level === 'CRITICAL' ? 'animate-ping' : actuatorState.level === 'WARNING' ? 'animate-pulse' : ''
              }`}
            />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#14213d] dark:text-white/80">
              {actuatorState.level}
            </span>
            {actuatorState.buzzer ? (
              <Volume2 className="w-3 h-3 text-red-500 ml-1" />
            ) : (
              <VolumeX className="w-3 h-3 text-gray-400 ml-1" />
            )}
          </div>
        ) : (
          <span className="text-[10px] font-mono text-[#5c677d] dark:text-[#94a3b8] px-1">AUTO MODE</span>
        )}
      </div>
    );
  }

  // Full-size auto status display
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-[#fca311]" />
        <span className="text-xs font-bold font-mono text-[#14213d] dark:text-white tracking-wider uppercase">
          Edge Anomaly Status
        </span>
        {actuatorState && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span
              className={`w-2.5 h-2.5 rounded-full ${LED_COLORS[actuatorState.color] || 'bg-gray-400'} ${
                actuatorState.level === 'CRITICAL' ? 'animate-ping' : actuatorState.level === 'WARNING' ? 'animate-pulse' : ''
              }`}
            />
            <span className="text-[9px] font-mono text-[#5c677d] dark:text-[#94a3b8] uppercase font-bold">
              {actuatorState.level} • {actuatorState.acknowledged ? '✓ ACK' : '⏳ Pending'}
            </span>
          </div>
        )}
      </div>

      {/* Buzzer Status */}
      {actuatorState && (
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#5c677d] dark:text-[#94a3b8]">
          {actuatorState.buzzer ? (
            <>
              <Volume2 className="w-3 h-3 text-red-500" />
              <span>Buzzer: <strong className="text-red-600 dark:text-red-400 uppercase">{actuatorState.buzzerMode}</strong></span>
            </>
          ) : (
            <>
              <VolumeX className="w-3 h-3 text-emerald-500" />
              <span>Buzzer: <strong className="text-emerald-600 dark:text-emerald-400">OFF</strong></span>
            </>
          )}
          <span className="text-[#d4d4d4] dark:text-[#14213d]">|</span>
          <span>LED: <strong className="uppercase">{actuatorState.color} {actuatorState.ledPattern}</strong></span>
        </div>
      )}
    </div>
  );
});
