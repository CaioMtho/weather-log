import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  alertOutline,
  barChartOutline,
  calendarOutline
} from 'ionicons/icons';
import { Alerts } from '../../services/alerts';
import { Auth } from '../../services/auth';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tab-menu',
  templateUrl: './tab-menu.component.html',
  styleUrls: ['./tab-menu.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonBadge
  ]
})
export class TabMenuComponent {
  triggeredAlertsCount$: Observable<number>;
  currentPath: string = '';

  constructor(
    private alertsService: Alerts,
    private authService: Auth,
    private router: Router
  ) {
    addIcons({
      homeOutline,
      alertOutline,
      barChartOutline,
      calendarOutline
    });

    this.triggeredAlertsCount$ = this.alertsService.triggeredAlertsCount$;
    this.router.events.subscribe(() => {
      this.currentPath = this.router.url;
    });
  }

  isActive(path: string): boolean {
    return this.currentPath.includes(path);
  }
}
