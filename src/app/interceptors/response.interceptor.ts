import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, Observable, throwError } from 'rxjs';


export const httpInterceptorResponse: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const router = inject(Router)
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: any) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        localStorage.removeItem('sb_token')
        router.navigate(['/']);

        if (!req.url.includes('/rest/zent-logbook-api/v1.0/post/login')) {
          messageService.add({
            severity: 'warn',
            summary: 'Aviso',
            detail: 'Sesión finalizada'
          })
        }
      } 

      return throwError(() => error);
    
    })
  );
}