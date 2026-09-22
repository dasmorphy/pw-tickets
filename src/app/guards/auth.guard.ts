import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {

  constructor(private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {

    const token = localStorage.getItem('sb_token');
    const theme = localStorage.getItem('theme');

    if (!theme) {
      localStorage.setItem('theme', 'light')
    }

    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }

    // validar que no sea JSON
    try {
      JSON.parse(token);
      localStorage.removeItem('sb_token');
      this.router.navigate(['/login']);
      return false;
    } catch {
      // si falla, es string normal
    }

    return true;
  }
}