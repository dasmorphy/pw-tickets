import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, NgZone, WritableSignal, effect, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.development';
import { v4 as uuidv4} from 'uuid';

@Injectable({
    providedIn: 'root'
})
export class EventSourceService {
    constructor(private zone: NgZone) {}

    connect(retryCount: number): Observable<any> {
        const external_transaction_id = uuidv4();
        const url_connect = `${environment.apiUrl}/rest/zent-live-server-api/v1.0/get/live-server/all-logbooks?externalTransactionId=${external_transaction_id}&channel=ZENTINEL_WEB`;
        let isConnected = false;
        const maxRetries = 5;

        return new Observable(observer => {

            const eventSource = new EventSource(url_connect);

            eventSource.onopen = (event: any) => {
                isConnected = true;
            };

            eventSource.onmessage = (event) => {
                this.zone.run(() => {
                    console.log(event)
                    observer.next(JSON.parse(event.data));
                });
            };

            eventSource.onerror = (error) => {
                this.zone.run(() => {
                    observer.error(error);
                });

                if (retryCount >= maxRetries) {
                    console.error('Intentos excedidos')
                } else {
                    if (!isConnected) {
                        setTimeout(() => {
                            this.connect(retryCount + 1);
                        }, 3000);
                    }
                }
            };

            return () => {
                eventSource.close();
            };
        })



    }

    connectEntries(retryCount: number): Observable<any> {
        const external_transaction_id = uuidv4();
        const url_connect = `${environment.apiUrl}/rest/zent-live-server-api/v1.0/live-server/all-entries?externalTransactionId=${external_transaction_id}&channel=ZENTINEL_WEB`;
        let isConnected = false;
        const maxRetries = 5;

        return new Observable(observer => {

            const eventSource = new EventSource(url_connect);

            eventSource.onopen = (event: any) => {
                isConnected = true;
            };

            eventSource.onmessage = (event) => {
                this.zone.run(() => {
                    console.log(event)
                    observer.next(JSON.parse(event.data));
                });
            };

            eventSource.onerror = (error) => {
                this.zone.run(() => {
                    observer.error(error);
                });

                if (retryCount >= maxRetries) {
                    console.error('Intentos excedidos')
                } else {
                    if (!isConnected) {
                        setTimeout(() => {
                            this.connect(retryCount + 1);
                        }, 3000);
                    }
                }
            };

            return () => {
                eventSource.close();
            };
        })
    }


    connectDispatch(retryCount: number): Observable<any> {
        const external_transaction_id = uuidv4();
        const url_connect = `${environment.apiUrl}/rest/zent-live-server-api/v1.0/live-server/all-dispatches?externalTransactionId=${external_transaction_id}&channel=ZENTINEL_WEB`;
        let isConnected = false;
        const maxRetries = 5;

        return new Observable(observer => {

            const eventSource = new EventSource(url_connect);

            eventSource.onopen = (event: any) => {
                isConnected = true;
            };

            eventSource.onmessage = (event) => {
                this.zone.run(() => {
                    console.log(event)
                    observer.next(JSON.parse(event.data));
                });
            };

            eventSource.onerror = (error) => {
                this.zone.run(() => {
                    observer.error(error);
                });

                if (retryCount >= maxRetries) {
                    console.error('Intentos excedidos')
                } else {
                    if (!isConnected) {
                        setTimeout(() => {
                            this.connect(retryCount + 1);
                        }, 3000);
                    }
                }
            };

            return () => {
                eventSource.close();
            };
        })



    }

}