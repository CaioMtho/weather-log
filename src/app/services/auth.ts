import { Injectable } from '@angular/core';
import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, 
         signOut, sendPasswordResetEmail, User, authState } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  user$: Observable<User | null>;

    constructor(
    private auth: FirebaseAuth,
    private router: Router
  ) {
    this.user$ = authState(this.auth);
    
    this.user$.subscribe(user => {
      if (user) {
        console.log('Usuário autenticado:', user.email);
      } else {
        console.log('Usuário não autenticado');
      }
    });
  }

  async login(email: string, password: string): Promise<any> {
    try{
      const credential = await signInWithEmailAndPassword(this.auth, email, password);

      console.log('Login bem sucedido');
      await this.router.navigate(['/dashboard']);
      return credential;
    }catch(error) {
      console.error('Erro no login:', error);
      throw this.handleError(error);
    }
  }

  async register(email: string, password: string): Promise<any> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);

      console.log('Registro bem sucedido');
      await this.router.navigate(['/dashboard']);
      return credential;
    }catch(error) {
      console.error('Erro no registro:', error);
      throw this.handleError(error);
    }
  }

  async resetPassowrd(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      console.log('Email de recuperação enviado');
    }catch(error) {
      console.error('Erro ao enviar email: ', error);
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      const userEmail = this.auth.currentUser?.email;
      await signOut(this.auth);
      console.log(`Usuário ${userEmail} deslogado com sucesso`);
      await this.router.navigate(['/login']);
    }catch(error) {
      console.error('Erro ao deslogar: ', error);
      throw this.handleError(error);
    }
  }

  isLoggedIn(): boolean {
    return this.auth.currentUser !== null;
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  isEmailVerified(): boolean {
    return this.auth.currentUser?.emailVerified || false;
  }

  async reloadUser(): Promise<void> {
    if(this.auth.currentUser) {
      await this.auth.currentUser.reload();
    }
  }

    private handleError(error: any): string {
    let message = 'Ocorreu um erro';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Este e-mail já está em uso';
        break;
      case 'auth/invalid-email':
        message = 'E-mail inválido';
        break;
      case 'auth/operation-not-allowed':
        message = 'Operação não permitida';
        break;
      case 'auth/weak-password':
        message = 'Senha muito fraca. Use pelo menos 6 caracteres';
        break;
      case 'auth/user-disabled':
        message = 'Usuário desabilitado';
        break;
      case 'auth/user-not-found':
        message = 'Usuário não encontrado';
        break;
      case 'auth/wrong-password':
        message = 'Senha incorreta';
        break;
      case 'auth/invalid-credential':
        message = 'Credenciais inválidas';
        break;
      case 'auth/too-many-requests':
        message = 'Muitas tentativas. Tente novamente mais tarde';
        break;
      case 'auth/network-request-failed':
        message = 'Erro de rede. Verifique sua conexão';
        break;
      default:
        message = error.message || 'Erro desconhecido';
    }
    
    return message;
  }
}
