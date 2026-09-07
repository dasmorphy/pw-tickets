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
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CalendarModule, DropdownModule, TableModule],
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.sass']
})
export class RequestsComponent {
  @ViewChild('requestsTable') requestsTable?: Table;

  private readonly glpiService = inject(GlpiService)
  private readonly utilsService = inject(UtilsService);

  readonly areas: RequestArea[] = ['Técnica', 'Comercial', 'Proyectos', 'Contabilidad'];
  readonly statuses: RequestStatus[] = ['En proceso', 'Pendiente', 'Resuelto', 'Aprobado'];
  readonly clients = ['TechSolutions S.A.', 'Comercializadora del Sur', 'Industrias Andinas', 'Constructora Bello', 'Distribuidora Norte', 'Servicios Generales S.A.', 'Retail Plus', 'Alimentos del Valle'];

  dateRange: Date[] | null = [new Date(2024, 4, 1), new Date(2024, 4, 31)];
  selectedArea: RequestArea | null = null;
  selectedStatus: RequestStatus | null = null;
  selectedClient: string | null = null;
  appliedFilters = { dateFrom: '2024-05-01', dateTo: '2024-05-31', area: '', status: '', client: '' };
  activeMenu: number | null = null;

  tickets:any = [];

  ngOnInit() {
    this.glpiService.getTickets().subscribe({
      next: (data: any) => {
        this.tickets = data?.data || [];
      },
      error: (error: any) => {
        console.error('Error fetching tickets:', error);
        this.utilsService.onError('Error al obtener los tickets por favor, inténtelo de nuevo más tarde.');
      }
    });
  }

  getTxtStatus(statusId: number): string {
    switch (statusId) {
      case 1:
        return 'Nuevo';
      case 2:
        return 'En curso (asignado)';
      case 3:
        return 'En curso (planificado)';
      case 4:
        return 'En espera';
      case 5:
        return 'Resuelto';
      case 6:
        return 'Cerrado';
      default:
        return 'Desconocido';
    }
  }

  getTxtPriority(priorityId: number): string {
    switch (priorityId) {
      case 1:
        return 'Muy baja';
      case 2:
        return 'Baja';
      case 3:
        return 'Media';
      case 4:
        return 'Alta';
      case 5:
        return 'Muy alta';
      case 6:
        return 'Crítica';
      default:
        return 'Desconocido';
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
}
