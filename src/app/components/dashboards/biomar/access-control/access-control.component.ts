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
import { DispatchService } from 'src/app/services/dispatch.service';
import { TableModule } from 'primeng/table';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { TagModule } from 'primeng/tag';
import { SplitButtonModule } from 'primeng/splitbutton';
import { Subscription } from 'rxjs';
import { EventSourceService } from 'src/app/services/event-source.service';
import { UtilsService } from 'src/app/services/utils.service';
import { EntryDetailsModalComponent } from 'src/app/components/modals/entry-details-modal/entry-details-modal.component';
import { ImageGalleryComponent } from 'src/app/components/modals/shared/preview-image/preview-image.component';
import { Chart, ChartConfiguration } from 'chart.js';
import { ProgressBarModule } from 'primeng/progressbar';
import { MeterGroupModule } from 'primeng/metergroup';
import { CardModule } from 'primeng/card';
import { CalendarModule } from 'primeng/calendar';
import { OverlayPanelModule } from 'primeng/overlaypanel';


@Component({
    selector: 'app-access-dashboard',
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
    EntryDetailsModalComponent,
    ImageGalleryComponent
],
    templateUrl: './access-control.component.html',
    styleUrls: ['./access-control.component.sass'],
})
export class AccessControlComponent {
    @Input() filtersGraph: any;
    
    private readonly menuService = inject(MenuService);
    private readonly logbookService = inject(LogbookService);
    private readonly dispatchService = inject(DispatchService);
    private readonly userService = inject(UserService);
    private readonly eventSourceService = inject(EventSourceService);
    readonly utilsService = inject(UtilsService);

    private sseSub?: Subscription;
    private sseSubDispatch?: Subscription;

    toggle = computed(() => this.menuService.toggle());
    graphs = computed(() => this.dispatchService.graphsDispatch());
    entrySelected = computed(() => this.dispatchService.showModalSummaryEntry());
    dispatchSelected = computed(() => this.dispatchService.showModalSummary());
    openModalImages = computed(() => this.utilsService.showModalImage());

    user_session: any;
    isLoading: boolean = false;
    selectedDispatch: any = null;
    dateRange: Date[] | null = null;

    doughnutChart!: Chart;
    

    graphEntryStatus: any = [];
    graphCountTypeAccess: any = [];
    graphTopMaterials: any = [];

    filters: any = {};
    dataBiomar: any [] = [];

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
            this.filters = filters;
            this.initializeGraph();
        }
    }

    ngOnDestroy() {
        this.sseSub?.unsubscribe();
        this.sseSubDispatch?.unsubscribe();
    }

    initializeGraph() {
        this.dispatchService.getGraphs(this.filters).subscribe({
            next: (data: any) => {
                const dataGraph = data?.data;
                this.graphEntryStatus = dataGraph?.entry_biomar?.entry_by_status
                this.graphCountTypeAccess = dataGraph?.entry_biomar?.count_type_access
                this.graphTopMaterials = dataGraph?.entry_biomar?.top_materials

                this.createDoughnutChart(
                    this.graphCountTypeAccess?.[0]?.percentage,
                    this.graphCountTypeAccess?.[1]?.percentage,
                );
            },
            error: ({ error }: any) => this.utilsService.onError(error.message)
        })
        this.fetchAllData(); //TODO
    }

    getGraphEntryStatus(status: string) {
       return this.graphEntryStatus.find((graph: any) => graph.status_name === status)?.count ?? 0;
    }

    getGraphCountTypeAccess(type_access: string) {
       return this.graphCountTypeAccess.find((graph: any) => graph.type_access === type_access)?.count ?? 0;
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
        this.dispatchService.getAllEntryAccess().subscribe({
            next: (data: any) => {
                this.dataBiomar = data?.data || [];
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

                ctx.fillText('Proveedores', centerX, centerY - 30);

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
            labels: ['Proveedor', 'Visitante'],
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


    optionsDispatch(loogbook: any) {
        this.selectedDispatch = loogbook
    }


    viewDispatchDetails(data: any) {
        if (data?.id_access_control) {
            this.dispatchService.openSummaryEntry(data);
        }else{
            this.dispatchService.openSummary(data);
        }
    }

    valueProgressBar(process: string) {
        const pending = this.graphEntryStatus?.find((item: any) => item.status_name === 'Pendiente Salida')?.count || 0;
        const total = this.graphEntryStatus?.find((item: any) => item.status_name === 'Total')?.count || 0;
        const finalized = this.graphEntryStatus?.find((item: any) => item.status_name === 'Finalizado')?.count || 0;

        let value = 0;

        if (process === 'pending') {
            value = pending;
        } else if (process === 'finalized') {
            value = finalized;
        }

        const valueCalc = (value) / total * 100

        if (isNaN(valueCalc)) {
            return 0;
        }

        return valueCalc.toFixed(0) ?? 0
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