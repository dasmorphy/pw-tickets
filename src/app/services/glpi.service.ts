import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class GlpiService {
    private readonly http = inject(HttpClient);


    getTickets(first: number, rows: number) {
        const end = first + rows - 1;
        let params = new HttpParams().set('endpoint', `Ticket?sort=date&order=DESC&expand_dropdowns=true&range=${first}-${end}`);

        return this.http.get('http://localhost:2127/rest/proxy-glpi-api/v1.0/glpi-by-pass', {
            params: params,
            observe: 'response'
        });
    }

    getDetailTicket(id_ticket: number) {
        let params = new HttpParams().set('endpoint', `Ticket/${id_ticket}?with_documents=true&expand_dropdowns=true&get_hateoas=false`);

        return this.http.get('http://localhost:2127/rest/proxy-glpi-api/v1.0/glpi-by-pass', {
            params: params,
            observe: 'response'
        });
    }
    
}