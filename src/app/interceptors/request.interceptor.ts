import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Observable } from 'rxjs';
import { v4 as uuidv4} from 'uuid';


export const httpInterceptorRequest: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  if (req.url.includes('/rest/token-api/v1.0/generate')) return next(req)
  if (req.url.includes('/rest/zent-logbook-api/v1.0/post/logbook-out')) return next(req)
  if (req.url.includes('/rest/zent-logbook-api/v1.0/blacklist-driver') && req.method == 'POST') return next(req)
  if (req.url.includes('/rest/zent-logbook-api/v1.0/post/logbook-entry')) return next(req)
  if (req.url.includes('/rest/zent-logbook-api/v1.0/import-orders')) return next(req)
  if (req.url.includes('/rest/zent-dispatch-api/v1.0/entry-access') && (req.method == 'POST' || req.method == 'PATCH')) return next(req)
  if (req.url.includes('/rest/zent-dispatch-api/v1.0/dispatch') && (req.method == 'POST' || req.method == 'PATCH')) return next(req)
  if (req.url.includes('/rest/zent-dispatch-api/v1.0/reception') && (req.method == 'POST')) return next(req)
    
  let token = "";
  let idGroup = ""
  const user_session = localStorage.getItem('sb_token');
  let  urlPath: any;

  if (req.url != '/assets/encryption_key/public_key_prod.pem') {
    urlPath = new URL(req.url)?.pathname
  }

  if (user_session){
    // const user_session_json: any = JSON.parse(decrypt(user_session));
    token = user_session
    // idGroup = user_session_json?.groups[0]?.id
  }

  const body = req.method !== 'GET' && req.method !== 'DELETE'
    ? req.body instanceof FormData
      ? req.body
      : { ...(req.body || {}), channel: "TLSG_WEB", externalTransactionId: uuidv4() }
    : req.body;

  const clone = req.clone({
    setHeaders: {
      Token: token,
      channel: 'TLSG_WEB',
      externalTransactionId: uuidv4()
    },
    body
  });

  return next(clone)
}
