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
import { NewAuditingComponent } from './pages/forms/new-auditing/new-auditing.component';
import { ProjectTechnicalComponent } from './pages/tables/project-technical/project-technical.component';
import { AuditingTechnicalComponent } from './pages/tables/auditing-technical/auditing-technical.component';
import { InspectionFormComponent } from './components/forms/inspection-form/inspection-form.component';
import { InspectionsTechnicalComponent } from './pages/tables/inspections-technical/inspections-technical.component';
import { InspectionsApprovalComponent } from './pages/tables/inspections-approval/inspections-approval.component';
import { LogisticsMaterialsComponent } from './pages/tables/logistics-materials/logistics-materials.component';
import { RegisterTicketTechnicalComponent } from './components/forms/register-ticket-technical/register-ticket-technical.component';

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
                // Sin form_type se muestra el formulario comercial
                path: "registro-ticket/:inspection_id",
                loadComponent: () => RequestDetailComponent,
                canActivate: [AuthGuard]
            },
            {
                // form_type: comercial | financiero
                path: "registro-ticket/:inspection_id/:form_type",
                loadComponent: () => RequestDetailComponent,
                canActivate: [AuthGuard]
            },
            {
                path: "editar-ticket/:inspection_id/:ticket_intern",
                loadComponent: () => RequestDetailComponent,
                canActivate: [AuthGuard]
            },
            {
                path: "inspecciones",
                loadComponent: () => InspectionsTechnicalComponent,
                canActivate: [AuthGuard],
                // data: {
                //     permission: 'VER_INSPECCION'
                // }
            },
            {
                path: "editar-inspeccion/:id_inspection",
                loadComponent: () => InspectionFormComponent,
                canActivate: [AuthGuard]
            },
            {
                path: "nueva-inspeccion",
                loadComponent: () => InspectionFormComponent,
                canActivate: [AuthGuard],
                // data: {
                //     permission: 'NUEVA_INSPECCION'
                // }
            },
            {
                path: "productos",
                loadComponent: () => LogisticsMaterialsComponent,
                canActivate: [AuthGuard]
            },
            {
                path: "inspecciones-por-aprobar",
                loadComponent: () => InspectionsApprovalComponent,
                canActivate: [AuthGuard]
            },
            {
                path: "tickets-tecnicos",
                loadComponent: () => TicketsTechnicalComponent,
                canActivate: [AuthGuard],
                // data: {
                //     permission: 'VER_TICKETS_TECNICOS'
                // }
            },
            {
                path: "registro-inspeccion-tecnica/:inspection_id",
                loadComponent: () => RegisterTicketTechnicalComponent,
                canActivate: [AuthGuard],
                // data: {
                //     permission: 'VER_TICKETS_TECNICOS'
                // }
            },
            {
                path: "editar-registro-tecnico/:inspection_id/:id_management_technical",
                loadComponent: () => RegisterTicketTechnicalComponent,
                canActivate: [AuthGuard],
            },
            {
                path: "tickets-comercial",
                loadComponent: () => TicketsCommercialComponent,
                canActivate: [AuthGuard],
                // data: {
                //     permission: 'VER_TICKETS_COMERCIALES'
                // }
            },
            {
                path: "tickets-proyectos",
                loadComponent: () => TicketsProjectComponent,
                canActivate: [AuthGuard],
                // data: {
                //     permission: 'VER_TICKETS_PROYECTOS'
                // }
            },
            {
                path: "tickets-financieros",
                loadComponent: () => TicketsFinancialComponent,
                canActivate: [AuthGuard],
                // data: {
                //     permission: 'VER_TICKETS_FINANCIEROS'
                // }
            },
            {
                path: "fiscalizaciones",
                loadComponent: () => AuditingTechnicalComponent,
                canActivate: [AuthGuard, PermissionRouteGuard],
                data: {
                    permission: 'VER_FISCALIZACION'
                }
            },
            {
                path: "nueva-fiscalizacion",
                loadComponent: () => NewAuditingComponent,
                canActivate: [AuthGuard, PermissionRouteGuard],
                data: {
                    permission: 'NUEVA_FISCALIZACION'
                }
            },
            {
                path: "proyectos-tecnicos",
                loadComponent: () => ProjectTechnicalComponent,
                canActivate: [AuthGuard, PermissionRouteGuard],
                data: {
                    permission: 'VER_PROYECTOS'
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
