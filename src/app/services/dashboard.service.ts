import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, WritableSignal, effect, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { environment } from 'src/environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
    private readonly http = inject(HttpClient);
    private readonly messageService = inject(MessageService);

    getResumeChart(filter?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filter?.start_date) {
            params = params.set('start_date', filter.start_date);
        }

        if (filter?.end_date) {
            params = params.set('end_date', filter.end_date);
        }

        if (filter?.groups_business_id) {
            headers = headers.set('groups-business-id', filter?.groups_business_id)
        }

        if (filter?.sectors) {
            headers = headers.set('sectors', filter?.sectors)
        }

        if (filter?.workday) {
            headers = headers.set('workday', filter?.workday)
        }

        if (filter?.sectors) {
            headers = headers.set('sectors', filter?.sectors)
        }

        return this.http.get(
            `${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/resume_graphs`,
            { headers, params }
        );
    }

    getSectorByBusiness(id_business: number = 0) {
        return this.http.get(
            `${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/sector-by-business/${id_business}`,
        );
    }

    getGroupBusinessByBusiness(id_business: number = 0) {
        return this.http.get(
            `${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/group-business-by-id-business/${id_business}`,
        );
    }


    postFormExpo(lead: any) {
        return this.http.post(
            `${environment.apiUrl}/rest/zent-logbook-api/v1.0/register-leads`,
            {lead}
        );
    }

    graphBlacklistBalanced(filter?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filter?.start_date) {
            params = params.set('start_date', filter.start_date);
        }

        if (filter?.end_date) {
            params = params.set('end_date', filter.end_date);
        }

        return this.http.get(
            `${environment.apiUrl}/rest/zent-logbook-api/v1.0/graphs-blacklist-balanced`,
            { headers, params }
        );
    }

}