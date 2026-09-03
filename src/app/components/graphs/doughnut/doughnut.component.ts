import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, Output } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { DropdownModule } from 'primeng/dropdown';
import { DashboardService } from 'src/app/services/dashboard.service';
import { MenuService } from 'src/app/services/menu.service';
import { CalendarModule } from 'primeng/calendar';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { MultiSelectModule } from 'primeng/multiselect';
import { PolarChartComponent } from '../polar-chart/polar-chart.component';
import { LogbookDetailsGraphsComponent } from '../../modals/logbook-details-graphs/logbook-details-graphs.component';
import { LogbookService } from 'src/app/services/logbook.service';
import { AuthService } from 'src/app/services/auth.service';
import { UtilsService } from 'src/app/services/utils.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-doughnut',
  standalone: true,
  imports: [
    CommonModule,
    DropdownModule,
    CalendarModule,
    FormsModule,
    DialogModule,
    OverlayPanelModule,
    MultiSelectModule,
    PolarChartComponent,
    LogbookDetailsGraphsComponent
  ],
  templateUrl: './doughnut.component.html',
  styleUrls: ['./doughnut.component.sass'],
})
export class DoughnutComponent {

  private readonly menuService = inject(MenuService);
  private readonly dashboardService = inject(DashboardService);
  private readonly logbookService = inject(LogbookService);
  private readonly authService = inject(AuthService);
  private readonly utilsService = inject(UtilsService);
  private readonly userService = inject(UserService);

  toggle = computed(() => this.menuService.toggle());
  categories = computed(() => this.logbookService.categories());
  user_permissions_signal = computed(() => this.authService.user_permissions_signal());

  dataCategoryQuantity: any = [];
  categoriesData: any[] = [];
  dateRange: Date[] | null = null;
  categoryChart!: Chart;
  logbookChart!: Chart;

  showImageDialog = false;
  optionSector: any = [];
  optionGroupBusiness: any = [];
  selectedGroupBusiness: number[] = [];
  selectedSector: number[] = [];
  selectedTime: string[] = ['Diurna', 'Nocturna'];
  filters: any = {};
  modalDetailsGraphs: boolean = false;

  optionFilterCategory = [
    { value: 'all', label: 'Todos' },
    { value: 'entrada', label: 'Entrada' },
    { value: 'salida', label: 'Salida' }
  ]

  optionTime = ['Diurna', 'Nocturna']
  user_session: any;

  ngOnInit() {
    this.user_session = this.userService.getDataSession();
    const user_attributes = this.user_session?.attributes;
    this.fetchDataGraphs()
    this.fetchSectorByBusiness();

    if (this.user_permissions_signal()?.includes('DATA_BY_SECTOR')) {
      this.fetchGroupBusinessBySector(user_attributes?.sector?.[0])
    } else {
      this.fetchGroupBusinessByBusiness();
    }

    this.logbookService.getAllCategories();
  }

  fetchSectorByBusiness() {
    const id_business = this.user_session?.attributes?.id_business
    this.dashboardService.getSectorByBusiness(id_business).subscribe({
      next: (resp: any) => {
        this.optionSector = resp?.data
        // this.selectedSector = this.optionSector?.map((sector: any) => sector.id_sector)
      },
      error: (err) => console.error(err)
    });
  }

  fetchGroupBusinessBySector(id_sector: number) {
    this.logbookService.getGroupBusinessBySector(id_sector).subscribe({
      next: (resp: any) => {
        this.optionGroupBusiness = resp?.data
        // this.selectedGroupBusiness  = this.optionGroupBusiness?.map((group_business: any) => group_business.id_group_business)
      },
      error: (err) => console.error(err)
    })
  }

  fetchGroupBusinessByBusiness() {
    const id_business = this.user_session?.attributes?.id_business
    this.dashboardService.getGroupBusinessByBusiness(id_business).subscribe({
      next: (resp: any) => {
        this.optionGroupBusiness = resp?.data
        // this.selectedGroupBusiness  = this.optionGroupBusiness?.map((group_business: any) => group_business.id_group_business)
      },
      error: (err) => console.error(err)
    });
  }

