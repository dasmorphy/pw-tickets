import { CommonModule } from '@angular/common';
import { Component, computed, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { Table, TableModule } from 'primeng/table';
import { Router, RouterModule } from '@angular/router';
import { GlpiService } from 'src/app/services/glpi.service';
import { UtilsService } from 'src/app/services/utils.service';
import { TagModule } from 'primeng/tag';
import { SplitButtonModule } from 'primeng/splitbutton';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from 'src/app/services/auth.service';

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

interface AreaTicketHistory {
  id_history: number | string;
  ticket_id: number | string;
  previous_area?: string;
  current_area?: string;
  created_at: string;
  created_by?: string | null;
}

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CalendarModule, DropdownModule, TableModule,
    TagModule, SplitButtonModule, DialogModule
  ],
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.sass']
})
export class RequestsComponent {
  @ViewChild('requestsTable') requestsTable?: Table;

  private readonly glpiService = inject(GlpiService)
  readonly utilsService = inject(UtilsService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);


  user_permissions_signal = computed(() => this.authService.user_permissions_signal());

  readonly areas: RequestArea[] = ['Técnica', 'Comercial', 'Proyectos', 'Contabilidad'];
  readonly statuses: RequestStatus[] = ['En proceso', 'Pendiente', 'Resuelto', 'Aprobado'];
  readonly clients = ['TechSolutions S.A.', 'Comercializadora del Sur', 'Industrias Andinas', 'Constructora Bello', 'Distribuidora Norte', 'Servicios Generales S.A.', 'Retail Plus', 'Alimentos del Valle'];

  dateRange: Date[] | null = [new Date(2024, 4, 1), new Date(2024, 4, 31)];
  selectedArea: RequestArea | null = null;
  selectedStatus: RequestStatus | null = null;
  selectedClient: string | null = null;
  appliedFilters = { dateFrom: '2024-05-01', dateTo: '2024-05-31', area: '', status: '', client: '' };
  activeMenu: number | null = null;
  totalRecords: number = 0;
  selectedTicket: any;
  historyVisible = false;
  historyLoading = false;
  areaHistory: AreaTicketHistory[] = [];

  filters: any = {
    first: 0,
    rows: 5
  };


  tickets:any = [];


  items: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        // command: () => this.viewLogbookDetails(this.selectedLogbook)
    },
    {
        label: 'Registro',
        icon: 'pi pi-play-circle',
        visible: () =>  !this.selectedTicket?.management_area && this.user_permissions_signal()?.includes('CREAR_FLUJO_GLPI'),
        command: () => this.routeNewRegister()
    },
    {
        label: 'Historial',
        icon: 'pi pi-history',
        command: () => this.openHistoryDialog()
    },
  ];

  pageChange(event: any) {
    const page = (event.first / event.rows) + 1;
    this.filters.first = page;
    this.filters.rows = event.rows;
    this.fetchTickets();
  }

  fetchTickets() {
    const page = (this.filters.first - 1) * this.filters.rows;
    const page_size = this.filters.rows;

    this.glpiService.getTickets(page, page_size).subscribe({
      next: (response: any) => {
        const body = response?.body || {};
        this.tickets = body?.data || [];
        const contentRange = response.headers.get('Content-Range');

        if (contentRange) {
          const [, total] = contentRange.split('/');
          this.totalRecords = Number(total);
        }
      },
      error: (error: any) => {
        console.error('Error fetching tickets:', error);
        this.utilsService.onError('Error al obtener los tickets por favor, inténtelo de nuevo más tarde.');
      }
    });
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

  optionsTicket(ticket: any) {
    this.selectedTicket = ticket
  }

  openHistoryDialog(): void {
    const ticketId = this.selectedTicket?.id;

    if (!ticketId) {
      return;
    }

    this.historyVisible = true;
    this.historyLoading = true;
    this.areaHistory = [];

    this.glpiService.getAreaTicketHistory(ticketId).subscribe({
      next: (response: any) => {
        this.areaHistory = Array.isArray(response?.data) ? response.data : [];
        this.historyLoading = false;
      },
      error: () => {
        this.historyLoading = false;
        this.utilsService.onError('Error al obtener el historial de áreas del ticket.');
      }
    });
  }

  routeNewRegister() {
    this.router.navigate([`/registro-ticket/${this.selectedTicket?.id}`]);
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
}
