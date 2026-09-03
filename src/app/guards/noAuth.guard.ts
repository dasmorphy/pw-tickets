import { Inject, Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard {

  constructor(private router: Router,  @Inject(DOCUMENT) private document: Document) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const user_storage: any = localStorage.getItem('sb_token');
    let themeLink = this.document.getElementById('app-theme') as HTMLLinkElement;
    themeLink.href = 'lara-' + 'light' + '-blue' + '.css';
    localStorage.setItem('theme', 'light')
    localStorage.removeItem('notifications_zentinel')

    if (user_storage) {
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}
