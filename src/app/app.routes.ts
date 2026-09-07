import { Routes } from '@angular/router';
import { SigninComponent } from './pages/auth/signin/signin.component';
import { LayoutComponent } from './pages/layout/layout.component';
import { LogbookEntryComponent } from './pages/forms/logbook-entry/logbook-entry.component';
import { LogbookOutComponent } from './pages/forms/logbook-out/logbook-out.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NoAuthGuard } from './guards/noAuth.guard';
import { AuthGuard } from './guards/auth.guard';
import { AllLogbookComponent } from './pages/tables/all-logbooks/all-logbooks.component';
import { AllDispatchsComponent } from './pages/tables/all-dispatchs/all-dispatchs.component';
import { AllEntryAccessComponent } from './pages/tables/all-entry-access/all-entry-access.component';
import { PurchaseOrderComponent } from './pages/tables/purchase-order/purchase-order.component';
import { ProjectTechnicalComponent } from './pages/tables/project-technical/project-technical.component';
import { AuditingTechnicalComponent } from './pages/tables/auditing-technical/auditing-technical.component';
// import { NotificationsComponent } from './pages/notifications/notifications.component';
import { NewAuditingComponent } from './pages/forms/new-auditing/new-auditing.component';
import { RequestsComponent } from './pages/tables/requests/requests.component';
import { RequestDetailComponent } from './pages/tables/request-detail/request-detail.component';
import { RequestsComponentCopy } from './pages/tables/requests copy/requests.component';

export const routes: Routes = [
    {
        path: "login",
        component: SigninComponent,
        // canActivate: [NoAuthGuard]
    },
    {
        path: "",
        component: LayoutComponent,
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full',
            },
            {
                path: "dashboard",
                loadComponent: () => DashboardComponent,
                canActivate: [AuthGuard]
            },
            {
                path: "tablero-bitacoras",
                loadComponent: () => AllLogbookComponent,
                canActivate: [AuthGuard]
            },
            {
                path: "solicitudes",
                loadComponent: () => RequestsComponentCopy,
                canActivate: [AuthGuard]
            },
            {
                path: "solicitudes/:ticket",
                loadComponent: () => RequestDetailComponent,
                canActivate: [AuthGuard]
            },
            {
                path: "tickets-glpi",
                loadComponent: () => RequestsComponent,
                canActivate: [AuthGuard]
            },
            
        ],
        canActivate: [AuthGuard]
    },

    {
        path: "**",
        redirectTo: "dashboard",
    },

];
