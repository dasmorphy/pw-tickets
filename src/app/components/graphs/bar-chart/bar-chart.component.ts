import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { DropdownModule } from 'primeng/dropdown';
import { DashboardService } from 'src/app/services/dashboard.service';
import { MenuService } from 'src/app/services/menu.service';
import { CalendarModule } from 'primeng/calendar';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { MultiSelectModule } from 'primeng/multiselect';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [
    CommonModule,
    DropdownModule,
    CalendarModule,
    FormsModule,
    DialogModule,
    OverlayPanelModule,
    MultiSelectModule
  ],
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.sass'],
})
export class BarChartComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly userService = inject(UserService);

  categoriesData: any[] = [];
  categoryChart!: Chart;

  optionFilterCategory = [
    { value: 'all', label: 'Todos' },
    { value: 'entrada', label: 'Entrada' },
    { value: 'salida', label: 'Salida' }
  ]
  
  user_session: any;

  ngOnInit() {
    this.user_session = this.userService.getDataSession();
    this.fetchDataGraphs()
  }


  fetchDataGraphs(filters?: any) {
    this.dashboardService.getResumeChart(filters).subscribe({
      next: (resp: any) => {
        this.categoriesData = resp.data.categorias;
        this.initCategoryChart('all'); // 🔥 carga inicial
      },
      error: (err) => console.error(err)
    });
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
