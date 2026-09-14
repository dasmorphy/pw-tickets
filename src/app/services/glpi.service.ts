import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "src/environments/environment.development";

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

        return this.http.get('http://192.168.230.61:2127/rest/proxy-glpi-api/v1.0/glpi-by-pass', {
            params: params,
            observe: 'response'
        });
    }

    getClients() {
        return this.http.get(`${environment.apiTechnical}/rest/technical-control-api/v1.0/clients`);
    }

    getLocationsClient(id_client: number) {
        return this.http.get(`${environment.apiTechnical}/rest/technical-control-api/v1.0/location`, {
            params: new HttpParams().set('client_id', id_client)
        });
    }

    saveTicketTechnical(data: any) {
        return this.http.post(`http://localhost:2127/rest/proxy-glpi-api/v1.0/register-technical`, {data})
    }

    getTicketsTechnical(filters: any) {
        let params = new HttpParams();

        if (filters?.page) {
            params.set('page', filters.page);
        }

        if (filters?.page_size) {
            params.set('page_size', filters.page_size);
        }

        return this.http.get('http://localhost:2127/rest/proxy-glpi-api/v1.0/register-technical', 
            {params}
        );
    }
    
}