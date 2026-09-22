import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
    DialogModule,
    InputTextareaModule,
    TableModule,
    TabViewModule,
    TooltipModule,
    SplitButtonModule,
    ProgressSpinnerModule,
    ToastModule
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
  followups: CommercialFollowup[] = [];
  user_json: any;

  pendingTickets: CommercialTicket[] = [];
  completedTickets: CommercialTicket[] = [];
  pendingTotalRecords = 0;
  completedTotalRecords = 0;
  completedLoading = false;
  private completedLoaded = false;
  area_user: string;

  pendingFilters = { first: 0, rows: 5 };

  items: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        // command: () => this.viewLogbookDetails(this.selectedLogbook)
    },
    {
        label: 'Ver seguimientos',
        icon: 'pi pi-history',
        command: () => this.openFollowupsDialog()
    },
    {
        label: 'Registrar seguimiento',
        icon: 'pi pi-plus-circle',
        visible: () => this.selectedTicket?.status_name != 'Aprobada' && this.selectedTicket?.status_name != 'Rechazada',
        command: () => this.openRegisterFollowupDialog()
    },
    {
        label: 'Editar',
        icon: 'pi pi-play-circle',
        visible: () => this.selectedTicket?.status_name != 'Aprobada' && this.selectedTicket?.status_name != 'Rechazada',
        command: () => this.routeRegister()
    },
  ];

  itemsTechnical: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        // command: () => this.viewLogbookDetails(this.selectedLogbook)
    },
    {
        label: 'Registro',
        icon: 'pi pi-play-circle',
        // visible: () => this.user_permissions_signal().includes('CONTINUAR_BITACORA') && this.selectedLogbook?.status === 'Pendiente Salida',
        command: () => this.routeNewRegister()
    },
  ];

  ngOnInit() {
    this.user_json = this.userService.getDataSession();
    this.area_user = this.user_json?.attributes?.area
  }


  onTabChange(event: { index: number }): void {
    this.activeIndex = event.index;
    this.activeMenu = null;

    if (event.index === 1 && !this.completedLoaded) {
      this.fetchCompletedTickets();
    }
  }

  fetchPendingTickets(): void {
    this.glpiService.getTicketsTechnical({
      page: this.pendingFilters.first,
      page_size: this.pendingFilters.rows,
      pending_commercial: true
    }).subscribe({
      next: (response: any) => {
        this.pendingTickets = response?.data?.data ?? response?.data ?? [];
        this.pendingTotalRecords = response?.pagination?.total ?? this.pendingTickets.length;
      },
      error: () => this.utilsService.onError('Error al obtener las solicitudes pendientes.')
    });
  }

  fetchCompletedTickets(): void {
    this.completedLoading = true;

    this.glpiService.getTicketsCommercial().subscribe({
      next: (response: any) => {
        const payload = response?.data ?? response?.body?.data ?? response?.body ?? response;
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

  pendingPageChange(event: { first?: number | null; rows?: number | null }): void {
    this.pendingFilters = {
      first: event.first ?? 0,
      rows: event.rows ?? this.pendingFilters.rows
    };
    this.fetchPendingTickets();
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
      `/editar-ticket/${this.selectedTicket?.ticket_glpi}/${this.selectedTicket?.id_management_commercial}`
    ]);
  }

  routeNewRegister() {
    this.router.navigate([`/registro-ticket/${this.selectedTicket?.ticket_glpi}`]);
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
