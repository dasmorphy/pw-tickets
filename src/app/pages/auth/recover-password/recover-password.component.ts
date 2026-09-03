import { Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from 'src/app/services/auth.service';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [
    CommonModule,
    InputTextModule,
    ButtonModule,
    FormsModule,
    ToastModule
  ],
  templateUrl: './recover-password.component.html',
  styleUrls: ['./recover-password.component.sass']
})
export class RecoverPasswordComponent {
  @ViewChild('submitContinue') submitContinue: ElementRef | undefined;

  private readonly authService = inject(AuthService)
  private readonly router = inject(Router)
  password = signal('');
  
  @HostListener('document:keydown.enter', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    if (this.submitContinue && event.target === this.submitContinue.nativeElement) {
      if(this.recoverEmail.length){
        this.next();
      }
    }
  }

  
  setPassword($event: any) {
    this.password.set($event.value);
  }
  
  get step() {
    return this.authService.recoverPasswordStep;
  }
  
  setTokenRecover($event: any) {
    this.authService.tokenRecover = $event.target.value;
  }

  next() {
    this.authService.nextRecoverPasswordStep();
  }

  prev() {
    this.authService.prevRecoverPasswordStep();
  }

  back(){
    this.authService.recoverEmail = '';
    this.router.navigate(['/']);
  }

  onSubmit() {
    this.authService.resetPassword(this.password());
  }

  get recoverEmail() {
    return this.authService.recoverEmail;
  }

  get ofuscatedEmail() {
    const atIndex = this.authService.recoverEmail.indexOf("@");
    const domain = this.authService.recoverEmail.slice(atIndex);
    const username = this.authService.recoverEmail.slice(0, atIndex);
    const obfuscatedUsername = username.slice(0, 2) + "*".repeat(username.length - 2);
    return obfuscatedUsername + domain;
  }

  onEmailSet($event: any) {
    this.authService.recoverEmail = $event.target.value;
  }
}
