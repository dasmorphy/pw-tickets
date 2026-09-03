import { CommonModule } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NgxTippyModule } from "ngx-tippy-wrapper";
import { ButtonModule } from "primeng/button";
import { CalendarModule } from "primeng/calendar";
import { CheckboxModule } from "primeng/checkbox";
import { DialogModule } from "primeng/dialog";
import { DropdownModule } from "primeng/dropdown";
import { InputNumberModule } from "primeng/inputnumber";
import { InputSwitchModule } from "primeng/inputswitch";
import { InputTextModule } from "primeng/inputtext";
import { MultiSelectModule } from "primeng/multiselect";
import { OverlayPanelModule } from "primeng/overlaypanel";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { SplitButtonModule } from "primeng/splitbutton";
import { TableModule } from "primeng/table";
import { TabViewModule } from "primeng/tabview";
import { TagModule } from "primeng/tag";
import { TieredMenuModule } from "primeng/tieredmenu";
import { TimelineModule } from "primeng/timeline";
import { ToastModule } from "primeng/toast";
import { TooltipModule } from "primeng/tooltip";
import { ProjectTechnicalService } from "src/app/services/project-technical.service";
import { UserService } from "src/app/services/user.service";
import { UtilsService } from "src/app/services/utils.service";
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ImageModule } from "primeng/image";
import { AuthService } from "src/app/services/auth.service";

@Component({
    selector: 'app-project-technical',
    standalone: true,
    imports: [
        CommonModule,
        DialogModule,
        FormsModule,
        ButtonModule,
        ProgressSpinnerModule,
        ToastModule,
        DropdownModule,
        TableModule,
        InputTextModule,
        ReactiveFormsModule,
        TagModule,
        CalendarModule,
        MultiSelectModule,
        TimelineModule,
        SplitButtonModule,
        NgxTippyModule,
        TieredMenuModule,
        OverlayPanelModule,
        InputSwitchModule,
        InputNumberModule,
        CheckboxModule,
        TooltipModule,
        TabViewModule,
        BadgeModule,
        ProgressBarModule,
        InputTextareaModule,
        ImageModule
    ],
    templateUrl: './project-technical.component.html',
    styleUrls: ['./project-technical.component.sass']
})
export class ProjectTechnicalComponent {
    public readonly utilsService = inject(UtilsService);
    public readonly userService = inject(UserService);
    private readonly projectTechnicalService = inject(ProjectTechnicalService);
    public readonly authService = inject(AuthService);
    

    user_permissions_signal = computed(() => this.authService.user_permissions_signal());

    
    showModal: boolean = false;
    showModalRecord: boolean = false;

    expandedRows = {};

    dataProjects: any[] = [];
    isLoading: boolean = false;
    showUpdate: boolean = false;
    showDeleteProject: boolean = false;
    showDeleteRecord: boolean = false;
    
    typeRequest: string = '';
    commentaryUpdateStatus: string | null = null;

    selectedProject: any;
    selectedRecord: any;

    statusOptions: string[] = [
        "Pendiente aprobación", "Finalizado", "Aprobado", "Rechazado", "En ejecución"
    ];
    typeOptions: string[] = ["Proyecto", "Soporte"]
    selectedType: string[] = [];
    selectedStatus: string[] = [];
    dateRangeFilter: Date[] | null = null;
    messageEmpty: string = "No hay opciones disponibles";

    filters: any = {};

    user_json: any;

    items: any = [
        {
            label: 'Ver detalles',
            icon: 'pi pi-eye',
            command: () => this.showModal = true
        },
        {
            label: 'Aprobar finalización',
            icon: 'pi pi-check',
            visible: () => this.user_permissions_signal().includes('APROBAR_FINALIZACION') && this.selectedProject?.status === 'Pendiente aprobación',
            command: () => {
                this.showUpdate = true
                this.typeRequest = 'Aprobar solicitud'
            }
        },
        {
            label: 'Rechazar solicitud',
            icon: 'pi pi-times',
            visible: () => this.selectedProject?.status === 'Pendiente aprobación',
            command: () => {
                this.showUpdate = true
                this.typeRequest = 'Rechazar solicitud'
            }
        },
        {
            label: 'Eliminar',
            visible: () => this.user_permissions_signal().includes('ELIMINAR_PROYECTO'),
            icon: 'pi pi-trash',
            command: () => this.showDeleteProject = true
        },
    ];

    ngOnInit() {
        this.user_json = this.userService.getDataSession();
        this.fetchProjectsTechnical();
    }

