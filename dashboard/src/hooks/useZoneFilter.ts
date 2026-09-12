"use client";

import { useState, useMemo } from 'react';
import { useRealtime } from './useRealtime';

export type StatusFilterOption =
  | 'all'
  | 'online'
  | 'offline'
  | 'gaps'
  | 'ml_subsidence'
  | 'ml_noise'
  | 'ml_normal';

export function useZoneFilter() {
  const { readings, nodeStatuses, mlPredictions, activeZones: realtimeActiveZones } = useRealtime();
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');

  // Stable list of all known zones across activeZones, readings, and nodeStatuses
  const allKnownZones = useMemo(() => {
    return Array.from(
      new Set([
        ...realtimeActiveZones,
        ...Object.keys(readings),
        ...Object.keys(nodeStatuses),
        ...Object.keys(mlPredictions || {}),
      ])
    )
      .filter(Boolean)
      .sort();
  }, [realtimeActiveZones, readings, nodeStatuses, mlPredictions]);

  const filteredZones = useMemo(() => {
    const result: Record<string, string[]> = {};

    allKnownZones.forEach(zoneId => {
      if (selectedZone !== 'all' && selectedZone !== zoneId) return;

      const nodesInZone = new Set<string>([
        ...Object.keys(readings[zoneId] || {}),
        ...Object.keys(nodeStatuses[zoneId] || {}),
        ...Object.keys(mlPredictions?.[zoneId] || {}),
      ]);

      const matchingNodes = Array.from(nodesInZone).filter(nodeId => {
        // Query search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesQuery =
            nodeId.toLowerCase().includes(q) || zoneId.toLowerCase().includes(q);
          if (!matchesQuery) return false;
        }

        // Status & ML filter
        const status = nodeStatuses[zoneId]?.[nodeId];
        const isOnline = status?.status === 'online';
        const hasGaps = (status?.gapCount || 0) > 0;
        const ml = mlPredictions?.[zoneId]?.[nodeId];

        if (statusFilter === 'online' && !isOnline) return false;
        if (statusFilter === 'offline' && isOnline) return false;
        if (statusFilter === 'gaps' && !hasGaps) return false;
        if (statusFilter === 'ml_subsidence') {
          const isSubsidence =
            ml?.anomaly_class === 'subsidence_risk' ||
            ml?.alert_level === 'RED' ||
            ml?.alert_level === 'ORANGE';
          if (!isSubsidence) return false;
        }
        if (statusFilter === 'ml_noise') {
          if (ml?.anomaly_class !== 'equipment_noise') return false;
        }
        if (statusFilter === 'ml_normal') {
          if (ml?.anomaly_class !== 'normal') return false;
        }

        return true;
      });

      if (matchingNodes.length > 0 || (selectedZone === zoneId && !searchQuery)) {
        result[zoneId] = matchingNodes.sort();
      }
    });

    return result;
  }, [readings, nodeStatuses, mlPredictions, allKnownZones, selectedZone, searchQuery, statusFilter]);

  return {
    selectedZone,
    setSelectedZone,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredZones,
    activeZones: allKnownZones,
  };
}
