export interface Alert {
  id?: string;
  userId: string;
  name: string;
  type: 'temperature' | 'humidity';
  minValue?: number;
  maxValue?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertTrigger {
  id?: string;
  alertId: string;
  value: number;
  type: 'temperature' | 'humidity';
  condition: 'above' | 'below';
  timestamp: Date;
  acknowledged: boolean;
}