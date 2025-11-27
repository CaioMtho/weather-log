import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: Auth,
    private router: Router
  ) {}

  canActivate(): boolean {
    const isLoggedIn = this.authService.isLoggedIn();
    
    if (isLoggedIn) {
      // Se está logado e tenta ir para home, redireciona para dashboard
      this.router.navigate(['/dashboard']);
      return false;
    } else {
      // Se não está logado, permite acesso à home (que mostrará login)
      return true;
    }
  }
}
