import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "src/environments/environment.development";
import { v4 as uuidv4} from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class PurchaseOrderService {
    private readonly http = inject(HttpClient);
    
    getPurchaseOrderReceipts(filters?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filters?.withoutOrder) {
            params = params.set('without-order', filters?.withoutOrder);
        }

        if (filters?.start_date) {
            params = params.set('start_date', filters.start_date);
        }

        if (filters?.end_date) {
            params = params.set('end_date', filters.end_date);
        }

        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/purchase-order-receipts`,
            { headers, params }
        )
    }

    getBlacklist(filter?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filter?.dni) {
            params = params.set('dni', filter.dni);
        }

        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/blacklist-driver`,
            { headers, params }
        )
    }

    getReasonRestriction() {
        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/reason_restriction`);
    }

    deleteBlacklist(id: number) {
        let params = new HttpParams();

        if (id) {
            params = params.set('id-blacklist', id);
        }


        return this.http.delete(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/blacklist-driver`,
            { params }
        )
    }

    saveBlacklist(formData: FormData) {
        const headers = new HttpHeaders().set('Token', localStorage.getItem('sb_token') || '');
        return this.http.post(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/blacklist-driver`, formData, { headers });
    }

    updatePurchaseOrder(data: any, id_order: number) {
        const headers = new HttpHeaders().set('Token', localStorage.getItem('sb_token') || '');
        return this.http.patch(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/update-purchase-order/${id_order}`, data, { headers });
    }

    getAllPurchaseOrders(filter?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filter?.withoutReceipts) {
            params = params.set('without-receipts', filter.withoutReceipts);
        }

        if (filter?.start_date) {
            params = params.set('start_date', filter.start_date);
        }

        if (filter?.end_date) {
            params = params.set('end_date', filter.end_date);
        }

        if (filter?.destiny_id) {
            params = params.set('destiny_id', filter?.destiny_id)
        }

        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/purchase-order`,
            { headers, params }
        )
    }

    savePurchaseOrder(order: any) {
        const headers = new HttpHeaders().set('Token', localStorage.getItem('sb_token') || '');
        return this.http.post(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/purchase-order`, {order}, { headers });
    }

    assignReceiptsToOrder(data: any) {
        return this.http.patch(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/assign-order-to-receipt`, {data});
    }

    uploadExcelOrders(formData: FormData) {
        let headers = new HttpHeaders().set('Token', localStorage.getItem('sb_token') || '');
        headers = headers.set('channel', 'ZENTINEL_WEB');
        headers = headers.set('externalTransactionId', uuidv4());
        return this.http.post(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/import-orders`, formData, { headers });
    }

    excelOrders(filter?: any) {
        let params = new HttpParams();
        let headers = new HttpHeaders();

        if (filter?.start_date) {
            params = params.set('start_date', filter.start_date);
        }

        if (filter?.end_date) {
            params = params.set('end_date', filter.end_date);
        }

        if (filter?.destiny_id) {
            params = params.set('destiny_id', filter?.destiny_id)
        }

        return this.http.get(`${environment.apiUrl}/rest/zent-logbook-api/v1.0/report_orders`,
            {
                headers, params,
                responseType: 'blob',
                observe: 'response'
            }
        )
    }
}