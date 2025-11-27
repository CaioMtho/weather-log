import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { TabMenuComponent } from './components/tab-menu/tab-menu.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    CommonModule,
    IonApp,
    IonRouterOutlet,
    RouterModule,
    TabMenuComponent
  ],
})
export class AppComponent {
  showTabBar: boolean = true;

  constructor(private router: Router) {
    this.router.events.subscribe(() => {
      const hiddenPages = ['/login', '/register', '/forgot-password', '/home'];
      this.showTabBar = !hiddenPages.some(page => this.router.url.startsWith(page));
    });
  }
}
