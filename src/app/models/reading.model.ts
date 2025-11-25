export interface WeatherReading {
  id?: string;
  temperature: number;
  humidity: number;
  timestamp: Date | any;
  deviceId?: string;
}

export interface WeatherFilter {
  startDate?: Date;
  endDate?: Date;
  minTemp?: number;
  maxTemp?: number;
  minHumidity?: number;
  maxHumidity?: number;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt?: Date;
}