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
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardContent, IonInput, 
    IonButton, IonList, IonItem, IonText, IonIcon,
    IonSpinner, CommonModule, FormsModule, RouterModule
  ]
})
export class RegisterPage implements OnInit {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
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

  passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  async register() {
    if (!this.fullName || !this.email || !this.password || !this.confirmPassword) {
      this.presentToast('Por favor, preencha todos os campos.', 'danger');
      return;
    }

    if (!this.passwordsMatch()) {
      this.presentToast('As senhas não coincidem.', 'danger');
      return;
    }

    this.isLoading = true;
    try {
      await this.authService.register(this.email, this.password);
      this.presentToast('Cadastro realizado com sucesso! Faça login para continuar.', 'success');
      this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error: any) {
      console.error('Erro de registro:', error);
      const message = error.message || 'Falha ao realizar o cadastro. Tente novamente.';
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
