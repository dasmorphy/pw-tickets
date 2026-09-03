import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ToastModule,
    CheckboxModule,
    DividerModule,
  ],
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.sass'],
  encapsulation: ViewEncapsulation.None
})
export class SigninComponent implements OnInit {

  private utilsService = inject(UtilsService);
  private authService = inject(AuthService);
  private readonly router = inject(Router)
  private readonly notificationService = inject(NotificationService)

  email: string = '';
  password: string = '';
  isLoading: boolean = false;

  constructor(
    
  ) {}


  ngOnInit(){
    
  }

  ngOnDestroy() {

  }

  onInputPassword($event: any) {
    this.password = $event.target.value;
  }

  async onSubmit() {
    try {
      if (!this.email || !this.password) {
        this.utilsService.onWarn('Campos vacíos');
        return;
      }
      
      this.isLoading = true;
      const fcm_token = await this.notificationService.getFcmToken();
  
      const data = {
        user: this.email,
        password: this.password,
        fcm_token: fcm_token,
        platform: 'web',
        project_id: 1,
      }
  
      this.authService.signIn(data).subscribe({
        next: (data: any) => {
          this.isLoading = false;
          localStorage.setItem('sb_token', data?.access_token)
          this.router.navigate(['/dashboard']);
          this.notificationService.loadNotifications(true)
          // this.notificationService.requestPermissionAndListen()
        },
        error: (error: any) => {
          this.isLoading = false;
          console.log(error);
          const message = error?.error?.message ?? 'Error al iniciar sesión'
          this.utilsService.onError(message)
        }
      })
    } catch (error) {
      console.error('Error al ininiciar sesión')
      this.utilsService.onError('No se pudo inciciar sesioó, favpr intente nuevamente')
    }

    
    // setTimeout(() => {
    //   this.authService.signIn(this.email, this.password);
    //   this.isLoading = false;
    // }, 3500);
  }

}

