export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertRule {
  id: string;
  name: string;
  sensorType: string;
  operator: '>' | '<' | '==' | '>=';
  threshold: number;
  unit: string;
  severity: AlertSeverity;
  description: string;
}

export interface SubsidenceAlert {
  id: string;
  nodeId: string;
  zoneId: string;
  sensorType: string;
  value: number;
  threshold: number;
  unit: string;
  severity: AlertSeverity;
  timestamp: string;
  message: string;
  resolved?: boolean;
}