    fetchProjectsTechnical() {
        this.isLoading = true;
        const filters = { ...this.filters };

        this.projectTechnicalService.getProjectsTechnical(filters).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                this.dataProjects = data?.data ?? [];
            },
            error: (error: any) => {
                this.isLoading = false;
                console.log(error)
            }
        })
    }

    reloadDataProjects() {
        this.fetchProjectsTechnical();
    }

    optionsProject(project: any) {
        this.selectedProject = project;
    }

    countRecords(project: any): number {
        return project?.record_technical?.length ?? 0;
    }

    viewDetailsRecord(record: any, project: any) {
        this.selectedRecord = {
            ...record,
            client: project?.client,
            location: project?.location,
            project_code: project?.code
        };
        this.showModalRecord = true;
    }

    closeModalProject() {
        this.showModal = false;
        this.selectedProject = null;
    }

    closeModalRecord() {
        this.showModalRecord = false;
        this.selectedRecord = null;
    }

    applyFilter(projectPanel: any) {
        projectPanel.hide();
        let filter_date: any = {};

        if (Array.isArray(this.dateRangeFilter) && this.dateRangeFilter.length === 2) {
            const [startDate, endDate] = this.dateRangeFilter;

            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            filter_date.start_date = this.utilsService.formatLocalDate(start);
            filter_date.end_date = this.utilsService.formatLocalDate(end);
        }

        if (this.selectedStatus.length > 0) {
            filter_date.status = this.selectedStatus.join(',');
        }
        console.log(22222)
        if (this.selectedType.length == 1) {
            filter_date.support = this.selectedType.includes("Soporte") ? true : false;
        }

        this.filters = filter_date;
        this.fetchProjectsTechnical();
    }

    clearFilter(projectPanel?: any) {
        projectPanel?.hide();
        this.dateRangeFilter = null;
        this.selectedStatus = [];
        this.filters = {};

        this.fetchProjectsTechnical();
    }

    updateStatus(status_update: string) {
        if (this.selectedProject) {
            this.isLoading = true;

            const updateData = {
                id_project : this.selectedProject?.id_task,
                new_status: status_update,
                user: this.user_json?.user ?? 'Desconocido',
                commentary: this.commentaryUpdateStatus,
                notification_type: this.typeRequest == 'Aprobar solicitud'
                    ? 'TECHNICAL_APPROVAL_REQUEST_APPROVED' 
                    : 'TECHNICAL_APPROVAL_REQUEST_REJECTED'
            };

            this.projectTechnicalService.updateStatusProject(updateData).subscribe({
                next: (data: any) => {
                    this.isLoading = false;
                    this.utilsService.onSuccess('Estado actualizado correctamente');
                    this.showUpdate = false;
                    this.fetchProjectsTechnical();
                },
                error: (error: any) => {
                    this.isLoading = false;
                    console.log(error)
                }
            })
        }
    }

    closeModalUpdate() {
        this.showUpdate = false
        this.commentaryUpdateStatus = null;
    }

    generatePdf(tech_record: any) {
        this.isLoading = true;
        this.projectTechnicalService.generateTechnicalRecordPdf(tech_record?.id_record).subscribe({
            next: (response: any) => {
                this.isLoading = false;
                this.utilsService.downloadFile(response, 'reporte_pdf');
            },
            error: () => {
                this.isLoading = false;
                this.utilsService.onError('Error al generar el archivo');
            }
        });
    }

    optionDeleteRecord(record: any) {
        this.selectedRecord = record;
        this.showDeleteRecord = true;
    }

    deleteTechRecord(tech_record: any) {
        this.isLoading = true;
        this.showDeleteRecord = false;
        this.projectTechnicalService.deleteTechnicalRecord(tech_record?.id_record).subscribe({
            next: (response: any) => {
                this.isLoading = false;
                this.utilsService.onSuccess('Registro eliminado');
                this.fetchProjectsTechnical()
            },
            error: () => {
                this.isLoading = false;
                this.utilsService.onError('Error al eliminar el registro');
            }
        });
    }

    deleteTechProject(tech_record: any) {
        this.isLoading = true;
        this.showDeleteProject = false;
        this.projectTechnicalService.deleteTechnicalProject(tech_record?.id_record).subscribe({
            next: (response: any) => {
                this.isLoading = false;
                this.utilsService.onSuccess('Registro eliminado');
                this.fetchProjectsTechnical()
            },
            error: () => {
                this.isLoading = false;
                this.utilsService.onError('Error al eliminar el registro');
            }
        });
    }

}
