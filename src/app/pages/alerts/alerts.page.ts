import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonButton, IonIcon, IonToggle, IonItem, IonLabel,
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
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.page.html',
  styleUrls: ['./alerts.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, 
    FormsModule, IonButton, IonIcon, IonToggle, IonItem, IonLabel,
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
  saveError: string = '';

  newAlert: Partial<Alert> = {
    name: '',
    type: 'temperature',
    isActive: true
  };

  private alertCountSubscription?: Subscription;
  private userAlertsSubscription?: Subscription;

  constructor(
    private alertsService: Alerts,
    private authService: Auth,
    private alertController: AlertController,
    private toastController: ToastController
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
    this.userAlertsSubscription?.unsubscribe();
  }

  private subscribeToAlertCount() {
    this.alertCountSubscription = this.alertsService.triggeredAlertsCount$.subscribe(
      count => {
        this.triggeredCount = count;
      }
    );
  }

  private subscribeToUserAlerts(userId: string) {
    this.userAlertsSubscription?.unsubscribe();
    this.userAlertsSubscription = this.alertsService.subscribeToUserAlerts(userId).subscribe(
      alerts => {
        this.alerts = alerts;
        this.isLoading = false;
      },
      error => {
        console.error('Erro ao carregar alertas em tempo real:', error);
        this.isLoading = false;
      }
    );
  }

  async loadAlerts() {
    this.isLoading = true;
    try {
      const userId = this.authService.getCurrentUserId();
      if (userId) {
        // Subscribe to real-time updates
        this.subscribeToUserAlerts(userId);
        
        const count = await this.alertsService.getUnacknowledgedCount(userId);
        this.triggeredCount = count;
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      this.isLoading = false;
      this.showToast('Erro ao carregar alertas', 'danger');
    }
  }

  async handleRefresh(event: any) {
    try {
      const userId = this.authService.getCurrentUserId();
      if (userId) {
        this.alerts = await this.alertsService.getUserAlerts(userId);
        const count = await this.alertsService.getUnacknowledgedCount(userId);
        this.triggeredCount = count;
      }
    } catch (error) {
      console.error('Erro ao atualizar alertas:', error);
      this.showToast('Erro ao atualizar alertas', 'danger');
    } finally {
      event.target.complete();
    }
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
        isActive: true,
        minValue: undefined,
        maxValue: undefined
      };
    }
    this.saveError = '';
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
    this.saveError = '';
  }

  async saveAlert() {
    // Validation
    if (!this.newAlert.name || !this.newAlert.name.trim()) {
      this.saveError = 'Nome do alerta é obrigatório';
      return;
    }

    if (this.newAlert.minValue === undefined && this.newAlert.maxValue === undefined) {
      this.saveError = 'Defina pelo menos um limite (mínimo ou máximo)';
      return;
    }

    if (this.newAlert.minValue !== undefined && this.newAlert.maxValue !== undefined) {
      if (this.newAlert.minValue >= this.newAlert.maxValue) {
        this.saveError = 'O limite mínimo deve ser menor que o máximo';
        return;
      }
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    try {
      this.saveError = '';
      if (this.editingAlert?.id) {
        await this.alertsService.updateAlert(this.editingAlert.id, this.newAlert);
        this.showToast('Alerta atualizado com sucesso', 'success');
      } else {
        await this.alertsService.createAlert({
          ...this.newAlert as Alert,
          userId
        });
        this.showToast('Alerta criado com sucesso', 'success');
      }
      
      this.closeModal();
    } catch (error) {
      console.error('Erro ao salvar alerta:', error);
      this.saveError = 'Erro ao salvar alerta. Tente novamente.';
      this.showToast('Erro ao salvar alerta', 'danger');
    }
  }

  async deleteAlert(alert: Alert) {
    const confirm = await this.alertController.create({
      header: 'Confirmar Exclusão',
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
                this.showToast('Alerta excluído com sucesso', 'success');
              }
            } catch (error) {
              console.error('Erro ao excluir alerta:', error);
              this.showToast('Erro ao excluir alerta', 'danger');
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
        this.showToast(
          isActive ? 'Alerta ativado' : 'Alerta desativado',
          'success'
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar alerta:', error);
      event.target.checked = !isActive;
      this.showToast('Erro ao atualizar alerta', 'danger');
    }
  }

  getAlertIcon(type: 'temperature' | 'humidity'): string {
    return this.alertsService.getAlertIcon(type);
  }

  getAlertDescription(alert: Alert): string {
    const unit = alert.type === 'temperature' ? '°C' : '%';
    const parts = [];

    if (alert.minValue !== undefined) {
      parts.push(`Mín: ${alert.minValue}${unit}`);
    }
    if (alert.maxValue !== undefined) {
      parts.push(`Máx: ${alert.maxValue}${unit}`);
    }

    return parts.join(' | ');
  }

  isFormValid(): boolean {
    return !!(
      this.newAlert.name &&
      this.newAlert.name.trim() &&
      (this.newAlert.minValue !== undefined || this.newAlert.maxValue !== undefined) &&
      this.saveError === ''
    );
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    }
  }
}