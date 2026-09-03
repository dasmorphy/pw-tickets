import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "src/environments/environment.development";

@Injectable({
    providedIn: 'root'
})
export class ProjectTechnicalService {
    private readonly http = inject(HttpClient);

    getProjectsTechnical(filter?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filter?.start_date) {
            params = params.set('start_date', filter.start_date);
        }

        if (filter?.end_date) {
            params = params.set('end_date', filter.end_date);
        }

        if (filter?.status) {
            params = params.set('status', filter.status);
        }

        if (filter?.client_id) {
            params = params.set('client_id', filter.client_id);
        }

        if (filter && Object.prototype.hasOwnProperty.call(filter, 'support') &&
            filter.support !== null
        ) {
            params = params.set('support', filter.support);
        }

        if (filter?.status) {
            params = params.set('status', filter.status);
        }

        return this.http.get(`${environment.apiTechnical}/rest/technical-control-api/v1.0/project`,
            { headers, params }
        )
    }

    updateStatusProject(data: any) {
        return this.http.patch(`${environment.apiTechnical}/rest/technical-control-api/v1.0/update-status-project/${data.id_project}`, {data});
    }

    getAuditingTechnical(filter?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filter?.start_date) {
            params = params.set('start_date', filter.start_date);
        }

        if (filter?.end_date) {
            params = params.set('end_date', filter.end_date);
        }

        if (filter?.locations) {
            params = params.set('locations', filter.locations);
        }

        if (filter?.clients) {
            params = params.set('clients', filter.clients);
        }

        if (filter?.tasks) {
            params = params.set('tasks', filter.tasks);
        }

        return this.http.get(`${environment.apiTechnical}/rest/technical-control-api/v1.0/auditing`,
            { headers, params }
        )
    }

    getAuditingSections() {
        return this.http.get(
            `${environment.apiTechnical}/rest/technical-control-api/v1.0/auditing-sections`
        );
    }

    postAuditing(formData: FormData) {
        return this.http.post(
            `${environment.apiTechnical}/rest/technical-control-api/v1.0/auditing`,
            formData
        );
    }

    generateTechnicalRecordPdf(id_record: number) {
        const params = new HttpParams().set('id-record', id_record)
        return this.http.get(`${environment.apiTechnical}/rest/technical-control-api/v1.0/technical_record/pdf`, 
            {
                params,
                responseType: 'blob',
                observe: 'response'
            }
        )
    }

    getResumeGraphsTechnical(filter?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filter?.start_date) {
            params = params.set('start_date', filter.start_date);
        }

        if (filter?.end_date) {
            params = params.set('end_date', filter.end_date);
        }

        return this.http.get(`${environment.apiTechnical}/rest/technical-control-api/v1.0/resume-graphs`,
            { headers, params }
        )
    }

    deleteTechnicalRecord(id_record: number) {
        return this.http.delete(`${environment.apiTechnical}/rest/technical-control-api/v1.0/technical_record/${id_record}`)
    }

    deleteTechnicalProject(id_task: number) {
        return this.http.delete(`${environment.apiTechnical}/rest/technical-control-api/v1.0/project/${id_task}`)
    }
}
