import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { Table, TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';
import { GlpiService } from 'src/app/services/glpi.service';
import { UtilsService } from 'src/app/services/utils.service';
import { TagModule } from 'primeng/tag';
import { PanelMenuModule } from "primeng/panelmenu";
import { SplitButtonModule } from 'primeng/splitbutton';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { UserService } from 'src/app/services/user.service';

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
  selector: 'app-tickets-project',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    ButtonModule, 
    CalendarModule, 
    DropdownModule, 
    TableModule,
    TagModule, 
    PanelMenuModule,
    SplitButtonModule,
    DialogModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  templateUrl: './tickets-project.component.html',
  styleUrls: ['./tickets-project.component.sass']
})
export class TicketsProjectComponent {
  @ViewChild('requestsTable') requestsTable?: Table;

  private readonly glpiService = inject(GlpiService)
  readonly utilsService = inject(UtilsService);
  private readonly userService = inject(UserService);
  

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
  tickets:any = [];
  showConfirm: boolean = false;
  user_json: any;

  isLoading: boolean = false;


  items: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        // command: () => this.viewLogbookDetails(this.selectedLogbook)
    },
    {
        label: 'Confirmar',
        icon: 'pi pi-play-circle',
        command: () => this.showConfirm = true
    },
  ];


  ngOnInit() {
    this.user_json = this.userService.getDataSession();
    this.fetchTickets();
  }

  fetchTickets() {
    const filters = {
      is_registred: true,
    }

    this.glpiService.getTicketsCommercial(filters).subscribe({
      next: (response: any) => {
        console.log(response);
        this.tickets = response?.data || [];
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

  approveTicket() {
    this.isLoading = true;
    const data = {
      id_commercial_ticket: this.selectedTicket?.id_management_commercial,
      user: this.user_json?.user
    }

    this.glpiService.approveCommercialTicket(data).subscribe({
      next: (data: any) => {
        this.isLoading = false;
        this.showConfirm = false;
        this.utilsService.onSuccess('Ticket aprobado')
      },
      error: (error: any) => {
        console.log(error)
        this.isLoading = false;
        this.showConfirm = false;
        this.utilsService.onError(error?.error?.message ?? 'No se pudo aprobar el ticket, por favor intente nuevamente')
      }
    })
  }
}
