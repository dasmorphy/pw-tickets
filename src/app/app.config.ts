import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { httpInterceptorResponse } from './interceptors/response.interceptor';
import { httpInterceptorRequest } from './interceptors/request.interceptor';
import { environment } from "src/environments/environment.development";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(),
    withInterceptors([httpInterceptorRequest, httpInterceptorResponse]).ɵproviders,
    {
      provide: MessageService,
      useClass: MessageService
    },
    provideMessaging(() => getMessaging()),
  ]
};
