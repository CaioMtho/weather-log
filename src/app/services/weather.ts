import { Injectable } from '@angular/core';
import { Firestore, collection, query, orderBy, limit, where, 
         getDocs } from '@angular/fire/firestore';
import { WeatherFilter, WeatherReading } from '../models/reading.model';

@Injectable({
  providedIn: 'root',
})
export class Weather {
  constructor(private firestore: Firestore) {}

  async getHistory(filters?: WeatherFilter): Promise<WeatherReading[]> {
    const readingsRef = collection(this.firestore, 'leituras');
    let q = query(readingsRef, orderBy('timestamp', 'desc'), limit(100));

    if (filters) {
      const constraints = [];

      if (filters.startDate) {
        constraints.push(where('timestamp', '>=', filters.startDate));
      }

      if (filters.endDate) {
        constraints.push(where('timestamp', '<=', filters.endDate));
      }

      if (constraints.length > 0) {
        q = query(readingsRef, ...constraints, orderBy('timestamp', 'desc'), limit(100));
      }
    }

    const snapshot = await getDocs(q);

    let readings = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        temperature: data['temp'],
        humidity: data['humidity'],
        timestamp: new Date(data['timestamp']),
        deviceId: data['topic']
      } as WeatherReading;
    });

    // filtros adicionais
    if (filters) {
      if (filters.minTemp !== undefined) {
        readings = readings.filter(r => r.temperature >= filters.minTemp!);
      }
      if (filters.maxTemp !== undefined) {
        readings = readings.filter(r => r.temperature <= filters.maxTemp!);
      }
      if (filters.minHumidity !== undefined) {
        readings = readings.filter(r => r.humidity >= filters.minHumidity!);
      }
      if (filters.maxHumidity !== undefined) {
        readings = readings.filter(r => r.humidity <= filters.maxHumidity!);
      }
    }

    return readings;
  }

  async getTodayStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const readings = await this.getHistory({
      startDate: today,
      endDate: new Date()
    });

    if (readings.length === 0) {
      return null;
    }

    const temps = readings.map(r => r.temperature);
    const humidities = readings.map(r => r.humidity);

    return {
      count: readings.length,
      avgTemp: this.average(temps),
      minTemp: Math.min(...temps),
      maxTemp: Math.max(...temps),
      avgHumidity: this.average(humidities),
      minHumidity: Math.min(...humidities),
      maxHumidity: Math.max(...humidities)
    };
  }

  private average(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
