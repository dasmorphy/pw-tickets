import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { GlpiService } from 'src/app/services/glpi.service';
import { UtilsService } from 'src/app/services/utils.service';

interface TechnicalInspection {
  ticket_id: number;
  ticket_glpi: number;
  ticket_created_at?: string;
  ticket_created_by?: string | null;
  ticket_updated_at?: string;
  ticket_updated_by?: string | null;
  title_ticket?: string | null;
  client_id?: number;
  client_name?: string;
  ubication_id?: number;
  location_name?: string;
  contact?: string;
  priority?: string;
  management_area?: string;
  next_area?: string;
  ticket_status?: string | null;
  responsible_ticket?: string | null;
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
  selector: 'app-inspections-technical',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TooltipModule,
    SplitButtonModule,
    DialogModule
  ],
  templateUrl: './inspections-technical.component.html',
  styleUrls: ['./inspections-technical.component.sass']
})
export class InspectionsTechnicalComponent {
  @ViewChild('inspectionsTable') inspectionsTable?: Table;

  private readonly glpiService = inject(GlpiService);
  private readonly utilsService = inject(UtilsService);

  inspections: TechnicalInspection[] = [];
  isLoading = false;

  selectedInspection: any;

  historyVisible = false;
  historyLoading = false;

  areaHistory: AreaTicketHistory[] = [];


    items: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        // command: () => this.viewLogbookDetails(this.selectedLogbook)
    },
    {
        label: 'Historial',
        icon: 'pi pi-history',
        command: () => this.openHistoryDialog()
    },
  ];

  ngOnInit(): void {
    this.fetchInspections();
  }

  optionsTicket(inspection: any) {
    this.selectedInspection = inspection
  }

   openHistoryDialog(): void {
    const ticketId = this.selectedInspection?.id_inspection;

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
        this.utilsService.onError('Error al obtener el historial de áreas.');
      }
    });
  }

  fetchInspections(): void {
    this.isLoading = true;

    this.glpiService.getInspectionTechnical().subscribe({
      next: (response: any) => {
        this.inspections = Array.isArray(response?.data) ? response.data : [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.utilsService.onError('No se pudieron obtener las inspecciones técnicas.');
      }
    });
  }

  filterGlobal(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inspectionsTable?.filterGlobal(value, 'contains');
  }

  getAreaSeverity(area?: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (area) {
      case 'Técnica': return 'info';
      case 'Comercial': return 'success';
      case 'Proyectos': return 'warning';
      case 'Financiera':
      case 'Contabilidad': return 'danger';
      default: return undefined;
    }
  }
}
