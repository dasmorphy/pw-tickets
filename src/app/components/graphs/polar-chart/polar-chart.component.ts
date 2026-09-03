import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnChanges, OnInit, SimpleChange, SimpleChanges } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { DropdownModule } from 'primeng/dropdown';
import { DashboardService } from 'src/app/services/dashboard.service';
import { MenuService } from 'src/app/services/menu.service';
import { CalendarModule } from 'primeng/calendar';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { MultiSelectModule } from 'primeng/multiselect';
import annotationPlugin from "chartjs-plugin-annotation";
import { PolarAreaController } from 'chart.js';
import { LogbookService } from 'src/app/services/logbook.service';
import { LogbookDetailsGraphsComponent } from '../../modals/logbook-details-graphs/logbook-details-graphs.component';

@Component({
    selector: 'app-polar-chart',
    standalone: true,
    imports: [
        CommonModule,
        DropdownModule,
        CalendarModule,
        FormsModule,
        DialogModule,
        OverlayPanelModule,
        MultiSelectModule,
        LogbookDetailsGraphsComponent
    ],
    templateUrl: './polar-chart.component.html',
    styleUrls: ['./polar-chart.component.sass'],
})
export class PolarChartComponent implements OnChanges {
    @Input() dataPolar: any = [];
    @Input() filters: any = null;

    private readonly logbookService = inject(LogbookService);
    
    categories = computed(() => this.logbookService.categories());


    polarChart!: Chart;
    modalDetailsGraphs: boolean = false;


    constructor() {
        Chart.register(PolarAreaController, annotationPlugin);
    }

    ngOnChanges(changes: any): void {
        if (
            changes['dataPolar'] &&
            changes['dataPolar'].currentValue &&
            changes['dataPolar'].currentValue.length > 0
        ) {
            this.initPolarChart();
        }
    }

    formatNumber(value: number): string {
        if (value >= 1_000_000_000) {
            return (value / 1_000_000_000).toFixed(1) + 'B';
        }
        if (value >= 1_000_000) {
            return (value / 1_000_000).toFixed(1) + 'M';
        }
        if (value >= 1_000) {
            return (value / 1_000).toFixed(1) + 'k';
        }
        return value.toString();
    }


    initPolarChart() {
        const labels: string[] = this.dataPolar.map((item: any) => item.categoria);
        const totals: number[] = this.dataPolar.map((item: any) => item.total);

        const transformedTotals = totals.map(v =>
            v > 0 ? Math.log10(v) : 0
        );

        const shadowPlugin: any = {
            id: 'shadowPlugin', // ID del plugin
            beforeDatasetsDraw(chart: any) {
                const ctx = chart.ctx;
                ctx.save();
                ctx.shadowColor = 'rgba(55, 151, 121, 0.73)'; // Color de la sombra
                ctx.shadowBlur = 15; // Cantidad de difuminado de la sombra
                ctx.shadowOffsetX = 8 // Desplazamiento horizontal de la sombra
                ctx.shadowOffsetY = 8; // Desplazamiento vertical de la sombra
            },
            afterDatasetsDraw(chart: any) {
                chart.ctx.restore(); // Restablece el contexto después de dibujar
            }
        };

        const config: ChartConfiguration<'polarArea'>  = {
            type: 'polarArea',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Total',
                        data: transformedTotals,
                        backgroundColor: [
                            '#4caf4fd0',
                            '#2195f3b8',
                            '#ffc107b3',
                            '#ff5622af',
                            '#9b27b0aa',
                            '#00bbd4b0',
                            '#795548b0',
                            '#607d8bb0',
                            '#8bc34aae',
                            '#e91e62a5',
                            '#3f51b5b5'
                        ],
                    }
                ]
            },
            options: {
                responsive: true,
                onClick: (event, elements, chart) => {
                    if (!elements.length) return;

                    const element = elements[0];
                    const index = element.index;

                    const label = chart.data.labels?.[index];
                    // const value = chart.data.datasets[0].data[index];

                    this.filters = this.filters || {};
                    const categoryFound = this.categories()?.find((cat: any) => cat.name_category === label)
                    this.filters.ids_categories = [categoryFound?.id_category];
                    this.modalDetailsGraphs = true;
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context: any) => {
                                const realValue = totals[context.dataIndex];
                                return `${context.label}: ${this.formatNumber(realValue)}`;
                            }
                        }
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true
                        }
                    }
                },
                scales: {
                    r: {
                        ticks: {
                            callback: (value) => {
                                const numericValue = typeof value === 'number' ? value : Number(value);
                                return this.formatNumber(numericValue);
                            }
                        }
                    }
                }
            },
            plugins: [shadowPlugin]
        };

        const canvas = document.getElementById('polarChart') as HTMLCanvasElement;

        if (this.polarChart) {
            this.polarChart.destroy();
        }

        this.polarChart = new Chart(canvas, config);

    }

}