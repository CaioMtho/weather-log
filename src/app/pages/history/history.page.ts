import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonIcon, IonList, IonItem, IonLabel, IonSearchbar,
  IonSelect, IonSelectOption, IonSpinner, IonRefresher,
  IonRefresherContent, IonChip, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  timeOutline, thermometerOutline, waterOutline, 
  filterOutline, calendarOutline, chevronDownOutline,
  logOutOutline
} from 'ionicons/icons';
import { Weather } from '../../services/weather';
import { Auth } from '../../services/auth';
import { WeatherReading, WeatherFilter } from '../../models/reading.model';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, 
    FormsModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonList, IonItem, IonLabel, IonSearchbar,
    IonSelect, IonSelectOption, IonSpinner, IonRefresher,
    IonRefresherContent, IonChip, IonBadge
  ]
})
export class HistoryPage implements OnInit {
  readings: WeatherReading[] = [];
  filteredReadings: WeatherReading[] = [];
  isLoading: boolean = true;
  showFilters: boolean = false;
  
  filters: WeatherFilter = {};
  dateRange: string = 'all';
  
  constructor(
    private weatherService: Weather,
    private authService: Auth
  ) {
    addIcons({
      timeOutline,
      thermometerOutline,
      waterOutline,
      filterOutline,
      calendarOutline,
      chevronDownOutline,
      logOutOutline
    });
  }

  ngOnInit() {
    this.loadHistory();
  }

  async loadHistory() {
    this.isLoading = true;
    try {
      this.readings = await this.weatherService.getHistory(this.filters);
      this.filteredReadings = [...this.readings];
    } catch (error) {
      console.error('Erro ao carregar hist�rico:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async handleRefresh(event: any) {
    await this.loadHistory();
    event.target.complete();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  onDateRangeChange(event: any) {
    const range = event.detail.value;
    const now = new Date();
    
    switch(range) {
      case 'today':
        this.filters.startDate = new Date(now.setHours(0, 0, 0, 0));
        this.filters.endDate = new Date();
        break;
      case 'week':
        this.filters.startDate = new Date(now.setDate(now.getDate() - 7));
        this.filters.endDate = new Date();
        break;
      case 'month':
        this.filters.startDate = new Date(now.setMonth(now.getMonth() - 1));
        this.filters.endDate = new Date();
        break;
      case 'all':
        delete this.filters.startDate;
        delete this.filters.endDate;
        break;
    }
    
    this.applyFilters();
  }

  async applyFilters() {
    await this.loadHistory();
  }

  clearFilters() {
    this.filters = {};
    this.dateRange = 'all';
    this.loadHistory();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTemperatureClass(temp: number): string {
    if (temp < 15) return 'cold';
    if (temp < 25) return 'moderate';
    return 'hot';
  }

  getHumidityClass(humidity: number): string {
    if (humidity < 30) return 'low';
    if (humidity < 60) return 'normal';
    return 'high';
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    }
  }
}