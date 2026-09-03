import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { Table, TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';

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

  readonly areas: RequestArea[] = ['Técnica', 'Comercial', 'Proyectos', 'Contabilidad'];
  readonly statuses: RequestStatus[] = ['En proceso', 'Pendiente', 'Resuelto', 'Aprobado'];
  readonly clients = ['TechSolutions S.A.', 'Comercializadora del Sur', 'Industrias Andinas', 'Constructora Bello', 'Distribuidora Norte', 'Servicios Generales S.A.', 'Retail Plus', 'Alimentos del Valle'];

  dateRange: Date[] | null = [new Date(2024, 4, 1), new Date(2024, 4, 31)];
  selectedArea: RequestArea | null = null;
  selectedStatus: RequestStatus | null = null;
  selectedClient: string | null = null;
  appliedFilters = { dateFrom: '2024-05-01', dateTo: '2024-05-31', area: '', status: '', client: '' };
  activeMenu: string | null = null;

  readonly requests: ServiceRequest[] = [
    { ticket: '#INC-2024-1258', client: 'TechSolutions S.A.', initials: 'TS', subject: 'No funciona acceso VPN', area: 'Técnica', status: 'En proceso', date: '2024-05-29', time: '10:32', priority: 'Alta' },
    { ticket: '#REQ-2024-1257', client: 'Comercializadora del Sur', initials: 'CS', subject: 'Cotización de licencias', area: 'Comercial', status: 'Pendiente', date: '2024-05-29', time: '09:15', priority: 'Media' },
    { ticket: '#PRO-2024-1256', client: 'Industrias Andinas', initials: 'IA', subject: 'Implementación módulo Inventarios', area: 'Proyectos', status: 'En proceso', date: '2024-05-28', time: '16:45', priority: 'Alta' },
    { ticket: '#CON-2024-1255', client: 'Constructora Bello', initials: 'CB', subject: 'Revisión factura F-001-1458', area: 'Contabilidad', status: 'Pendiente', date: '2024-05-28', time: '14:20', priority: 'Media' },
    { ticket: '#INC-2024-1254', client: 'Distribuidora Norte', initials: 'DN', subject: 'Error al generar reporte', area: 'Técnica', status: 'Resuelto', date: '2024-05-27', time: '11:05', priority: 'Baja' },
    { ticket: '#REQ-2024-1253', client: 'Servicios Generales S.A.', initials: 'SG', subject: 'Consulta por plan anual', area: 'Comercial', status: 'Aprobado', date: '2024-05-27', time: '09:40', priority: 'Baja' },
    { ticket: '#PRO-2024-1252', client: 'Retail Plus', initials: 'RP', subject: 'Migración de datos históricos', area: 'Proyectos', status: 'En proceso', date: '2024-05-24', time: '15:30', priority: 'Alta' },
    { ticket: '#CON-2024-1251', client: 'Alimentos del Valle', initials: 'AV', subject: 'Registro de pago proveedor', area: 'Contabilidad', status: 'Pendiente', date: '2024-05-24', time: '10:18', priority: 'Media' },
    { ticket: '#INC-2024-1250', client: 'TechSolutions S.A.', initials: 'TS', subject: 'Restablecer credenciales de acceso', area: 'Técnica', status: 'Resuelto', date: '2024-05-23', time: '17:02', priority: 'Media' },
    { ticket: '#REQ-2024-1249', client: 'Retail Plus', initials: 'RP', subject: 'Ampliación de usuarios del plan', area: 'Comercial', status: 'Aprobado', date: '2024-05-22', time: '12:10', priority: 'Baja' },
    { ticket: '#PRO-2024-1248', client: 'Constructora Bello', initials: 'CB', subject: 'Configuración ambiente de pruebas', area: 'Proyectos', status: 'Pendiente', date: '2024-05-21', time: '08:45', priority: 'Alta' },
    { ticket: '#CON-2024-1247', client: 'Industrias Andinas', initials: 'IA', subject: 'Validación de retenciones', area: 'Contabilidad', status: 'Resuelto', date: '2024-05-20', time: '13:26', priority: 'Baja' },
    ...Array.from({ length: 44 }, (_, index): ServiceRequest => {
      const areas: RequestArea[] = ['Técnica', 'Comercial', 'Proyectos', 'Contabilidad'];
      const statuses: RequestStatus[] = ['En proceso', 'Pendiente', 'Resuelto', 'Aprobado'];
      const priorities: RequestPriority[] = ['Alta', 'Media', 'Baja'];
      const subjects = ['Actualización de permisos', 'Solicitud de nueva licencia', 'Seguimiento de implementación', 'Conciliación de comprobantes'];
      const client = this.clients[index % this.clients.length];
      const day = 19 - (index % 19);
      const ticketPrefix = ['INC', 'REQ', 'PRO', 'CON'][index % 4];

      return {
        ticket: `#${ticketPrefix}-2024-${1246 - index}`,
        client,
        initials: client.split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase(),
        subject: subjects[index % subjects.length],
        area: areas[index % areas.length],
        status: statuses[index % statuses.length],
        date: `2024-05-${String(day).padStart(2, '0')}`,
        time: `${String(8 + (index % 10)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
        priority: priorities[index % priorities.length]
      };
    })
  ];

  get filteredRequests(): ServiceRequest[] {
    const { dateFrom, dateTo, area, status, client } = this.appliedFilters;
    return this.requests
      .filter(request => !dateFrom || request.date >= dateFrom)
      .filter(request => !dateTo || request.date <= dateTo)
      .filter(request => !area || request.area === area)
      .filter(request => !status || request.status === status)
      .filter(request => !client || request.client === client);
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

  toggleMenu(ticket: string): void {
    this.activeMenu = this.activeMenu === ticket ? null : ticket;
  }

  trackRequest(_: number, request: ServiceRequest): string {
    return request.ticket;
  }
}
