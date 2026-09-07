import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class GlpiService {
    private readonly http = inject(HttpClient);


    getTickets() {
        let params = new HttpParams().set('endpoint', 'Ticket?sort=date&order=DESC&expand_dropdowns=true');

        return this.http.get('http://localhost:2127/rest/proxy-glpi-api/v1.0/glpi-by-pass', {
            params: params
        });
    }
    
}