import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AvatarModule } from "primeng/avatar";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { DialogModule } from "primeng/dialog";
import { DropdownModule } from "primeng/dropdown";
import { FileUploadModule } from "primeng/fileupload";
import { InputNumberModule } from "primeng/inputnumber";
import { InputTextModule } from "primeng/inputtext";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { SplitButtonModule } from "primeng/splitbutton";
import { TableModule } from "primeng/table";
import { ToastModule } from "primeng/toast";
import { TooltipModule } from "primeng/tooltip";
import { ProjectTechnicalService } from "src/app/services/project-technical.service";
import { UserService } from "src/app/services/user.service";
import { UtilsService } from "src/app/services/utils.service";
import { TagModule } from "primeng/tag";
import { CalendarModule } from "primeng/calendar";
import { ImageModule } from "primeng/image";
import { Router } from "@angular/router";



@Component({
    selector: 'app-auditing-technical',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        AvatarModule,
        InputTextModule,
        DropdownModule,
        InputNumberModule,
        FormsModule,
        ReactiveFormsModule,
        ToastModule,
        ProgressSpinnerModule,
        DialogModule,
        FileUploadModule,
        TableModule,
        CardModule,
        TooltipModule,
        SplitButtonModule,
        TagModule,
        CalendarModule,
        ImageModule
    ],
    templateUrl: './auditing-technical.component.html',
    styleUrls: ['./auditing-technical.component.sass'],
})
export class AuditingTechnicalComponent {
    public readonly utilsService = inject(UtilsService);
    public readonly userService = inject(UserService);
    private readonly projectTechnicalService = inject(ProjectTechnicalService);
    private readonly router = inject(Router);

    showModal: boolean = false;
    showModalRecord: boolean = false;

    dataProjects: any[] = [];
    dataAuditing: any[] = [];
    isLoading: boolean = false;
    showUpdate: boolean = false;
    typeRequest: string = '';
    commentaryUpdateStatus: string | null = null;

    selectedProject: any;
    selectedRecord: any;

    statusOptions: string[] = [];
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
            visible: () => this.selectedProject?.status === 'Pendiente aprobación',
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
    ];

    ngOnInit() {
        this.user_json = this.userService.getDataSession();
        this.fetchAuditingTechnical();
    }

    fetchAuditingTechnical() {
        this.isLoading = true;
        const filters = { ...this.filters };

        this.projectTechnicalService.getAuditingTechnical(filters).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                this.dataAuditing = data?.data ?? [];
            },
            error: (error: any) => {
                this.isLoading = false;
                console.log(error)
            }
        })
    }

    reloadData() {
        this.fetchAuditingTechnical();
    }

    createAuditing() {
        void this.router.navigate(['/nueva-fiscalizacion']);
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

        this.filters = filter_date;
        this.fetchAuditingTechnical();
    }

    clearFilter(projectPanel?: any) {
        projectPanel?.hide();
        this.dateRangeFilter = null;
        this.selectedStatus = [];
        this.filters = {};

        this.fetchAuditingTechnical();
    }

    closeModalUpdate() {
        this.showUpdate = false
        this.commentaryUpdateStatus = null;
    }



}
