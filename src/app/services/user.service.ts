import { Injectable, WritableSignal, effect, inject, signal } from '@angular/core';
import { UtilsService } from './utils.service';
import { jwtDecode } from "jwt-decode";

@Injectable({
    providedIn: 'root'
})
export class UserService {

    private utilsService = inject(UtilsService);

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
}