import { Routes } from '@angular/router';
import { SigninComponent } from './pages/auth/signin/signin.component';
import { LayoutComponent } from './pages/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NoAuthGuard } from './guards/noAuth.guard';
import { AuthGuard } from './guards/auth.guard';
// import { NotificationsComponent } from './pages/notifications/notifications.component';
import { RequestsComponent } from './pages/tables/requests/requests.component';
import { RequestDetailComponent } from './pages/tables/request-detail/request-detail.component';
import { RequestsComponentCopy } from './pages/tables/requests copy/requests.component';
import { TicketsTechnicalComponent } from './pages/tables/tickets-technical/tickets-technical.component';
import { TicketsCommercialComponent } from './pages/tables/tickets-commercial/tickets-commercial.component';
import { TicketsFinancialComponent } from './pages/tables/tickets-financial/tickets-financial.component';
import { TicketsProjectComponent } from './pages/tables/tickets-project/tickets-project.component';
import { PermissionRouteGuard } from './guards/permission-route.guard';

export const routes: Routes = [
    {
        path: "login",
        component: SigninComponent,
        canActivate: [NoAuthGuard]
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
            // {
            //     path: "solicitudes",
            //     loadComponent: () => RequestsComponentCopy,
            //     canActivate: [AuthGuard]
            // },
            {
                path: "registro-ticket/:ticket_glpi",
                loadComponent: () => RequestDetailComponent,
                canActivate: [AuthGuard]
            },
            {
                path: "editar-ticket/:ticket_glpi/:ticket_intern",
                loadComponent: () => RequestDetailComponent,
                canActivate: [AuthGuard]
            },
            {
                path: "tickets-glpi",
                loadComponent: () => RequestsComponent,
                canActivate: [AuthGuard, PermissionRouteGuard],
                data: {
                    permission: 'VER_TICKETS_GLPI'
                }
            },
            {
                path: "tickets-tecnicos",
                loadComponent: () => TicketsTechnicalComponent,
                canActivate: [AuthGuard, PermissionRouteGuard],
                data: {
                    permission: 'VER_TICKETS_TECNICOS'
                }
            },
            {
                path: "tickets-comercial",
                loadComponent: () => TicketsCommercialComponent,
                canActivate: [AuthGuard, PermissionRouteGuard],
                data: {
                    permission: 'VER_TICKETS_COMERCIALES'
                }
            },
            {
                path: "tickets-proyectos",
                loadComponent: () => TicketsProjectComponent,
                canActivate: [AuthGuard, PermissionRouteGuard],
                data: {
                    permission: 'VER_TICKETS_PROYECTOS'
                }
            },
            {
                path: "tickets-financieros",
                loadComponent: () => TicketsFinancialComponent,
                canActivate: [AuthGuard, PermissionRouteGuard],
                data: {
                    permission: 'VER_TICKETS_FINANCIEROS'
                }
            },
        ],
        canActivate: [AuthGuard]
    },

    {
        path: "**",
        redirectTo: "dashboard",
    },

];
