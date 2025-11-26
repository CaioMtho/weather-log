import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonIcon, IonList, IonItem, IonLabel, IonToggle,
  IonInput, IonSelect, IonSelectOption, IonFab,
  IonFabButton, IonModal, IonButtons, IonSpinner,
  IonRefresher, IonRefresherContent, IonBadge, IonItemSliding,
  IonItemOptions, IonItemOption, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  addOutline, thermometerOutline, waterOutline, 
  trashOutline, createOutline, closeOutline,
  notificationsOutline, logOutOutline, alertCircleOutline
} from 'ionicons/icons';
import { Alerts } from '../../services/alerts';
import { Auth } from '../../services/auth';
import { Alert } from '../../models/alert.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.page.html',
  styleUrls: ['./alerts.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, 
    FormsModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonList, IonItem, IonLabel, IonToggle,
    IonInput, IonSelect, IonSelectOption, IonFab, IonFabButton,
    IonModal, IonButtons, IonSpinner, IonRefresher, IonRefresherContent,
    IonBadge, IonItemSliding, IonItemOptions, IonItemOption
  ]
})
export class AlertsPage implements OnInit, OnDestroy {
  alerts: Alert[] = [];
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  editingAlert: Alert | null = null;
  triggeredCount: number = 0;

  newAlert: Partial<Alert> = {
    name: '',
    type: 'temperature',
    isActive: true
  };

  private alertCountSubscription?: Subscription;

  constructor(
    private alertsService: Alerts,
    private authService: Auth,
    private alertController: AlertController
  ) {
    addIcons({
      addOutline,
      thermometerOutline,
      waterOutline,
      trashOutline,
      createOutline,
      closeOutline,
      notificationsOutline,
      logOutOutline,
      alertCircleOutline
    });
  }

  ngOnInit() {
    this.loadAlerts();
    this.subscribeToAlertCount();
  }

  ngOnDestroy() {
    this.alertCountSubscription?.unsubscribe();
  }

  private subscribeToAlertCount() {
    this.alertCountSubscription = this.alertsService.triggeredAlertsCount$.subscribe(
      count => {
        this.triggeredCount = count;
      }
    );
  }

  async loadAlerts() {
    this.isLoading = true;
    try {
      const userId = this.authService.getCurrentUserId();
      if (userId) {
        this.alerts = await this.alertsService.getUserAlerts(userId);
        const count = await this.alertsService.getUnacknowledgedCount(userId);
        this.triggeredCount = count;
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async handleRefresh(event: any) {
    await this.loadAlerts();
    event.target.complete();
  }

  openModal(alert?: Alert) {
    if (alert) {
      this.editingAlert = alert;
      this.newAlert = { ...alert };
    } else {
      this.editingAlert = null;
      this.newAlert = {
        name: '',
        type: 'temperature',
        isActive: true
      };
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingAlert = null;
    this.newAlert = {
      name: '',
      type: 'temperature',
      isActive: true
    };
  }

  async saveAlert() {
    const userId = this.authService.getCurrentUserId();
    if (!userId || !this.newAlert.name) return;

    try {
      if (this.editingAlert?.id) {
        await this.alertsService.updateAlert(this.editingAlert.id, this.newAlert);
      } else {
        await this.alertsService.createAlert({
          ...this.newAlert as Alert,
          userId
        });
      }
      
      await this.loadAlerts();
      this.closeModal();
    } catch (error) {
      console.error('Erro ao salvar alerta:', error);
    }
  }

  async deleteAlert(alert: Alert) {
    const confirm = await this.alertController.create({
      header: 'Confirmar Exclus�o',
      message: `Deseja realmente excluir o alerta "${alert.name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: async () => {
            try {
              if (alert.id) {
                await this.alertsService.deleteAlert(alert.id);
                await this.loadAlerts();
              }
            } catch (error) {
              console.error('Erro ao excluir alerta:', error);
            }
          }
        }
      ]
    });

    await confirm.present();
  }

  async toggleAlert(alert: Alert, event: any) {
    const isActive = event.detail.checked;
    try {
      if (alert.id) {
        await this.alertsService.updateAlert(alert.id, { isActive });
        alert.isActive = isActive;
      }
    } catch (error) {
      console.error('Erro ao atualizar alerta:', error);
      event.target.checked = !isActive;
    }
  }

  getAlertIcon(type: 'temperature' | 'humidity'): string {
    return this.alertsService.getAlertIcon(type);
  }

  getAlertDescription(alert: Alert): string {
    const unit = alert.type === 'temperature' ? '�C' : '%';
    const parts = [];

    if (alert.minValue !== undefined) {
      parts.push(`M�n: ${alert.minValue}${unit}`);
    }
    if (alert.maxValue !== undefined) {
      parts.push(`M�x: ${alert.maxValue}${unit}`);
    }

    return parts.join(' | ');
  }

  isFormValid(): boolean {
    return !!(
      this.newAlert.name &&
      (this.newAlert.minValue !== undefined || this.newAlert.maxValue !== undefined)
    );
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    }
  }
}