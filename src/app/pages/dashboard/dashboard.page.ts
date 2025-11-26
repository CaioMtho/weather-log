import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonIcon, IonBadge, IonRefresher, IonRefresherContent,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  thermometerOutline, waterOutline, cloudOutline, 
  refreshOutline, logOutOutline, wifiOutline, alertCircleOutline,
  warningOutline
} from 'ionicons/icons';
import { Mqtt } from '../../services/mqtt';
import { Weather } from '../../services/weather';
import { Auth } from '../../services/auth';
import { Alerts } from '../../services/alerts';
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
  activeAlertsCount: number = 0;
  
  private readingSubscription?: Subscription;
  private connectionSubscription?: Subscription;
  private alertCountSubscription?: Subscription;

  constructor(
    private mqttService: Mqtt,
    private weatherService: Weather,
    private authService: Auth,
    private alertsService: Alerts,
    private toastController: ToastController
  ) {
    addIcons({
      thermometerOutline,
      waterOutline,
      cloudOutline,
      refreshOutline,
      logOutOutline,
      wifiOutline,
      alertCircleOutline,
      warningOutline
    });
  }

  ngOnInit() {
    this.initializeDashboard();
  }

  ngOnDestroy() {
    this.readingSubscription?.unsubscribe();
    this.connectionSubscription?.unsubscribe();
    this.alertCountSubscription?.unsubscribe();
  }

  private initializeDashboard() {
    this.mqttService.connect();

    this.readingSubscription = this.mqttService.currentReading$.subscribe(
      async reading => {
        if (reading) {
          this.currentReading = reading;
          this.updateLastUpdateTime();
          await this.checkReadingAlerts(reading);
        }
      }
    );

    this.connectionSubscription = this.mqttService.connectionStatus$.subscribe(
      status => {
        this.isConnected = status;
      }
    );

    this.alertCountSubscription = this.alertsService.triggeredAlertsCount$.subscribe(
      count => {
        this.activeAlertsCount = count;
      }
    );

    this.loadTodayStats();
    this.loadAlertCount();
  }

  private async loadAlertCount() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.activeAlertsCount = await this.alertsService.getUnacknowledgedCount(userId);
    }
  }

  private async checkReadingAlerts(reading: WeatherReading) {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    const triggeredAlerts = await this.alertsService.checkAlerts(reading, userId);
    
    if (triggeredAlerts.length > 0) {
      await this.showAlertToast(triggeredAlerts[0]);
    }
  }

  private async showAlertToast(trigger: any) {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    const alerts = await this.alertsService.getActiveAlerts(userId);
    const alert = alerts.find(a => a.id === trigger.alertId);
    
    if (!alert) return;

    const message = this.alertsService.formatAlertMessage(alert, trigger);
    const color = this.alertsService.getAlertColor(trigger.condition);

    const toast = await this.toastController.create({
      message,
      duration: 5000,
      position: 'top',
      color,
      icon: 'warning-outline',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }

  private async loadTodayStats() {
    try {
      this.todayStats = await this.weatherService.getTodayStats();
    } catch (error) {
      console.error('Erro ao carregar estat�sticas:', error);
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
    await this.loadAlertCount();
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