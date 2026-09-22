import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment.development";

@Injectable({
    providedIn: 'root'
})
export class GlpiService {
    private readonly http = inject(HttpClient);


    getTickets(first: number, rows: number) {
        const end = first + rows - 1;
        let params = new HttpParams().set('endpoint', `Ticket?sort=date&order=DESC&expand_dropdowns=true&range=${first}-${end}`);

        return this.http.get(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/glpi-by-pass`, {
            params,
            observe: 'response'
        });
    }

    getDetailTicket(id_ticket: number) {
        let params = new HttpParams().set('endpoint', `Ticket/${id_ticket}?with_documents=true&expand_dropdowns=true&get_hateoas=false`);

        return this.http.get(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/glpi-by-pass`, {
            params,
            observe: 'response'
        });
    }

    downloadDocument(documentId: number): Observable<Blob> {
        let params = new HttpParams().set('endpoint', `Document/${documentId}?alt=media`);

        return this.http.get(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/generate-document-glpi`, {
            params,
            responseType: 'blob'
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
        return this.http.post(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/register-technical`, {data})
    }

    updateTicketTechnical(data: any) {
        return this.http.put(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/register-technical`, {data})
    }

    saveTicketCommercial(data: any) {
        return this.http.post(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/register-commercial`, {data})
    }

    updateTicketCommercial(data: any) {
        return this.http.put(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/register-commercial`, {data})
    }

    saveTicketFinancial(data: any) {
        return this.http.post(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/register-financial`, {data})
    }

    getTicketsTechnical(filters: any) {
        let params = new HttpParams();

        if (filters?.page !== undefined && filters?.page !== null) {
            params = params.set('page', filters.page + 1);
        }

        if (filters?.page_size !== undefined && filters?.page_size !== null) {
            params = params.set('page_size', filters.page_size);
        }

        if (filters?.pending_commercial) {
            params = params.set('pending_commercial', filters.pending_commercial);
        }

        if (filters?.ticket_technical_id) {
            params = params.set('ticket_technical_id', filters.ticket_technical_id);
        }

        return this.http.get(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/register-technical`, 
            {params}
        );
    }

    getTicketsCommercial(filters?: any) {
        let params = new HttpParams();

        if (filters?.page !== undefined && filters?.page !== null) {
            params = params.set('page', filters.page);
        }

        if (filters?.page_size !== undefined && filters?.page_size !== null) {
            params = params.set('page_size', filters.page_size);
        }

        if (filters?.is_registred) {
            params = params.set('is_registred', filters.is_registred);
        }

        if (filters?.pending_financial) {
            params = params.set('pending_financial', filters.pending_financial);
        }

        if (filters?.ticket_commercial_id) {
            params = params.set('ticket_commercial_id', filters.ticket_commercial_id);
        }

        return this.http.get(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/register-commercial`, {
            params
        });
    }

    getCommercialTypeSolution() {
        return this.http.get(`${environment.apiTicket}/proxy-glpi-api/v1.0/type-solution`);
    }

    getCommercialStatus() {
        return this.http.get(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/commercial-ticket-status`);
    }

    getCommercialOrigin() {
        return this.http.get(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/commercial-origin`);
    }

    getTicketsFinancial(filters?: any) {
        let params = new HttpParams();

        if (filters?.page !== undefined && filters?.page !== null) {
            params = params.set('page', filters.page);
        }

        if (filters?.page_size !== undefined && filters?.page_size !== null) {
            params = params.set('page_size', filters.page_size);
        }

        return this.http.get(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/register-financial`, {
            params
        });
    }

    approveCommercialTicket(data: any) {
        return this.http.post(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/approve-commercial-ticket`, {data});
    }

    saveFollowup(data: any) {
        return this.http.post(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/followup-commercial`, {data});
    }

    getFollowups(filters?: any) {
        let params = new HttpParams();

        if (filters?.id_commercial) {
            params = params.set('id_commercial', filters.id_commercial);
        }

        if (filters?.user) {
            params = params.set('user', filters.user);
        }

        return this.http.get(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/followup-commercial`, {
            params
        });
    }

    getAreaTicketHistory(ticketId: number | string) {
        return this.http.get(`${environment.apiTicket}/rest/proxy-glpi-api/v1.0/history-area-ticket/${ticketId}`);
    }
    
}
