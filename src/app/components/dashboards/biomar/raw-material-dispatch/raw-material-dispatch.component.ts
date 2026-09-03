import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { Chart, ChartConfiguration } from 'chart.js';
import { MenuService } from 'src/app/services/menu.service';
import { DispatchService } from 'src/app/services/dispatch.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';
import { ButtonModule } from 'primeng/button';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { CalendarModule } from 'primeng/calendar';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TagModule } from 'primeng/tag';
import { Dispatch } from 'src/app/models/dispatch';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DispatchDetailsModalComponent } from 'src/app/components/modals/dispatch-details-modal/dispatch-details-modal.component';
import { ImageGalleryComponent } from 'src/app/components/modals/shared/preview-image/preview-image.component';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-raw-material-dispatch',
    standalone: true,
    imports: [
        CommonModule,
        CardModule,
        ProgressBarModule,
        TableModule,
        CalendarModule,
        ReactiveFormsModule,
        FormsModule,
        OverlayPanelModule,
        SplitButtonModule,
        TagModule,
        ButtonModule,
        DispatchDetailsModalComponent,
        ImageGalleryComponent,
        InputTextModule
    ],
    templateUrl: './raw-material-dispatch.component.html',
    styleUrls: ['./raw-material-dispatch.component.sass'],
})
export class RawMaterialDispatchComponent implements OnInit, OnDestroy {
    @Input() filtersGraph: any;
    private readonly menuService = inject(MenuService);
    private readonly dispatchService = inject(DispatchService);
    private readonly userService = inject(UserService);
    readonly utilsService = inject(UtilsService);
    dispatchSelected = computed(() => this.dispatchService.showModalSummary());

    toggle = computed(() => this.menuService.toggle());
    openModalImages = computed(() => this.utilsService.showModalImage());

    user_session: any;
    barChart!: Chart;

    graphDestiny: any = [];
    graphDispatchStatus: any = [];
    graphLast7Days: any = [];
    graphSkusStore: any;
    graphDiscrepancy: number = 0;
    selectedDispatch: Dispatch | null = null;
    dateRange: Date[] | null = null;
    dataDispatchs: Dispatch[] = [];

    filters: any = {};

    items: any = [
        {
            label: 'Ver detalles',
            icon: 'pi pi-eye',
            command: () => this.viewDispatchDetails(this.selectedDispatch!)
        },
    ];

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
            filters.type_process = 'dispatch';
            this.filters = filters;
            this.initializeGraph();
        }
    }

    ngOnDestroy() {
        if (this.barChart) {
            this.barChart.destroy();
        }
    }

    viewDispatchDetails(dispatch: Dispatch) {
        const dispatch_found = this.dataDispatchs.find(
            item => item.id_dispatch === dispatch.id_dispatch
        );
        
        if (dispatch_found) {
            this.dispatchService.openSummary(dispatch_found);
        } 
    }

    initializeGraph() {
        this.dispatchService.getGraphs(this.filters).subscribe({
            next: (data: any) => {
                const dataGraph = data?.data;
                this.graphDestiny = dataGraph?.destiny_count;
                this.graphDispatchStatus = dataGraph?.dispatch_by_status;
                this.graphSkusStore = dataGraph?.skus_store;
                this.graphDiscrepancy = dataGraph?.discrepancy;
                this.graphLast7Days = dataGraph?.discrepancy_7_days;
                
                // Crear gráfico de barras
                this.createBarChart();
            },
            error: ({ error }: any) => this.utilsService.onError(error.message)
        })
        this.fetchDataDispatch();
    }

    optionsDispatch(loogbook: any) {
        this.selectedDispatch = loogbook
    }

    getTotalDispatch() {
        return this.graphDispatchStatus?.reduce((total: number, item: any) => total + item.count, 0);
    }

    createBarChart() {
        const canvas = document.getElementById('newsBarChart') as HTMLCanvasElement;
        const labels = this.graphLast7Days?.map((x: any) => x.day);
        const withDiscrepancy = this.graphLast7Days?.map((x: any) => x.with_discrepancy);
        const withoutDiscrepancy = this.graphLast7Days?.map((x: any) => x.without_discrepancy);

        if (!canvas) {
            return;
        }

        const config: ChartConfiguration<'bar'> = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Correctos',
                        data: withoutDiscrepancy,
                        backgroundColor: '#111827',
                        borderRadius: 4,
                        barThickness: 20
                    },
                    {
                        label: 'Novedades',
                        data: withDiscrepancy,
                        backgroundColor: '#ef4444',
                        borderRadius: 4,
                        barThickness: 20
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: Math.max(...this.graphLast7Days.map((d: any) => d.without_discrepancy + d.with_discrepancy))
                    }
                }
            }
        };

        if (this.barChart) {
            this.barChart.destroy();
        }

        this.barChart = new Chart(canvas, config);
    }

    fetchDataDispatch() {
        this.dispatchService.getAllDispatchs({type_process: 'dispatch'}).subscribe({
            next: (data: any) => {
                this.dataDispatchs = data?.data || [];
            },
            error: (error: any) => {
                console.log(error);
            }
        });
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
    
}
