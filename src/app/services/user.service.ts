import { Injectable, WritableSignal, effect, inject, signal } from '@angular/core';
import { UtilsService } from './utils.service';
import { jwtDecode } from "jwt-decode";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment.development';

@Injectable({
    providedIn: 'root'
})
export class UserService {

    private utilsService = inject(UtilsService);
    private readonly http = inject(HttpClient);

    user_storage: WritableSignal<any> = signal({})

    
    setUserStorage(json_user: any) {
        this.user_storage.set(json_user);
    }

    getDataSession() {
        const token = localStorage.getItem('sb_token');
        if (token) {
            return jwtDecode(token);
        }
        return {};
    }

    getUsers(filters?: any) {
        const headers = new HttpHeaders({
            roles: filters?.roles?.join(',') ?? ''
        });
        return this.http.get(
            `${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/all-users`,
            {headers}
        )
    }
}