import { CommonModule } from '@angular/common';
import { Component, ViewChild, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { GlpiService } from 'src/app/services/glpi.service';
import { UtilsService } from 'src/app/services/utils.service';
import { UserService } from 'src/app/services/user.service';
import { ProjectTechnicalService } from 'src/app/services/project-technical.service';
import { AuthService } from 'src/app/services/auth.service';
import { TicketDetailSidebarComponent } from 'src/app/components/modals/ticket-detail-sidebar/ticket-detail-sidebar.component';

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
  project_id?: number | null;
  commercial_status?: string | null;
  ready_for_project?: boolean;
}

type InspectionView = 'all' | 'ready';

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
    DialogModule,
    ToastModule,
    InputTextareaModule,
    MultiSelectModule,
    TicketDetailSidebarComponent
  ],
  templateUrl: './inspections-technical.component.html',
  styleUrls: ['./inspections-technical.component.sass']
})
export class InspectionsTechnicalComponent {
  @ViewChild('inspectionsTable') inspectionsTable?: Table;

  private readonly glpiService = inject(GlpiService);
  private readonly utilsService = inject(UtilsService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly projectTechnicalService = inject(ProjectTechnicalService);

  user_permissions_signal = computed(() => this.authService.user_permissions_signal());
  
  inspections: TechnicalInspection[] = [];
  isLoading = false;
  inspectionView: InspectionView = 'all';

  selectedInspection: any;
  showDetail = false;

  historyVisible = false;
  historyLoading = false;

  areaHistory: AreaTicketHistory[] = [];

  projectVisible = false;
  projectSaving = false;
  projectSubmitted = false;
  projectForm = { name: '', description: '', assigned_technicians: [] as string[] };
  users_intern: any[] = [];
  user_session: any;


    items: any = [
    {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        command: () => this.showDetail = true
    },
    {
        label: 'Historial',
        icon: 'pi pi-history',
        command: () => this.openHistoryDialog()
    },
    {
        label: 'Editar',
        icon: 'pi pi-history',
        visible: () => this.selectedInspection?.ticket_status != 'Listo para cotizar' && !this.selectedInspection?.ready_for_project,
        command: () => this.routeRegister()
    },
    {
        label: 'Nuevo proyecto',
        icon: 'pi pi-briefcase',
        // ready_for_project: comercial aprobado y sin proyecto creado (lo calcula el backend)
        visible: () => this.canCreateProject && !!this.selectedInspection?.ready_for_project,
        command: () => this.openProjectDialog()
    },
  ];

  ngOnInit(): void {
    this.user_session = this.userService.getDataSession();
    this.fetchInspections();
    this.fetchUsers();
  }

  fetchUsers(): void {
    const filters = {
      roles: ['tecnico']
    };
    this.userService.getUsers(filters).subscribe({
      next: (data: any) => {
        this.users_intern = (data?.data ?? []).map((user: any) => ({
          ...user,
          fullname: user.attributes?.fullname
        }));
      },
      error: (error: any) => {
        console.log(error);
      }
    });
  }

  openProjectDialog(): void {
    this.projectForm = { name: '', description: '', assigned_technicians: [] };
    this.projectSubmitted = false;
    this.projectVisible = true;
  }

  closeProjectDialog(): void {
    this.projectVisible = false;
  }

  get projectNameInvalid(): boolean {
    return !this.projectForm.name.trim();
  }

  get projectTechniciansInvalid(): boolean {
    return !this.projectForm.assigned_technicians.length;
  }

  saveProject(): void {
    this.projectSubmitted = true;
    if (this.projectNameInvalid || this.projectTechniciansInvalid) {
      this.utilsService.onWarn('Por favor, complete todos los campos requeridos.');
      return;
    }

    const data = {
      assigned_technicians: this.projectForm.assigned_technicians,
      description: this.projectForm.description.trim() || 'N/A',
      is_support: false,
      location_id: this.selectedInspection?.ubication_id,
      name: this.projectForm.name.trim(),
      user: this.user_session?.user,
      inspection_id: this.selectedInspection?.id_inspection
    };

    this.projectSaving = true;
    this.projectTechnicalService.postProject(data).subscribe({
      next: () => {
        this.projectSaving = false;
        this.projectVisible = false;
        this.utilsService.onSuccess('Proyecto creado correctamente.');
        // Recarga para que la inspección deje de estar lista para proyecto
        this.fetchInspections();
      },
      error: (error: any) => {
        this.projectSaving = false;
        console.log(error);
        this.utilsService.onError(error?.error?.message ?? 'No se pudo crear el proyecto, por favor intente nuevamente.');
      }
    });
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

  get canCreateProject(): boolean {
    return !!this.user_permissions_signal()?.includes('NUEVO_PROYECTO');
  }

  get readyInspections(): TechnicalInspection[] {
    return this.inspections.filter(inspection => inspection.ready_for_project);
  }

  get visibleInspections(): TechnicalInspection[] {
    return this.inspectionView === 'ready' ? this.readyInspections : this.inspections;
  }

  setInspectionView(view: InspectionView): void {
    this.inspectionView = view;
    this.inspectionsTable?.reset();
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

  routeRegister() {
    this.router.navigate([
      `/editar-inspeccion/${this.selectedInspection?.id_inspection}`
    ]);
  }
}
