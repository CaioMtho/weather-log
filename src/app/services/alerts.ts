import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, deleteDoc, 
         doc, query, where, getDocs, orderBy, Timestamp, onSnapshot, Query } from '@angular/fire/firestore';
import { Alert, AlertTrigger } from '../models/alert.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { WeatherReading } from '../models/reading.model';

@Injectable({
  providedIn: 'root',
})
export class Alerts {
  private activeAlertsSubject = new BehaviorSubject<AlertTrigger[]>([]);
  public activeAlerts$ = this.activeAlertsSubject.asObservable();

  private triggeredAlertsCount = new BehaviorSubject<number>(0);
  public triggeredAlertsCount$ = this.triggeredAlertsCount.asObservable();

  private userAlertsSubject = new BehaviorSubject<Alert[]>([]);
  public userAlerts$ = this.userAlertsSubject.asObservable();

  private unsubscribeUserAlerts?: () => void;

  constructor(private firestore: Firestore) {}

  async createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const alertsRef = collection(this.firestore, 'alerts');
      const now = new Date();
      
      const docRef = await addDoc(alertsRef, {
        ...alert,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      });

      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
      throw error;
    }
  }

  async updateAlert(id: string, data: Partial<Alert>): Promise<void> {
    try {
      const alertRef = doc(this.firestore, 'alerts', id);
      await updateDoc(alertRef, {
        ...data,
        updatedAt: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Erro ao atualizar alerta:', error);
      throw error;
    }
  }

  async deleteAlert(id: string): Promise<void> {
    try {
      const alertRef = doc(this.firestore, 'alerts', id);
      await deleteDoc(alertRef);
    } catch (error) {
      console.error('Erro ao deletar alerta:', error);
      throw error;
    }
  }

  async getUserAlerts(userId: string): Promise<Alert[]> {
    const alertsRef = collection(this.firestore, 'alerts');
    // Only use where clause, filter and sort in code to avoid needing composite index
    const q = query(
      alertsRef, 
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()['createdAt'].toDate(),
      updatedAt: doc.data()['updatedAt'].toDate()
    } as Alert));

    // Sort by createdAt descending in code
    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  subscribeToUserAlerts(userId: string): Observable<Alert[]> {
    const alertsRef = collection(this.firestore, 'alerts');
    const q = query(alertsRef, where('userId', '==', userId));

    return new Observable(observer => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt'].toDate(),
          updatedAt: doc.data()['updatedAt'].toDate()
        } as Alert));

        // Sort by createdAt descending
        const sortedAlerts = alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        observer.next(sortedAlerts);
      }, (error) => {
        console.error('Erro ao observar alertas:', error);
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  async getActiveAlerts(userId: string): Promise<Alert[]> {
    const alertsRef = collection(this.firestore, 'alerts');
    const q = query(
      alertsRef,
      where('userId', '==', userId),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()['createdAt'].toDate(),
      updatedAt: doc.data()['updatedAt'].toDate()
    } as Alert));
  }

  async checkAlerts(reading: WeatherReading, userId: string): Promise<AlertTrigger[]> {
    const alerts = await this.getActiveAlerts(userId);
    const triggeredAlerts: AlertTrigger[] = [];

    for (const alert of alerts) {
      const value = alert.type === 'temperature' ? reading.temperature : reading.humidity;
      
      if (alert.maxValue !== undefined && value > alert.maxValue) {
        const trigger: AlertTrigger = {
          alertId: alert.id!,
          value,
          type: alert.type,
          condition: 'above',
          timestamp: new Date(),
          acknowledged: false
        };
        triggeredAlerts.push(trigger);
        await this.saveAlertTrigger(trigger);
      }

      if (alert.minValue !== undefined && value < alert.minValue) {
        const trigger: AlertTrigger = {
          alertId: alert.id!,
          value,
          type: alert.type,
          condition: 'below',
          timestamp: new Date(),
          acknowledged: false
        };
        triggeredAlerts.push(trigger);
        await this.saveAlertTrigger(trigger);
      }
    }

    if (triggeredAlerts.length > 0) {
      this.activeAlertsSubject.next(triggeredAlerts);
      this.updateTriggeredCount();
    }

    return triggeredAlerts;
  }

  private async saveAlertTrigger(trigger: AlertTrigger): Promise<void> {
    const triggersRef = collection(this.firestore, 'alert_triggers');
    await addDoc(triggersRef, {
      ...trigger,
      timestamp: Timestamp.fromDate(trigger.timestamp)
    });
  }

  async getAlertTriggers(userId: string, limit: number = 50): Promise<AlertTrigger[]> {
    const triggersRef = collection(this.firestore, 'alert_triggers');
    const alertsRef = collection(this.firestore, 'alerts');
    
    // Query all alerts for this user
    const alertsQuery = query(alertsRef, where('userId', '==', userId));
    const alertsSnapshot = await getDocs(alertsQuery);
    const alertIds = alertsSnapshot.docs.map(doc => doc.id);

    if (alertIds.length === 0) return [];

    // Get all triggers and filter/sort in code to avoid needing composite index
    const triggersQuery = query(
      triggersRef,
      where('alertId', 'in', alertIds)
    );

    const snapshot = await getDocs(triggersQuery);
    const triggers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data()['timestamp'].toDate()
    } as AlertTrigger));

    // Sort by timestamp descending and apply limit in code
    return triggers
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async acknowledgeAlert(triggerId: string): Promise<void> {
    const triggerRef = doc(this.firestore, 'alert_triggers', triggerId);
    await updateDoc(triggerRef, {
      acknowledged: true
    });
    await this.updateTriggeredCount();
  }

  async getUnacknowledgedCount(userId: string): Promise<number> {
    const triggers = await this.getAlertTriggers(userId);
    return triggers.filter(t => !t.acknowledged).length;
  }

  private async updateTriggeredCount(): Promise<void> {
    const currentAlerts = this.activeAlertsSubject.value;
    const unacknowledged = currentAlerts.filter(a => !a.acknowledged).length;
    this.triggeredAlertsCount.next(unacknowledged);
  }

  getAlertIcon(type: 'temperature' | 'humidity'): string {
    return type === 'temperature' ? 'thermometer-outline' : 'water-outline';
  }

  getAlertColor(condition: 'above' | 'below'): string {
    return condition === 'above' ? 'danger' : 'warning';
  }

  formatAlertMessage(alert: Alert, trigger: AlertTrigger): string {
    const typeLabel = alert.type === 'temperature' ? 'Temperatura' : 'Umidade';
    const unit = alert.type === 'temperature' ? '�C' : '%';
    const condition = trigger.condition === 'above' ? 'acima' : 'abaixo';
    const limit = trigger.condition === 'above' ? alert.maxValue : alert.minValue;
    
    return `${typeLabel} ${condition} do limite de ${limit}${unit}. Valor atual: ${trigger.value.toFixed(1)}${unit}`;
  }
}