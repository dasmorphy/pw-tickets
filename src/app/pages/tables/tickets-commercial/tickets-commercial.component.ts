import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
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
  status_name?: string;
  last_followup_at?: string;
  sales_user?: string;
}

interface CommercialFollowup {
  id_followup: number | string;
  management_commercial_id: number | string;
  observations?: string;
  created_at: string;
  created_by?: string;
}

@Component({
  selector: 'app-tickets-commercial',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    MultiSelectModule,
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
  templateUrl: './tickets-commercial.component.html',
  styleUrls: ['./tickets-commercial.component.sass']
})
export class TicketsCommercialComponent {
  @ViewChild('pendingTable') pendingTable?: Table;

  private readonly glpiService = inject(GlpiService);
  private readonly userService = inject(UserService);
  readonly utilsService = inject(UtilsService);
  private readonly router = inject(Router);
  

  readonly areas = ['Técnica', 'Comercial', 'Proyectos', 'Contabilidad'];
  readonly statuses = ['En proceso', 'Pendiente', 'Resuelto', 'Aprobado'];
  clients = [];

  dateRange: Date[] | null = null;
  selectedArea: string | null = null;
  selectedStatus: string | null = null;
  selectedClients: number[] = [];
  selectedTicket: any;
  activeMenu: number | string | null = null;
  activeIndex = 0;
  registerFollowupVisible = false;
  isLoading: boolean = false
  followupsVisible = false;
  followupObservation = '';
  followups: CommercialFollowup[] = [];
  user_json: any;

  pendingTickets: CommercialTicket[] = [];
  completedTickets: CommercialTicket[] = [];
  completedLoading = false;
  private completedLoaded = false;
  area_user: string;

  pendingFilters = { first: 0, rows: 5 };

  showDetail = false;
  showAssignDialog = false;
  loadingUsers = false;
  users_intern: any[] = [];
  // Atributo user del asesor seleccionado; se guarda en sales_user de la inspección
  selectedSalesUser: string | null = null;
  detailType: TicketDetailType = 'commercial';

