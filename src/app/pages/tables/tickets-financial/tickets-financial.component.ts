import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Table, TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';
import { GlpiService } from 'src/app/services/glpi.service';
import { UtilsService } from 'src/app/services/utils.service';

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
    TableModule,
    TabViewModule,
    TooltipModule,
    SplitButtonModule
  ],
  templateUrl: './tickets-financial.component.html',
  styleUrls: ['./tickets-financial.component.sass']
})
export class TicketsFinancialComponent {
  @ViewChild('pendingTable') pendingTable?: Table;

  private readonly glpiService = inject(GlpiService);
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

  pendingTickets: CommercialTicket[] = [];
  completedTickets: CommercialTicket[] = [];
  pendingTotalRecords = 0;
  completedTotalRecords = 0;
  completedLoading = false;
  private completedLoaded = false;

  pendingFilters = { first: 0, rows: 5 };

  items: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        // command: () => this.viewLogbookDetails(this.selectedLogbook)
    },
    {
        label: 'Registro',
        icon: 'pi pi-play-circle',
        // visible: () => this.user_permissions_signal().includes('CONTINUAR_BITACORA') && this.selectedLogbook?.status === 'Pendiente Salida',
        command: () => this.routeRegister()
    },
  ];

  ngOnInit() {
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
    console.log(this.selectedTicket);
    this.router.navigate([`/registro-ticket/${this.selectedTicket?.ticket_glpi}`]);
  }
}
