import { Injectable } from '@angular/core';
import { Firestore, collection, query, orderBy, limit, where, getDocs, Timestamp } from '@angular/fire/firestore';
import { WeatherFilter, WeatherReading } from '../models/reading.model';

@Injectable({
  providedIn: 'root',
})
export class Weather {
  constructor(private firestore: Firestore) {}

  async getHistory(filters?: WeatherFilter): Promise<WeatherReading[]> {
    const readingsRef = collection(this.firestore, 'leituras');
    
    let q = query(readingsRef, orderBy('publishedAt', 'desc'), limit(100));

    if (filters) {
      const constraints = [];

      if (filters.startDate) {
        const startTimestamp = Timestamp.fromDate(filters.startDate);
        constraints.push(where('publishedAt', '>=', startTimestamp));
      }

      if (filters.endDate) {
        const endTimestamp = Timestamp.fromDate(filters.endDate);
        constraints.push(where('publishedAt', '<=', endTimestamp));
      }

      if (constraints.length > 0) {
        q = query(readingsRef, ...constraints, orderBy('publishedAt', 'desc'), limit(100));
      }
    }

    try {
      const snapshot = await getDocs(q);
      console.log('📊 Documentos:', snapshot.size);

      let readings = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Extrair valores do formato REST API
        const temperature = this.extractNumber(data['temperature']);
        const humidity = this.extractNumber(data['humidity']);
        const timestamp = this.extractTimestamp(data['publishedAt']);
        const topic = this.extractString(data['topic']);
        
        return {
          id: doc.id,
          temperature,
          humidity,
          timestamp,
          deviceId: topic
        } as WeatherReading;
      });

      // Filtros no cliente
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

      console.log('✅ Leituras:', readings.length);
      return readings;

    } catch (error) {
      console.error('❌ Erro ao buscar:', error);
      return [];
    }
  }

  async getTodayStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const readings = await this.getHistory({
      startDate: today,
      endDate: new Date()
    });

    console.log('📊 Hoje:', readings.length, 'leituras');

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

  // Helpers para extrair valores do formato REST API
  private extractNumber(field: any): number {
    if (typeof field === 'number') return field;
    if (field?.doubleValue !== undefined) return field.doubleValue;
    if (field?.integerValue !== undefined) return Number(field.integerValue);
    return 0;
  }

  private extractString(field: any): string {
    if (typeof field === 'string') return field;
    if (field?.stringValue !== undefined) return field.stringValue;
    return '';
  }

  private extractTimestamp(field: any): Date {
    // Formato REST API: { timestampValue: "2024-11-27T12:00:00Z" }
    if (field?.timestampValue) {
      return new Date(field.timestampValue);
    }
    
    // Formato normal do Firestore
    if (field?.toDate) {
      return field.toDate();
    }
    
    if (field?.seconds) {
      return new Date(field.seconds * 1000);
    }
    
    return new Date();
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}