  items: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        command: () => this.viewDetails('commercial')
    },
    {
        label: 'Ver seguimientos',
        icon: 'pi pi-history',
        command: () => this.openFollowupsDialog()
    },
    {
        label: 'Registrar seguimiento',
        icon: 'pi pi-plus-circle',
        // visible: () => this.selectedTicket?.status_name != 'Aprobada' && this.selectedTicket?.status_name != 'Rechazada',
        command: () => this.openRegisterFollowupDialog()
    },
    {
        label: 'Editar',
        icon: 'pi pi-play-circle',
        // Solo una gestión pendiente (status_id 7) se puede editar; el backend también lo valida
        visible: () => this.selectedTicket?.status_id === 7,
        command: () => this.routeRegister()
    },
  ];

  itemsTechnical: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        command: () => this.viewDetails('inspection')
    },
    {
        label: 'Registro',
        icon: 'pi pi-play-circle',
        // visible: () => this.user_permissions_signal().includes('CONTINUAR_BITACORA') && this.selectedLogbook?.status === 'Pendiente Salida',
        command: () => this.routeNewRegister()
    },
    {
      label: 'Asignar asesor',
      icon: 'pi pi-user-plus',
      // visible: () => this.user_permissions_signal().includes('CONTINUAR_BITACORA') && this.selectedLogbook?.status === 'Pendiente Salida',
      command: () => this.assignCommercialUser()
    },
  ];

  ngOnInit() {
    this.user_json = this.userService.getDataSession();
    this.area_user = this.user_json?.attributes?.area
    this.fetchPendingTickets()
    this.fetchClients()
  }

  fetchClients() {
    this.glpiService.getClients().subscribe({
      next: (data: any) => {
        this.clients = data?.data;
      },
      error: (error: any) => {
        console.error('Error fetching clients:', error);
        this.utilsService.onError('Error al obtener los clientes. Por favor, inténtelo de nuevo más tarde.');
      }
    });
  }


  onTabChange(event: { index: number }): void {
    this.activeIndex = event.index;
    this.activeMenu = null;

    if (event.index === 1 && !this.completedLoaded) {
      this.fetchCompletedTickets();
    }
  }

  assignCommercialUser() {
    // Precarga el asesor actual para poder reasignar
    this.selectedSalesUser = this.selectedTicket?.sales_user ?? null;
    this.showAssignDialog = true;
    if (!this.users_intern.length) {
      this.fetchUsers();
    }
  }

  saveAssignment() {
    if (!this.selectedSalesUser) {
      return;
    }

    this.isLoading = true;
    this.glpiService.assignSalesUser({
      id_inspection: this.selectedTicket?.id_inspection,
      user: this.selectedSalesUser
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.closeAssignDialog();
        this.utilsService.onSuccess('Asesor asignado correctamente');
        this.fetchPendingTickets();
      },
      error: (error: any) => {
        this.isLoading = false;
        console.log(error);
        this.utilsService.onError(error?.error?.message ?? 'No se pudo asignar el asesor, por favor intente nuevamente');
      }
    });
  }

  closeAssignDialog() {
    this.showAssignDialog = false;
    this.selectedSalesUser = null;
  }

  fetchUsers() {
    this.loadingUsers = true;
    const filters = {
      roles: ['asesor_comercial']
    }
    this.userService.getUsers(filters).subscribe({
      next: (data: any) => {
        this.loadingUsers = false;
        this.users_intern = (data?.data ?? []).map((user: any) => ({
          ...user,
          fullname: user.attributes?.fullname ?? user.user
        }));
      },
      error: (error: any) => {
        console.log(error);
        this.loadingUsers = false;
        this.utilsService.onError('Error al obtener los asesores comerciales.');
      }
    });
  }

  fetchPendingTickets(): void {
    let filters: any = {
      pending_commercial: true
    };

    if (this.user_json?.role === 'asesor_comercial') {
      filters.sales_user = this.user_json?.user;
    }

    if (this.selectedClients.length) {
      filters.client_id = this.selectedClients;
    }

    if (this.dateRange?.[0]) {
      // end_date incluye todo el último día del rango
      filters.start_date = `${this.formatIsoDate(this.dateRange[0])}T00:00:00`;
      filters.end_date = `${this.formatIsoDate(this.dateRange[1] ?? this.dateRange[0])}T23:59:59`;
    }

    this.glpiService.getInspectionTechnical(filters).subscribe({
      next: (response: any) => {
        this.pendingTickets = response?.data ?? [];
      },
      error: () => this.utilsService.onError('Error al obtener las solicitudes pendientes.')
    });
  }

  fetchCompletedTickets(): void {
    this.completedLoading = true;

    this.glpiService.getTicketsCommercial().subscribe({
      next: (response: any) => {
        this.completedTickets = response?.data;
        this.completedLoaded = true;
        this.completedLoading = false;
      },
      error: () => {
        this.completedLoading = false;
        this.utilsService.onError('Error al obtener las solicitudes completadas.');
      }
    });
  }

  fetchFollowups() {
    this.glpiService.getFollowups({id_commercial: this.selectedTicket?.id_management_commercial}).subscribe({
      next: (data: any) => {
        console.log(data)
        this.followups = data?.data
      },
      error: (error: any) => {
        console.log(error);
        this.utilsService.onError(error?.error?.message ?? 'Error al obtener los seguimientos')
      }
    })
  }

  applyFilters(): void {
    this.pendingTable?.reset();
    this.fetchPendingTickets();
  }

  clearFilters(): void {
    this.dateRange = null;
    this.selectedArea = null;
    this.selectedStatus = null;
    this.selectedClients = [];
    this.applyFilters();
  }

  private formatIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  viewDetails(type: TicketDetailType) {
    this.detailType = type;
    this.showDetail = true;
  }

  optionsTicket(ticket: any) {
    this.selectedTicket = ticket
  }

  openRegisterFollowupDialog(): void {
    this.followupObservation = '';
    this.registerFollowupVisible = true;
  }

  openFollowupsDialog(): void {
    this.followupsVisible = true;
    this.fetchFollowups();
  }

  routeRegister() {
    this.router.navigate([
      `/editar-ticket/${this.selectedTicket?.id_inspection}/${this.selectedTicket?.id_management_commercial}`
    ]);
  }

  routeNewRegister() {
    this.router.navigate([`/registro-ticket/${this.selectedTicket?.id_inspection}/comercial`]);
  }

  saveFollowup(){
    const data = {
      observations: this.followupObservation,
      management_commercial_id: this.selectedTicket?.id_management_commercial,
      user: this.user_json?.user
    }

    this.isLoading = true;
    this.closeNewFollowup();
    this.glpiService.saveFollowup(data).subscribe({
      next: (data: any) => {
        this.isLoading = false;
        this.fetchCompletedTickets();
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
