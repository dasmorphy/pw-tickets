import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MenuService } from 'src/app/services/menu.service';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LogbookService } from 'src/app/services/logbook.service';
import { UserService } from 'src/app/services/user.service';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Subscription } from 'rxjs';
import { UtilsService } from 'src/app/services/utils.service';
import { Chart, ChartConfiguration } from 'chart.js';
import { ProgressBarModule } from 'primeng/progressbar';
import { MeterGroupModule } from 'primeng/metergroup';
import { CardModule } from 'primeng/card';
import { CalendarModule } from 'primeng/calendar';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DashboardService } from 'src/app/services/dashboard.service';
import { TooltipModule } from 'primeng/tooltip';
import { PurchaseOrderService } from 'src/app/services/puchase-order.service';

@Component({
    selector: 'app-balanced-fuel',
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
    TableModule,
    TagModule,
    SplitButtonModule,
    ProgressBarModule,
    MeterGroupModule,
    CardModule,
    OverlayPanelModule,
    CalendarModule,
    TooltipModule
],
    templateUrl: './balanced-fuel.component.html',
    styleUrls: ['./balanced-fuel.component.sass'],
})
export class BalancedFuelComponent {
    @Input() filtersGraph: any;
    
    private readonly menuService = inject(MenuService);
    private readonly logbookService = inject(LogbookService);
    private readonly purchaseOrderService = inject(PurchaseOrderService);
    private readonly userService = inject(UserService);
    readonly utilsService = inject(UtilsService);
    readonly dashboardService = inject(DashboardService);

    private sseSub?: Subscription;
    private sseSubDispatch?: Subscription;

    toggle = computed(() => this.menuService.toggle());

    user_session: any;
    isLoading: boolean = false;
    showModal: boolean = false;
    selectedOrder: any = null;
    dateRange: Date[] | null = null;

    doughnutChart!: Chart;
    barChart!: Chart;

    graphStatus: any = [];
    graphTypes: any = [];
    graphDestiny: any = [];

    filters: any = {};
    dataPurchaseOrder: any [] = [];

    items: any = [
        {
            label: 'Ver detalles',
            icon: 'pi pi-eye',
            command: () => this.viewDispatchDetails(this.selectedOrder!)
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
            this.filters = filters;
            this.initializeGraph();
        }
    }

    ngOnDestroy() {
        this.sseSub?.unsubscribe();
        this.sseSubDispatch?.unsubscribe();
    }

    initializeGraph() {
        this.dashboardService.graphBlacklistBalanced(this.filters).subscribe({
            next: (data: any) => {
                const dataGraph = data?.data;
                this.graphStatus = dataGraph?.status_count?.status
                this.graphTypes = dataGraph?.status_count?.types
                this.graphDestiny = dataGraph?.count_destiny

                this.createDoughnutChart(
                    this.graphTypes?.balanceado?.count,
                    this.graphTypes?.combustible?.count,
                );
                this.createBarChart();
            },
            error: ({ error }: any) => this.utilsService.onError(error.message)
        })
        this.fetchAllData(); //TODO
    }

    getGraphStatus(status: string) {
       return this.graphStatus.find((graph: any) => graph.status_name === status)?.count ?? 0;
    }


    

    getStatusStyles(statusName: string) {
        switch (statusName) {
            case 'En tránsito':
                return {
                    background: '#f3e178',
                    color: '#8a9019'
                };
            case 'Ingresado en bodega':
                return {
                    background: '#9df18a',
                    color: '#158308'
                };
            case 'Listo para despacho':
                return {
                    background: '#bfdaec',
                    color: '#3b6d89'
                };
            default:
                return {
                    background: '#F3F4F6',
                    color: '#374151'
                };
        }
    }

    fetchAllData() {
        this.purchaseOrderService.getPurchaseOrderReceipts().subscribe({
            next: (data: any) => {
                this.dataPurchaseOrder = data?.data || [];
            },
            error: (error: any) => {
                console.log(error);
            }
        });
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

                ctx.fillText('Total', centerX, centerY - 30);

                // VALOR
                ctx.font = 'bold 24px Arial';
                ctx.fillStyle = '#111827';

                ctx.fillText(
                    `${total ?? 0}`,
                    centerX,
                    centerY - 8
                );

                ctx.restore();
            }
        };
    
        const config: ChartConfiguration<'doughnut'> = {
          type: 'doughnut',
          data: {
            labels: ['Balanceado', 'Combustible'],
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

    createBarChart() {
        const canvas = document.getElementById('tendencyChart') as HTMLCanvasElement;
        const labels = this.graphDestiny?.map((x: any) => x.name);
        const data = this.graphDestiny?.map((x: any) => x.count);

        if (!canvas) {
            return;
        }

        const config: ChartConfiguration<'bar'> = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Camaroneras',
                        data: data,
                        backgroundColor: '#111827',
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
                        ticks: {
                            callback: (value) => value
                        }
                    }
                }
            }
        };

        if (this.barChart) {
            this.barChart.destroy();
        }

        this.barChart = new Chart(canvas, config);
    }

    optionsDispatch(loogbook: any) {
        this.selectedOrder = loogbook
    }


    viewDispatchDetails(data: any) {
        this.selectedOrder = data;
        this.showModal = true;
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

    getSeverity(status: string) {
        switch (status) {
        case "Completado":
            return 'success';
        case "Incompleto":
            return 'warning';
        case "Con Novedad":
            return 'danger';
        default:
            return 'info';
        }
    }

}