import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Table, TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';
import { GlpiService } from 'src/app/services/glpi.service';
import { UtilsService } from 'src/app/services/utils.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { UserService } from 'src/app/services/user.service';
import { TicketDetailSidebarComponent, TicketDetailType } from 'src/app/components/modals/ticket-detail-sidebar/ticket-detail-sidebar.component';

interface CommercialTicket {
  id: number | string;
  code_management?: string;
  ticket_glpi?: string | number;
  created_at?: string;
  client_name?: string;
  location_name?: string;
  contact?: string;
  priority?: string;
  created_by?: string;
  status?: string;
}

type FollowupType = 'Pendiente' | 'Registrado';

interface FinancialFollowup {
  id_followup: number | string;
  management_financial_id?: number | string;
  management_commercial_id?: number | string;
  type?: FollowupType;
  observations?: string;
  created_at: string;
  created_by?: string;
}

@Component({
  selector: 'app-tickets-financial',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    DialogModule,
    InputTextareaModule,
    TableModule,
    TabViewModule,
    TooltipModule,
    SplitButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    TicketDetailSidebarComponent
  ],
  templateUrl: './tickets-financial.component.html',
  styleUrls: ['./tickets-financial.component.sass']
})
export class TicketsFinancialComponent {
  @ViewChild('pendingTable') pendingTable?: Table;

  private readonly glpiService = inject(GlpiService);
  private readonly userService = inject(UserService);
  readonly utilsService = inject(UtilsService);
  private readonly router = inject(Router);
  

  readonly areas = ['Técnica', 'Comercial', 'Proyectos', 'Contabilidad'];
  readonly statuses = ['En proceso', 'Pendiente', 'Resuelto', 'Aprobado'];
  readonly clients = ['TechSolutions S.A.', 'Comercializadora del Sur', 'Industrias Andinas', 'Constructora Bello', 'Distribuidora Norte', 'Servicios Generales S.A.', 'Retail Plus', 'Alimentos del Valle'];

  dateRange: Date[] | null = null;
  selectedArea: string | null = null;
  selectedStatus: string | null = null;
  selectedClient: string | null = null;
  selectedTicket: any;
  activeMenu: number | string | null = null;
  activeIndex = 0;
  registerFollowupVisible = false;
  isLoading: boolean = false
  followupsVisible = false;
  followupObservation = '';
  followups: FinancialFollowup[] = [];
  user_json: any;

  pendingTickets: CommercialTicket[] = [];
  completedTickets: CommercialTicket[] = [];
  pendingTotalRecords = 0;
  completedTotalRecords = 0;
  completedLoading = false;
  private completedLoaded = false;

  pendingFilters = { first: 0, rows: 5 };

  showDetail = false;
  detailType: TicketDetailType = 'commercial';

