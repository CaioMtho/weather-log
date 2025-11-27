import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonCard, IonCardContent, IonInput, 
  IonButton, IonList, IonItem, IonText, IonIcon,
  IonSpinner, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudCircleOutline } from 'ionicons/icons';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardContent, IonInput, 
    IonButton, IonList, IonItem, IonText, IonIcon,
    IonSpinner, CommonModule, FormsModule, RouterModule
  ]
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  isLoading = false;

  constructor(
    private authService: Auth,
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({ cloudCircleOutline });
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    }
  }

  async login() {
    if (!this.email || !this.password) {
      this.presentToast('Por favor, preencha todos os campos.', 'danger');
      return;
    }

    this.isLoading = true;
    try {
      await this.authService.login(this.email, this.password);
      this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (error: any) {
      console.error('Erro de login:', error);
      const message = error.message || 'Falha ao realizar login. Verifique suas credenciais.';
      this.presentToast(message, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color,
    });
    toast.present();
  }
}
