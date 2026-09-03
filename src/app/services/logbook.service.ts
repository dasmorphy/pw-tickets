import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { environment } from 'src/environments/environment.development';

@Injectable({
    providedIn: 'root'
})
export class LogbookService {
    private readonly http = inject(HttpClient);
    private readonly messageService = inject(MessageService);

    categories: WritableSignal<any[]> = signal<any[]>([]);
    authorized: WritableSignal<any[]> = signal<any[]>([]);
    destinyIntern: WritableSignal<any[]> = signal<any[]>([]);
    unitiesWeight: WritableSignal<any[]> = signal<any[]>([]);
    showModalSummary: WritableSignal<any> = signal<any>(null);

    openSummary(datLogbook: any) {
        this.showModalSummary.set(datLogbook);
    }

    closeSummary() {
        this.showModalSummary.set(null);
    }

    getAllCategories() {
        this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/allCategories`)
            .subscribe({
                next: (data: any) => {
                    this.categories.set(data?.data || []);
                },
                error: ({ error }: any) => this.onError(error.message)
            })
    }

    getGroupBusinessBySector(id_sector: number) {
        return this.http.get(
            `${environment.apiUrl}/rest/zent-logbook-api/v1.0/group-business-by-sector/${id_sector}`,
        );
    }

    getAllAuthorized() {
        this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/allAuthorized`)
            .subscribe({
                next: (data: any) => {
                    this.authorized.set(data?.data || []);
                },
                error: ({ error }: any) => this.onError(error.message)
            })
    }

    getAllDestinyIntern(filter?: any) {
        let headers = new HttpHeaders();

        if (filter?.business) {
            headers = headers.set('business', filter?.business)
        }

        this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/allDestinyIntern`, {headers})
            .subscribe({
                next: (data: any) => {
                    this.destinyIntern.set(data?.data || []);
                },
                error: (error: any) => {
                    console.log(error)
                    this.onError(error?.message ?? 'Error al obtener los destinos')
                }
            })
    }

    getAllUnitiesWeight() {
        this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/allUnitiesWeight`)
            .subscribe({
                next: (data: any) => {
                    this.unitiesWeight.set(data?.data || []);
                },
                error: ({ error }: any) => this.onError(error.message)
            })
    }

    saveLogbookEntry(formData: FormData) {
        const headers = new HttpHeaders().set('Token', localStorage.getItem('sb_token') || '');
        return this.http.post(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/post/logbook-entry`,
            formData,
            { headers }
        );
    }


    saveLogbookOut(formData: FormData) {
        const headers = new HttpHeaders().set('Token', localStorage.getItem('sb_token') || '');
        return this.http.post(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/post/logbook-out`, formData, { headers });
    }

    getHistoryLogbook(filter?: any) {
        console.log('filter', filter)
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

        if (filter?.ids_categories) {
            headers = headers.set('ids-categories', filter?.ids_categories)
        }

        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/history-logbook`,
            { headers, params }
        )
    }

    getAllLogbooks(filter?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filter?.user) {
            params = params.set('user', filter.user);
        }

        if (filter?.start_date) {
            params = params.set('start_date', filter.start_date);
        }

        if (filter?.end_date) {
            params = params.set('end_date', filter.end_date);
        }

        if (filter?.groups_business_id) {
            headers = headers.set('groups-business-id', filter?.groups_business_id)
        }

        if (filter?.workday) {
            headers = headers.set('workday', filter?.workday)
        }

        if (filter?.sectors) {
            headers = headers.set('sectors', filter?.sectors)
        }

        if (filter?.ids_categories) {
            headers = headers.set('ids-categories', filter?.ids_categories)
        }

        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/all-logbooks`,
            { headers, params }
        )
    }

    getAllLogbooksPaginated(filter?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filter?.start_date) {
            params = params.set('start_date', filter.start_date);
        }

        if (filter?.end_date) {
            params = params.set('end_date', filter.end_date);
        }

        if (filter?.first) {
            params = params.set('first', filter.first);
        }

        if (filter?.rows) {
            params = params.set('rows', filter.rows);
        }

        if (filter?.search) {
            params = params.set('search', filter.search);
        }

        if (filter?.groups_business_id) {
            headers = headers.set('groups-business-id', filter?.groups_business_id)
        }

        if (filter?.workday) {
            headers = headers.set('workday', filter?.workday)
        }

        if (filter?.sectors) {
            headers = headers.set('sectors', filter?.sectors)
        }

        if (filter?.ids_categories) {
            headers = headers.set('ids-categories', filter?.ids_categories)
        }

        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/all-logbooks-paginated`,
            { headers, params }
        )
    }

    getReportHistory(filter?: any) {
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

        if (filter?.workday) {
            headers = headers.set('workday', filter?.workday)
        }

        if (filter?.sectors) {
            headers = headers.set('sectors', filter?.sectors)
        }

        if (filter?.ids_categories) {
            headers = headers.set('ids-categories', filter?.ids_categories)
        }


        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/generate_report_history`,
            {
                headers, params,
                responseType: 'blob',
                observe: 'response'
            }
        )
    }

    getGenerateReportExcel() {
        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/generate_report`,
            {
                responseType: 'blob',
                observe: 'response'
            }
        )
    }

    getGenerateReportPdf() {
        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/get/generate_report_pdf`,
            {
                responseType: 'blob',
                observe: 'response'
            }
        );
    }

    deleteLogbook(id_logbook: number, type_logbook: string) {
        let params = new HttpParams();

        if (id_logbook) {
            params = params.set('id-logbook', id_logbook);
        }

        if (type_logbook) {
            params = params.set('type-logbook', type_logbook);
        }

        return this.http.delete(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/delete/logbook`,
            { params }
        )
    }

    getLeads() {
        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/register-leads`)
    }

    onError(message: string) {
        this.messageService.add({
            life: 5000,
            severity: 'error',
            summary: 'Error',
            detail: message
        });
    }


}