  items: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        // Pendientes lista gestiones comerciales; Registrados, gestiones financieras
        command: () => {
          this.detailType = this.activeIndex === 0 ? 'commercial' : 'financial';
          this.showDetail = true;
        }
    },
    {
        label: 'Ver seguimientos',
        icon: 'pi pi-history',
        command: () => this.openFollowupsDialog()
    },
    {
        label: 'Registrar seguimiento',
        icon: 'pi pi-plus-circle',
        // Pendientes siempre admiten seguimiento; Registrados solo mientras estén solicitados
        visible: () => this.activeIndex === 0 || this.selectedTicket?.status === 'Solicitado',
        command: () => this.openRegisterFollowupDialog()
    },
    {
        label: 'Registro',
        icon: 'pi pi-play-circle',
        // Pendientes son gestiones comerciales aún sin registro financiero
        visible: () => this.activeIndex === 0,
        command: () => this.routeRegister()
    },
    {
        label: 'Editar',
        icon: 'pi pi-pencil',
        visible: () => this.activeIndex === 1 && this.selectedTicket?.status != 'Cobrada',
        command: () => this.routeEdit()
    },
  ];

  ngOnInit() {
    this.user_json = this.userService.getDataSession();
    this.fetchCompletedTickets();
    this.fetchPendingTickets();
  }

  onTabChange(event: { index: number }): void {
    this.activeIndex = event.index;
    this.activeMenu = null;

    if (event.index === 1 && !this.completedLoaded) {
      this.fetchCompletedTickets();
    }
  }

  fetchPendingTickets(): void {
    this.glpiService.getTicketsCommercial({
      pending_financial: true
    }).subscribe({
      next: (response: any) => {
        this.pendingTickets = response?.data ?? [];
        this.pendingTotalRecords = response?.pagination?.total ?? this.pendingTickets.length;
      },
      error: () => this.utilsService.onError('Error al obtener las solicitudes pendientes.')
    });
  }

  fetchCompletedTickets(): void {
    this.completedLoading = true;

    this.glpiService.getTicketsFinancial().subscribe({
      next: (response: any) => {
        const payload = response?.data;
        this.completedTickets = this.extractRecords(payload);
        this.completedTotalRecords = response?.pagination?.total ?? response?.data?.pagination?.total ?? this.completedTickets.length;
        this.completedLoaded = true;
        this.completedLoading = false;
      },
      error: () => {
        this.completedLoading = false;
        this.utilsService.onError('Error al obtener las solicitudes completadas.');
      }
    });
  }

  // Pendientes se vinculan a la gestión comercial; Registrados, a la gestión financiera
  private get followupType(): FollowupType {
    return this.activeIndex === 0 ? 'Pendiente' : 'Registrado';
  }

  fetchFollowups() {
    const type = this.followupType;
    const filters = type === 'Pendiente'
      ? { id_commercial: this.selectedTicket?.id_management_commercial, type }
      : { id_financial: this.selectedTicket?.id_management_financial, type };

    this.glpiService.getFollowupsFinancial(filters).subscribe({
      next: (data: any) => {
        this.followups = data?.data ?? [];
      },
      error: (error: any) => {
        console.log(error);
        this.utilsService.onError(error?.error?.message ?? 'Error al obtener los seguimientos')
      }
    })
  }

  applyFilters(): void {
    // La API de solicitudes técnicas aún no recibe estos filtros. Se conservan para mantener el estándar visual.
    this.pendingTable?.reset();
  }

  clearFilters(): void {
    this.dateRange = null;
    this.selectedArea = null;
    this.selectedStatus = null;
    this.selectedClient = null;
    this.applyFilters();
  }

  toggleMenu(ticketId: number | string): void {
    this.activeMenu = this.activeMenu === ticketId ? null : ticketId;
  }

  private extractRecords(payload: any): CommercialTicket[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    return payload?.data ?? payload?.items ?? payload?.results ?? [];
  }

  optionsTicket(ticket: any) {
    this.selectedTicket = ticket
  }

  routeRegister() {
    this.router.navigate([`/registro-ticket/${this.selectedTicket?.id_inspection}/financiero`]);
  }

  routeEdit() {
    this.router.navigate([
      `/editar-ticket/${this.selectedTicket?.id_inspection}/${this.selectedTicket?.id_management_financial}/financiero`
    ]);
  }

  openRegisterFollowupDialog(): void {
    this.followupObservation = '';
    this.registerFollowupVisible = true;
  }

  openFollowupsDialog(): void {
    this.followups = [];
    this.followupsVisible = true;
    this.fetchFollowups();
  }

  saveFollowup(){
    const type = this.followupType;
    const data = {
      observations: this.followupObservation,
      type,
      ...(type === 'Pendiente'
        ? { management_commercial_id: this.selectedTicket?.id_management_commercial }
        : { management_financial_id: this.selectedTicket?.id_management_financial }),
      user: this.user_json?.user
    }

    this.isLoading = true;
    this.closeNewFollowup();
    this.glpiService.saveFollowupFinancial(data).subscribe({
      next: () => {
        this.isLoading = false;
        if (type === 'Pendiente') {
          this.fetchPendingTickets();
        } else {
          this.fetchCompletedTickets();
        }
        this.utilsService.onSuccess('Seguimiento creado correctamente')
      },
      error: (error: any) => {
        this.isLoading = false;
        console.log(error)
        this.utilsService.onError(error?.error?.message ?? 'No se puedo guardar el seguimiento, por favor intente nuevamente')
      }
    })
  }

  closeNewFollowup() {
    this.registerFollowupVisible = false;
    this.followupObservation = '';
  }
}
