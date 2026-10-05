import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { KnobModule } from 'primeng/knob';
import { TooltipModule } from 'primeng/tooltip';
import { GlpiService } from 'src/app/services/glpi.service';
import { UtilsService } from 'src/app/services/utils.service';

interface AreaCount {
    area: string;
    count: number;
    percentage?: number;
}

interface AreaTime {
    area: string;
    duration: string;
    in_progress: boolean;
    seconds: number;
}

interface InspectionAreaTimes {
    id_inspection: number;
    title_ticket: string | null;
    management_area: string;
    areas: AreaTime[];
    timesByArea: Record<string, AreaTime>;
}

interface SlaArea {
    area: string;
    average_duration: string;
    average_seconds: number;
    transitions: number;
}

interface ProjectActivity {
    code: string;
    id_task: number;
    total_records: number;
}

interface AreaStyle {
    color: string;
    soft: string;
    icon: string;
}

const AREA_STYLES: Record<string, AreaStyle> = {
    'Técnica': { color: '#2f80ed', soft: '#eaf2fe', icon: 'pi pi-wrench' },
    'Comercial': { color: '#f2a93b', soft: '#fff6e6', icon: 'pi pi-briefcase' },
    'Proyectos': { color: '#27ae60', soft: '#e9f7ef', icon: 'pi pi-sitemap' },
    'Financiera': { color: '#eb5757', soft: '#fdeeee', icon: 'pi pi-dollar' },
};

const DEFAULT_AREA_STYLE: AreaStyle = { color: '#8a94a6', soft: '#f1f3f6', icon: 'pi pi-inbox' };

@Component({
    selector: 'app-tickets-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, ChartModule, KnobModule, TooltipModule],
    templateUrl: './tickets-dashboard.component.html',
    styleUrls: ['./tickets-dashboard.component.sass']
})
export class TicketsDashboardComponent {
    private readonly glpiService = inject(GlpiService);
    private readonly utilsService = inject(UtilsService);

    isLoading = false;

    pendingByArea: AreaCount[] = [];
    pendingTotal = 0;

    finishedByArea: AreaCount[] = [];
    finishedTotal = 0;
    finishedChartData: any;

    quotations = { approved: { count: 0, percentage: 0 }, rejected: { count: 0, percentage: 0 }, total: 0 };
    quotationsChartData: any;

    invoices = { issued: 0, collected: 0, collected_percentage: 0 };
    collectedKnobValue = 0;

    slaByArea: SlaArea[] = [];
    inspectionAreaTimes: InspectionAreaTimes[] = [];
    inspectionAreaColumns: string[] = [];

    projectActivities: ProjectActivity[] = [];
    maxProjectActivities = 0;

    readonly doughnutOptions = {
        cutout: '68%',
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => ` ${context.label}: ${context.raw}`
                }
            }
        }
    };

    ngOnInit(): void {
        this.fetchDashboard();
    }

    fetchDashboard(): void {
        this.isLoading = true;

        forkJoin({
            dashboard: this.glpiService.getDashboard(),
            activities: this.glpiService.getProjectActivities()
        }).subscribe({
            next: ({ dashboard, activities }: any) => {
                this.setDashboard(dashboard?.data ?? {});
                this.setProjectActivities(activities?.data);
                this.isLoading = false;
            },
            error: (error: any) => {
                console.log(error);
                this.isLoading = false;
                this.utilsService.onError(error?.error?.message ?? 'No se pudo obtener la información del dashboard.');
            }
        });
    }

    private setDashboard(data: any): void {
        this.pendingByArea = Array.isArray(data?.pending_by_area) ? data.pending_by_area : [];
        this.pendingTotal = this.pendingByArea.reduce((total, item) => total + (item.count ?? 0), 0);

        this.finishedByArea = data?.finished_by_area?.areas ?? [];
        this.finishedTotal = data?.finished_by_area?.total ?? 0;
        this.finishedChartData = {
            labels: this.finishedByArea.map(item => item.area),
            datasets: [{
                data: this.finishedByArea.map(item => item.count),
                backgroundColor: this.finishedByArea.map(item => this.getAreaStyle(item.area).color),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        };

        this.quotations = {
            approved: data?.quotations?.approved ?? { count: 0, percentage: 0 },
            rejected: data?.quotations?.rejected ?? { count: 0, percentage: 0 },
            total: data?.quotations?.total ?? 0
        };
        this.quotationsChartData = {
            labels: ['Aprobadas', 'Rechazadas'],
            datasets: [{
                data: [this.quotations.approved.count, this.quotations.rejected.count],
                backgroundColor: ['#22b573', '#eb5757'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        };

        this.invoices = data?.invoices ?? { issued: 0, collected: 0, collected_percentage: 0 };
        this.collectedKnobValue = Math.round(this.invoices.collected_percentage ?? 0);

        this.slaByArea = Array.isArray(data?.sla_by_area) ? data.sla_by_area : [];
        this.setInspectionAreaTimes(Array.isArray(data?.inspection_area_times) ? data.inspection_area_times : []);
    }

    private setInspectionAreaTimes(inspections: any[]): void {
        this.inspectionAreaTimes = inspections.map(inspection => ({
            ...inspection,
            timesByArea: Object.fromEntries((inspection.areas ?? []).map((time: AreaTime) => [time.area, time]))
        }));

        // Columnas fijas en el orden del flujo, más cualquier área nueva que envíe la API
        const extraAreas = this.inspectionAreaTimes
            .flatMap(inspection => inspection.areas?.map(time => time.area) ?? [])
            .filter(area => !(area in AREA_STYLES));
        this.inspectionAreaColumns = [...Object.keys(AREA_STYLES), ...new Set(extraAreas)];
    }

    private setProjectActivities(data: any): void {
        this.projectActivities = Array.isArray(data) ? data : [];
        this.maxProjectActivities = Math.max(0, ...this.projectActivities.map(item => item.total_records ?? 0));
    }

    getAreaStyle(area?: string | null): AreaStyle {
        return (area && AREA_STYLES[area]) || DEFAULT_AREA_STYLE;
    }

    getPendingPercentage(count: number): number {
        return this.pendingTotal ? (count / this.pendingTotal) * 100 : 0;
    }

    getActivityWidth(total: number): number {
        return this.maxProjectActivities ? (total / this.maxProjectActivities) * 100 : 0;
    }
}
