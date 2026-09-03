import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UserService } from 'src/app/services/user.service';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { TagModule } from 'primeng/tag';
import { SplitButtonModule } from 'primeng/splitbutton';
import { UtilsService } from 'src/app/services/utils.service';
import { Chart, ChartConfiguration } from 'chart.js';
import { ProgressBarModule } from 'primeng/progressbar';
import { MeterGroupModule } from 'primeng/metergroup';
import { CardModule } from 'primeng/card';
import { CalendarModule } from 'primeng/calendar';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ProjectTechnicalService } from 'src/app/services/project-technical.service';
import { InputTextareaModule } from 'primeng/inputtextarea';


@Component({
    selector: 'app-technical-dashboard',
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
    NgxTippyModule,
    TableModule,
    TagModule,
    SplitButtonModule,
    ProgressBarModule,
    MeterGroupModule,
    CardModule,
    OverlayPanelModule,
    CalendarModule,
    InputTextareaModule
],
    templateUrl: './technical-dashboard.component.html',
    styleUrls: ['./technical-dashboard.component.sass'],
})
export class TechnicalDashboardComponent {
    @Input() filtersGraph: any;
    
    private readonly userService = inject(UserService);
    private readonly technicalService = inject(ProjectTechnicalService);
    readonly utilsService = inject(UtilsService);

    user_session: any;
    isLoading: boolean = false;
    selectedDispatch: any = null;
    dateRange: Date[] | null = null;    
    doughnutChart!: Chart;
    
    graphCountStatus: any = [];
    graphAuditing: any = [];
    pending_tasks: any[] = [];
    filters: any = {};
    showModal: boolean = false;

    showUpdate: boolean = false;
    typeRequest: string = '';
    commentaryUpdateStatus: string | null = null;
    selectedProject: any;

    ngOnInit() {
        this.user_session = this.userService.getDataSession();
        const filters = { ...this.filters };
        filters.type_process = 'dispatch';
        this.filters = filters;
        this.initializeGraph();
    }

    ngOnChanges(changes: any) {
        const filtersGraph = changes.filtersGraph?.currentValue;

        if (
            filtersGraph &&
            typeof filtersGraph === 'object' &&
            !Array.isArray(filtersGraph) &&
            Object.keys(filtersGraph).length > 0
        ) {
            const filters = { ...this.filters, ...this.filtersGraph };
            this.filters = filters;
            this.initializeGraph();
        }
    }

    initializeGraph() {
        this.fetchAllData();
        this.technicalService.getResumeGraphsTechnical(this.filters).subscribe({
            next: (data: any) => {
                this.graphAuditing = data?.data?.auditing_percentaje;
                this.graphCountStatus = data?.data?.count_status;

                this.createDoughnutChart(
                    this.graphAuditing?.audited ?? 0,
                    this.graphAuditing?.not_audited ?? 0,
                );
            },
            error: (error: any) => {
                console.log(error)
            }
        })

    }

    getGraphAuditing(type_access: string) {
       return this.graphAuditing.find((graph: any) => graph.type_access === type_access)?.count ?? 0;
    }

    getGraphCountStatus(status: string) {
       return this.graphCountStatus.find((graph: any) => graph.status === status)?.count ?? 0;
    }


    fetchAllData() {
        this.technicalService.getProjectsTechnical(
            {
                "status": ["Pendiente aprobación"]
            }
        ).subscribe({
            next: (data: any) => {
                this.pending_tasks = data?.data || [];
            },
            error: (error: any) => {
                console.log(error);
            }
        });
    }

    approveRequest(item: any) {
        this.selectedProject = item;
        this.showUpdate = true
        this.typeRequest = 'Aprobar solicitud'
    }

    rejectRequest(item: any) {
        this.selectedProject = item;
        this.showUpdate = true
        this.typeRequest = 'Rechazar solicitud'
    }


    createDoughnutChart(entrada: number, salida: number) {
        const total = entrada + salida;
        const centerTextPlugin = {
            id: 'centerText',
            beforeDraw(chart: any) {

                const { ctx, width, height } = chart;

                ctx.save();

                const centerX = width / 2;
                const centerY = height / 2;

                // TEXTO SUPERIOR
                ctx.font = '500 14px Arial';
                ctx.fillStyle = '#6b7280';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillText('Auditados', centerX, centerY - 30);

                // VALOR
                ctx.font = 'bold 24px Arial';
                ctx.fillStyle = '#111827';

                ctx.fillText(
                    `${entrada ?? 0}%`,
                    centerX,
                    centerY - 8
                );

                ctx.restore();
            }
        };
    
        const config: ChartConfiguration<'doughnut'> = {
          type: 'doughnut',
          data: {
            labels: ['Auditados', 'Sin auditar'],
            datasets: [{
                data: [entrada, salida],
                backgroundColor: ['#091426', '#515f74'],
                hoverBackgroundColor: ['#091426', '#515f74'],

                borderRadius: 10,
                spacing: 2,
                borderWidth: 0
            }]
          },
          options: {
            cutout: '80%',
            responsive: true,
            plugins: {
              legend: { position: 'bottom' },
              centerText: {
                text: `${this.utilsService.formatNumber(total)}` // 👈 el texto que quieras mostrar
              }
            }
          } as any,
          plugins: [centerTextPlugin]
        };
    
        const canvas = document.getElementById('myDoughnutChart') as HTMLCanvasElement;
    
        if (this.doughnutChart) {
          this.doughnutChart.destroy();
        }
    
        this.doughnutChart = new Chart(canvas, config);
    }


    onFilterDate(op: any) {
        op.hide()
        let filter_date: any = {}

        if (Array.isArray(this.dateRange)) {
        if (this.dateRange.length === 2) {
            const [startDate, endDate] = this.dateRange;

            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            filter_date.start_date = this.utilsService.formatLocalDate(start);
            filter_date.end_date = this.utilsService.formatLocalDate(end);
        };
        };

        this.filters = filter_date;
    }

    clearFilter(op: any) {
        op.hide()
        this.dateRange = null;
        this.filters = {};
    }

    updateStatus(status_update: string) {
        if (this.selectedProject) {
            this.isLoading = true;

            const updateData = {
                id_project : this.selectedProject?.id_task,
                new_status: status_update,
                user: this.user_session?.user ?? 'Desconocido',
                commentary: this.commentaryUpdateStatus,
                notification_type: this.typeRequest == 'Aprobar solicitud'
                    ? 'TECHNICAL_APPROVAL_REQUEST_APPROVED' 
                    : 'TECHNICAL_APPROVAL_REQUEST_REJECTED'
            };

            this.technicalService.updateStatusProject(updateData).subscribe({
                next: (data: any) => {
                    this.isLoading = false;
                    this.utilsService.onSuccess('Estado actualizado correctamente');
                    this.showUpdate = false;
                    this.fetchAllData();
                },
                error: (error: any) => {
                    this.isLoading = false;
                    console.log(error)
                }
            })
        }
    }

    closeModalUpdate() {
        this.selectedProject = null;
        this.showUpdate = false
        this.commentaryUpdateStatus = null;
    }

    closeModalProject() {
        this.showModal = false;
        this.selectedProject = null;
    }

    openModalDetails(item: any) {
        this.selectedProject = item;
        this.showModal = true;
    }

}