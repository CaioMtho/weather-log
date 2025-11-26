import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
// Import the default package so both CommonJS/UMD and ESM builds resolve
// correctly with various bundlers (Vite sometimes resolves to mqtt.js which
// doesn't expose a named `connect` export). Use default and call `.connect`.
import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import { BehaviorSubject, Observable, lastValueFrom } from 'rxjs';
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
  private readonly API_URL = 'https://weather-log-h9e5c2r2l-caiomathol.vercel.app/api/mqtt-handler';

  constructor(private http: HttpClient) {}

  connect(): void {
    if(this.client && this.client.connected) {
      console.log('Já conectado ao MQTT');
      return;
    }

    console.log('Conectando ao HiveMq...');

    const mqttLib: any = (mqtt as any)?.default ?? mqtt;
    this.client = mqttLib.connect(this.BROKER_URL, {
      clientId: 'weather-app-'+ Math.random().toString(16).substr(2, 8),
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    });

    this.client!.on('connect', () => {
      console.log('Conectado ao HiveMq');
      this.connectionStatusSubject.next(true);

      this.client!.subscribe(this.TOPIC, { qos: 0}, (err) => {
        if (err) {
          console.error('Erro ao se inscrever no tópico:', err);
        } else {
          console.log('Inscrito no tópico:', this.TOPIC);
        }
      });
    });

    this.client!.on('message', async (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Mensagem recebida:', data);

        const reading : WeatherReading = {
          temperature: data.temperature,
          humidity: data.humidity,
          timestamp: new Date(data.timestamp)
        }

        this.currentReadingSubject.next(reading);

        await this.saveToFirebase(topic, data);
      } catch (error) {
        console.error('Erro ao processar a mensagem:', error);
      }
    });

    this.client!.on('error', (error) => {
      console.error('Erro na conexão MQTT:', error);
      this.connectionStatusSubject.next(false);
    });

    this.client!.on('close', () => {
      console.log('Conexão MQTT fechada');
      this.connectionStatusSubject.next(false);
    });

    this.client!.on('reconnect', () => {
      console.log('Reconectando ao HiveMq...');
    });
  }

  private async saveToFirebase(topic: string, data: any): Promise<void> {
    try {
        // toPromise() is deprecated; using lastValueFrom for single-emission HTTP observable
        const response = await lastValueFrom(this.http.post(this.API_URL, { topic, data }));

      console.log('Salvo no firebase')
    }catch (error) {
      console.error('Erro ao salvar no Firebase:', error);
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.connectionStatusSubject.next(false);
      console.log('Desconectado do HiveMq');
    }
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  getCurrentReading(): WeatherReading | null {
    return this.currentReadingSubject.value;
  }
}
