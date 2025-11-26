import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonIcon, IonBadge, IonRefresher, IonRefresherContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  thermometerOutline, waterOutline, cloudOutline, 
  refreshOutline, logOutOutline, wifiOutline, alertCircleOutline 
} from 'ionicons/icons';
import { Mqtt } from '../../services/mqtt';
import { Weather } from '../../services/weather';
import { Auth } from '../../services/auth';
import { WeatherReading } from '../../models/reading.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, 
    FormsModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonBadge, IonRefresher, IonRefresherContent
  ]
})
export class DashboardPage implements OnInit, OnDestroy {
  currentReading: WeatherReading | null = null;
  isConnected: boolean = false;
  todayStats: any = null;
  lastUpdateTime: string = '';
  
  private readingSubscription?: Subscription;
  private connectionSubscription?: Subscription;

  constructor(
    private mqttService: Mqtt,
    private weatherService: Weather,
    private authService: Auth
  ) {
    addIcons({
      thermometerOutline,
      waterOutline,
      cloudOutline,
      refreshOutline,
      logOutOutline,
      wifiOutline,
      alertCircleOutline
    });
  }

  ngOnInit() {
    this.initializeDashboard();
  }

  ngOnDestroy() {
    this.readingSubscription?.unsubscribe();
    this.connectionSubscription?.unsubscribe();
  }

  private initializeDashboard() {
    this.mqttService.connect();

    this.readingSubscription = this.mqttService.currentReading$.subscribe(
      reading => {
        if (reading) {
          this.currentReading = reading;
          this.updateLastUpdateTime();
        }
      }
    );

    this.connectionSubscription = this.mqttService.connectionStatus$.subscribe(
      status => {
        this.isConnected = status;
      }
    );

    this.loadTodayStats();
  }

  private async loadTodayStats() {
    try {
      this.todayStats = await this.weatherService.getTodayStats();
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }

  private updateLastUpdateTime() {
    const now = new Date();
    this.lastUpdateTime = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  async handleRefresh(event: any) {
    await this.loadTodayStats();
    this.updateLastUpdateTime();
    event.target.complete();
  }

  async logout() {
    try {
      this.mqttService.disconnect();
      await this.authService.logout();
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    }
  }

  getTemperatureColor(temp: number): string {
    if (temp < 15) return 'cold';
    if (temp < 25) return 'moderate';
    return 'hot';
  }

  getHumidityColor(humidity: number): string {
    if (humidity < 30) return 'low';
    if (humidity < 60) return 'normal';
    return 'high';
  }
}