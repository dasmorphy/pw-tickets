import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { Table, TableModule } from 'primeng/table';
import { Router, RouterModule } from '@angular/router';
import { GlpiService } from 'src/app/services/glpi.service';
import { UtilsService } from 'src/app/services/utils.service';
import { TagModule } from 'primeng/tag';
import { PanelMenuModule } from "primeng/panelmenu";
import { SplitButtonModule } from 'primeng/splitbutton';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';
import { UserService } from 'src/app/services/user.service';
import { TicketDetailSidebarComponent, TicketDetailType } from 'src/app/components/modals/ticket-detail-sidebar/ticket-detail-sidebar.component';

type RequestArea = 'Técnica' | 'Comercial' | 'Proyectos' | 'Contabilidad';
type RequestStatus = 'En proceso' | 'Pendiente' | 'Resuelto' | 'Aprobado';
type RequestPriority = 'Alta' | 'Media' | 'Baja';
interface ServiceRequest {
  ticket: string;
  client: string;
  initials: string;
  subject: string;
  area: RequestArea;
  status: RequestStatus;
  date: string;
  time: string;
  priority: RequestPriority;
}

@Component({
  selector: 'app-tickets-technical',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CalendarModule, DropdownModule, TableModule,
    TagModule, PanelMenuModule, SplitButtonModule, TabViewModule, TooltipModule, TicketDetailSidebarComponent],
  templateUrl: './tickets-technical.component.html',
  styleUrls: ['./tickets-technical.component.sass']
})
export class TicketsTechnicalComponent {
  @ViewChild('requestsTable') requestsTable?: Table;

  private readonly glpiService = inject(GlpiService)
  private readonly router = inject(Router);
  readonly utilsService = inject(UtilsService);
  readonly userService = inject(UserService);

  readonly areas: RequestArea[] = ['Técnica', 'Comercial', 'Proyectos', 'Contabilidad'];
  readonly statuses: RequestStatus[] = ['En proceso', 'Pendiente', 'Resuelto', 'Aprobado'];
  readonly clients = ['TechSolutions S.A.', 'Comercializadora del Sur', 'Industrias Andinas', 'Constructora Bello', 'Distribuidora Norte', 'Servicios Generales S.A.', 'Retail Plus', 'Alimentos del Valle'];

  dateRange: Date[] | null = [new Date(2024, 4, 1), new Date(2024, 4, 31)];
  selectedArea: RequestArea | null = null;
  selectedStatus: RequestStatus | null = null;
  selectedClient: string | null = null;
  appliedFilters = { dateFrom: '2024-05-01', dateTo: '2024-05-31', area: '', status: '', client: '' };
  activeMenu: number | null = null;
  selectedTicket: any;

  filters: any = {};

  user_session: any;
  activeIndex = 0;
  pendingTickets: any[] = [];
  registeredTickets: any[] = [];
  registeredLoading = false;
  private registeredLoaded = false;

  showDetail = false;
  detailType: TicketDetailType = 'inspection';

  itemsPending: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        command: () => this.viewDetails('inspection')
    },
    {
        label: 'Registro',
        icon: 'pi pi-play-circle',
        command: () => this.routeNewRegister()
    },
  ];

  ngOnInit() {
    this.user_session = this.userService.getDataSession();
    if (this.user_session?.role == 'tecnico') {
      this.filters.responsible_id = this.user_session?.id_user
      this.filters.user = this.user_session?.user
    }
    
    this.fetchInspection();
  }

  fetchInspection() {
    this.glpiService.getInspectionTechnical({...this.filters, pending_technical: true}).subscribe({
      next: (response: any) => {
        console.log(response);
        this.pendingTickets = this.extractRecords(response?.data);
      },
      error: (error: any) => {
        console.error('Error fetching tickets:', error);
        this.utilsService.onError('Error al obtener los tickets por favor, inténtelo de nuevo más tarde.');
      }
    });
  }

  fetchTicketsTechnical() {
    this.registeredLoading = true;
    this.glpiService.getTicketsTechnical(this.filters).subscribe({
      next: (response: any) => {
        console.log(response);
        this.registeredTickets = response?.data;
        this.registeredLoaded = true;
        this.registeredLoading = false;
      },
      error: (error: any) => {
        console.error('Error fetching tickets:', error);
        this.registeredLoading = false;
        this.utilsService.onError('Error al obtener los tickets por favor, inténtelo de nuevo más tarde.');
      }
    });
  }


  onTabChange(event: { index: number }): void {
    this.activeIndex = event.index;
    this.activeMenu = null;

    if (event.index === 1 && !this.registeredLoaded) {
      this.fetchTicketsTechnical();
    }
  }

  applyFilters(): void {
    const start = this.dateRange?.[0] ? this.formatIsoDate(this.dateRange[0]) : '';
    const end = this.dateRange?.[1] ? this.formatIsoDate(this.dateRange[1]) : start;
    this.appliedFilters = {
      dateFrom: start,
      dateTo: end,
      area: this.selectedArea ?? '',
      status: this.selectedStatus ?? '',
      client: this.selectedClient ?? ''
    };
    this.requestsTable?.reset();
  }

  clearFilters(): void {
    this.dateRange = null;
    this.selectedArea = null;
    this.selectedStatus = null;
    this.selectedClient = null;
    this.applyFilters();
  }

  formatDate(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  private formatIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleMenu(ticketId: number): void {
    this.activeMenu = this.activeMenu === ticketId ? null : ticketId;
  }

  trackRequest(_: number, request: ServiceRequest): string {
    return request.ticket;
  }

  getSeverity(status: string) {
    switch (status) {
      case "Técnica":
        return 'warning';
      case "Comercial":
        return 'success';
      case "Proyectos":
        return 'info';
      case "Financiero":
        return 'danger';
      default:
        return 'info';
    }
  }

  private extractRecords(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    const records = payload?.data ?? payload?.items ?? payload?.results;
    return Array.isArray(records) ? records : [];
  }

  optionsTicket(ticket: any) {
    this.selectedTicket = ticket
  }

  routeRegister() {
    this.router.navigate([
      `/editar-registro-tecnico/${this.selectedTicket?.id_inspection}/${this.selectedTicket?.id_management_technical}`
    ]);
  }

  routeNewRegister() {
    this.router.navigate([`/registro-inspeccion-tecnica/${this.selectedTicket?.id_inspection}`]);
  }

  viewDetails(type: TicketDetailType) {
    this.detailType = type;
    this.showDetail = true;
  }
}
