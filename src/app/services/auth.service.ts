import { HttpClient } from '@angular/common/http';
import { Injectable, WritableSignal, effect, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { environment } from 'src/environments/environment.development';
import { UtilsService } from './utils.service';
import { Router } from '@angular/router';
import { UserService } from './user.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private utilsService = inject(UtilsService);
    private userService = inject(UserService);
    private readonly router = inject(Router)
    private readonly http = inject(HttpClient);
    user_permissions_signal: WritableSignal<string[]>= signal([]);

    
    signIn(data: any) {
        return this.http.post(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/post/login`, {
            login: data
        });
    }

    logout() {
        const token = localStorage.getItem('sb_token');
        this.http.post(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/post/logout`, {
            logout: { token }
        }).subscribe({
            next: (data: any) => console.log(data),
            error: (error: any) => console.log(error)
        });
        localStorage.removeItem('sb_token');
        this.router.navigate(['/login']);
    }

    setPermissionsUser(permissions: string[]) {
        this.user_permissions_signal.set(permissions);
    }
}