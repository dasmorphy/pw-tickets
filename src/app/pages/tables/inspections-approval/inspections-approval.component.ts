import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin } from 'rxjs';
import { GlpiService } from 'src/app/services/glpi.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';
import { TicketDetailSidebarComponent } from 'src/app/components/modals/ticket-detail-sidebar/ticket-detail-sidebar.component';

// inspections: registros técnicos de Inspecciones pendientes de aprobación (/register-technical)
// supports: Soportes sin aprobar (/inspection?pending_approve_support=true) +
//           registros técnicos de Asistencias pendientes de aprobación (/register-technical)
type ApprovalView = 'inspections' | 'supports';

const ASSISTANCE_TYPE = 'Asistencia';
const PENDING_APPROVAL = 'Pendiente aprobación';

@Component({
  selector: 'app-inspections-approval',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, SplitButtonModule, TableModule, ToastModule, TooltipModule, TicketDetailSidebarComponent],
  templateUrl: './inspections-approval.component.html',
  styleUrls: ['./inspections-approval.component.sass']
})
export class InspectionsApprovalComponent {
  private readonly glpiService = inject(GlpiService);
  private readonly router = inject(Router);
  readonly utilsService = inject(UtilsService);
  readonly userService = inject(UserService);

  // Inspección incluye las antiguas sin tipo
  filters: any = {
    status: PENDING_APPROVAL,
    type: ['Inspección'],
  };
  // El Soporte se aprueba con approve-support
  supportFilters: any = {
    type: ['Soporte'],
    pending_approve_support: true,
  };
  // La Asistencia sigue el flujo normal: se aprueba con su registro técnico
  assistanceFilters: any = {
    status: PENDING_APPROVAL,
    type: [ASSISTANCE_TYPE],
  };
  user_session: any;
  selectedTicket: any;
  approvalView: ApprovalView = 'inspections';

  registeredTickets: any[] = [];
  registeredLoading = false;
  supportTickets: any[] = [];
  supportLoading = false;

  showConfirm = false;
  isApproving = false;
  showDetail = false;

  items: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        command: () => this.showDetail = true
    },
    {
        label: 'Editar',
        icon: 'pi pi-play-circle',
        visible: () => this.isSupportView || this.selectedTicket?.status != 'Listo para cotizar',
        command: () => this.routeRegister()
    },
    {
        label: 'Aprobar',
        icon: 'pi pi-check-circle',
        command: () => this.showConfirm = true
    },
  ];

  ngOnInit() {
    this.user_session = this.userService.getDataSession();
    if (this.user_session?.role == 'tecnico') {
      // /register-technical filtra por responsible (oculta las Asistencias en
      // management_status Completado); /inspection, por responsible_id
      this.filters.responsible = this.user_session?.id_user
      this.assistanceFilters.responsible = this.user_session?.id_user
      this.supportFilters.responsible_id = this.user_session?.id_user
    }

    // Se cargan ambas listas para mostrar los contadores de los botones
    this.fetchTicketsTechnical();
    this.fetchSupports();
  }

  get isSupportView(): boolean {
    return this.approvalView === 'supports';
  }

  get visibleTickets(): any[] {
    return this.isSupportView ? this.supportTickets : this.registeredTickets;
  }

  get isLoading(): boolean {
    return this.isSupportView ? this.supportLoading : this.registeredLoading;
  }

  setApprovalView(view: ApprovalView): void {
    this.approvalView = view;
    this.selectedTicket = null;
  }

  refresh(): void {
    this.isSupportView ? this.fetchSupports() : this.fetchTicketsTechnical();
  }

  fetchTicketsTechnical() {
    this.registeredLoading = true;
    this.glpiService.getTicketsTechnical(this.filters).subscribe({
      next: (response: any) => {
        this.registeredTickets = response?.data ?? [];
        this.registeredLoading = false;
      },
      error: (error: any) => {
        console.error('Error fetching tickets:', error);
        this.registeredLoading = false;
        this.utilsService.onError('Error al obtener los tickets por favor, inténtelo de nuevo más tarde.');
      }
    });
  }

  get isAssistance(): boolean {
    return this.selectedTicket?.type === ASSISTANCE_TYPE;
  }

  // La Asistencia viene de /register-technical: se muestra como registro técnico
  get detailType(): 'inspection' | 'technical' {
    return this.isSupportView && !this.isAssistance ? 'inspection' : 'technical';
  }

  fetchSupports() {
    this.supportLoading = true;
    forkJoin({
      supports: this.glpiService.getInspectionTechnical(this.supportFilters),
      assistances: this.glpiService.getTicketsTechnical(this.assistanceFilters),
    }).subscribe({
      next: ({ supports, assistances }: any) => {
        this.supportTickets = [...(supports?.data ?? []), ...(assistances?.data ?? [])]
          .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
        this.supportLoading = false;
      },
      error: (error: any) => {
        console.error('Error fetching supports:', error);
        this.supportLoading = false;
        this.utilsService.onError('Error al obtener los soportes / asistencias, por favor inténtelo de nuevo más tarde.');
      }
    });
  }

  optionsTicket(ticket: any) {
    this.selectedTicket = ticket
  }

  routeRegister() {
    // El Soporte se edita en el formulario de la inspección; Inspecciones y
    // Asistencias, en el registro técnico con sus materiales
    const route = this.isSupportView && !this.isAssistance
      ? `/editar-inspeccion/${this.selectedTicket?.id_inspection}`
      : `/registro-inspeccion-tecnica/${this.selectedTicket?.id_inspection}`;
    this.router.navigate([route]);
  }

  approve() {
    // La Asistencia se aprueba igual que una inspección (approve-technical-inspection)
    this.isSupportView && !this.isAssistance ? this.approveSupport() : this.approveInspection();
  }

  approveInspection() {
    this.isApproving = true;
    const data = {
      id_inspection: this.selectedTicket?.id_inspection,
      user: this.user_session?.user
    }

    const label = this.isAssistance ? 'Asistencia' : 'Inspección';

    this.glpiService.approveTechnicalInspection(data).subscribe({
      next: () => {
        this.isApproving = false;
        this.showConfirm = false;
        this.utilsService.onSuccess(`${label} aprobada correctamente`);
        this.isSupportView ? this.fetchSupports() : this.fetchTicketsTechnical();
      },
      error: (error: any) => {
        console.log(error)
        this.isApproving = false;
        this.showConfirm = false;
        this.utilsService.onError(error?.error?.message ?? `No se pudo aprobar la ${label.toLowerCase()}, por favor intente nuevamente`)
      }
    })
  }

  approveSupport() {
    this.isApproving = true;
    const type = this.selectedTicket?.type ?? 'Soporte';
    const data = {
      id_inspection: this.selectedTicket?.id_inspection,
      user: this.user_session?.user
    }

    this.glpiService.approveSupport(data).subscribe({
      next: () => {
        this.isApproving = false;
        this.showConfirm = false;
        this.utilsService.onSuccess(`${type} aprobado correctamente`);
        this.fetchSupports();
      },
      error: (error: any) => {
        console.log(error)
        this.isApproving = false;
        this.showConfirm = false;
        this.utilsService.onError(error?.error?.message ?? `No se pudo aprobar el ${type.toLowerCase()}, por favor intente nuevamente`)
      }
    })
  }
}
