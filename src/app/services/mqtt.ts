import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { WeatherReading } from '../models/reading.model';

@Injectable({
  providedIn: 'root',
})
export class Mqtt {
  private client: MqttClient | null = null;
  private currentReadingSubject = new BehaviorSubject<WeatherReading | null>(null);
  public currentReading$ = this.currentReadingSubject.asObservable();
  
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private readonly BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
  private readonly TOPIC = 'wokwi/weather';
  private readonly API_URL = 'https://firestore.googleapis.com/v1/projects/weather-log-mqtt/databases/(default)/documents/leituras';
  private readonly API_KEY = 'AIzaSyBarUxa26oz1n15Gxw73p2JtF9p-CcK3Hc';

  constructor(private http: HttpClient) {}

  connect(): void {
    if(this.client && this.client.connected) {
      console.log('✅ Já conectado ao MQTT');
      return;
    }

    console.log('🔌 Conectando ao HiveMQ...');

    const mqttLib: any = (mqtt as any)?.default ?? mqtt;
    this.client = mqttLib.connect(this.BROKER_URL, {
      clientId: 'weather-app-'+ Math.random().toString(16).substr(2, 8),
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    });

    this.client!.on('connect', () => {
      console.log('✅ Conectado ao HiveMQ!');
      this.connectionStatusSubject.next(true);

      this.client!.subscribe(this.TOPIC, { qos: 0}, (err) => {
        if (err) {
          console.error('❌ Erro ao inscrever:', err);
        } else {
          console.log('✅ Inscrito no tópico:', this.TOPIC);
        }
      });
    });

    this.client!.on('message', async (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📥 MQTT:', data);

        // Criar timestamp AQUI (no cliente) com hora correta
        const now = new Date();

        // Criar objeto de leitura
        const reading: WeatherReading = {
          temperature: data.temperature,
          humidity: data.humidity,
          timestamp: now  // ← Timestamp do CLIENTE (correto!)
        };

        console.log('📊 Leitura:', `${reading.temperature}°C ${reading.humidity}% às ${now.toLocaleTimeString()}`);

        // Atualizar UI em tempo real
        this.currentReadingSubject.next(reading);

        // Salvar no Firestore COM timestamp correto
        await this.saveToFirebase(topic, data, now);

      } catch (error) {
        console.error('❌ Erro ao processar:', error);
      }
    });

    this.client!.on('error', (error) => {
      console.error('❌ Erro MQTT:', error);
      this.connectionStatusSubject.next(false);
    });

    this.client!.on('close', () => {
      console.log('⚠️  Conexão fechada');
      this.connectionStatusSubject.next(false);
    });

    this.client!.on('reconnect', () => {
      console.log('🔄 Reconectando...');
    });
  }

  private async saveToFirebase(topic: string, data: any, timestamp: Date): Promise<void> {
    try {
      // Payload no formato REST API do Firestore
      const payload = {
        fields: {
          topic: { stringValue: topic },
          temperature: { doubleValue: data.temperature },
          humidity: { doubleValue: data.humidity },
          publishedAt: { timestampValue: timestamp.toISOString() }  // ← Timestamp correto!
        }
      };

      console.log('💾 Salvando com timestamp:', timestamp.toISOString());

      const url = `${this.API_URL}?key=${this.API_KEY}`;
      const response = await lastValueFrom(
        this.http.post(url, payload)
      );

      console.log('✅ Salvo no Firestore');
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      // Não bloquear UI
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connectionStatusSubject.next(false);
      console.log('👋 Desconectado');
    }
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  getCurrentReading(): WeatherReading | null {
    return this.currentReadingSubject.value;
  }
}