  fetchDataGraphs(filters?: any) {
    const attributes = this.user_session?.attributes
    const filterss = { ...(filters || {}) };

    if (!filters?.start_date && !filters?.end_date) {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const formatDate = (date: any) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}T00:00:00`;
      };

      filterss.start_date = formatDate(today);
      filterss.end_date = formatDate(tomorrow);

      this.filters.start_date = formatDate(today);
      this.filters.end_date = formatDate(tomorrow);
    }

    if (this.user_permissions_signal().includes('DATA_BY_GROUP_BUSINESS')) {
      filterss.groups_business_id = attributes?.group_business?.toString()
    }

    if (this.user_permissions_signal().includes('DATA_BY_SECTOR')) {
      filterss.sectors = attributes?.sector?.join(',') || '';
    }

    this.dashboardService.getResumeChart(filterss).subscribe({
      next: (resp: any) => {
        this.createLogbookChart(
          resp?.data.total_entrada,
          resp?.data.total_salida
        );
        this.categoriesData = resp.data.categorias;
        this.dataCategoryQuantity = resp.data.categorias_cantidad;
        this.initCategoryChart('all');
      },
      error: (err) => console.error(err)
    });
  }

  onFilterDate(imagePanel: any) {
    imagePanel.hide()
    let filter_date: any = {}

    if (Array.isArray(this.dateRange)) {
      if (this.dateRange.length === 2) {
        const [startDate, endDate] = this.dateRange;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        filter_date.start_date = this.formatLocalDate(start);
        filter_date.end_date = this.formatLocalDate(end);
      };
    };

    if (this.selectedGroupBusiness.length > 0) {
      filter_date.groups_business_id = this.selectedGroupBusiness.join(',');
    }

    if (this.selectedSector.length > 0) {
      filter_date.sectors = this.selectedSector.join(',');
    }

    if (this.selectedTime.length > 0) {
      filter_date.workday = this.selectedTime.join(',');;
    }

    this.filters = filter_date;
    this.fetchDataGraphs(filter_date);
  }

  formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');

    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  }




  // =====================
  // 📊 Inicializar chart
  // =====================
  initCategoryChart(filter: 'all' | 'entrada' | 'salida') {
    const { labels, values } = this.getChartData(filter);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: this.getDatasetLabel(filter),
          data: values,
          backgroundColor: [
            '#42A5F5',
            '#66BB6A',
            '#FFA726',
            '#AB47BC',
            '#26C6DA'
          ],
          borderRadius: 8, // 👈 barras redondeadas (opcional, se ve bonito)
          maxBarThickness: 50
        }]
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
          legend: { display: true, position: 'bottom' }
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

    const canvas = document.getElementById('categoryChart') as HTMLCanvasElement;

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    this.categoryChart = new Chart(canvas, config);
  }

  fetchHistoryLogbooks() {

  }

  // =====================
  // 🔄 Cambio de filtro
  // =====================
  onFilterChange(event: any) {
    const value = event?.value

    const { labels, values } = this.getChartData(value);

    this.categoryChart.data.labels = labels;
    this.categoryChart.data.datasets[0].data = values;
    this.categoryChart.update();
  }

  // =====================
  // 🧠 Data dinámica
  // =====================
  getChartData(filter: 'all' | 'entrada' | 'salida') {
    const labels = this.categoriesData.map(c => c.categoria);

    const values = this.categoriesData.map(c => {
      if (filter === 'entrada') return c.entrada;
      if (filter === 'salida') return c.salida;
      return c.total;
    });

    return { labels, values };
  }


  createLogbookChart(entrada: number, salida: number) {
    const total = entrada + salida;
    const centerTextPlugin = {
      id: 'centerText',
      beforeDraw(chart: any) {
        const { ctx, width, height } = chart;

        ctx.save();

        const text = chart.config.options.plugins.centerText.text;

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(text, width / 2, height / 2);

        ctx.restore();
      }
    };

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Bitácoras entrada', 'Bitácoras salida'],
        datasets: [{
          data: [entrada, salida],
          backgroundColor: ['#42A5F5', '#66BB6A'],
          hoverBackgroundColor: ['#1E88E5', '#43A047'],
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          centerText: {
            text: `${this.utilsService.formatNumber(total)}` // 👈 el texto que quieras mostrar
          }
        }
      } as any,
      // plugins: [centerTextPlugin]
    };

    const canvas = document.getElementById('myDoughnutChart') as HTMLCanvasElement;

    if (this.logbookChart) {
      this.logbookChart.destroy();
    }

    this.logbookChart = new Chart(canvas, config);
  }

  getDatasetLabel(filter: 'all' | 'entrada' | 'salida'): string {
    switch (filter) {
      case 'entrada':
        return 'Total de entradas';
      case 'salida':
        return 'Total de salidas';
      default:
        return 'Total';
    }
  }

}
