import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MenuService } from 'src/app/services/menu.service';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DoughnutComponent } from 'src/app/components/graphs/doughnut/doughnut.component';
import { UserService } from 'src/app/services/user.service';
import { DialogModule } from 'primeng/dialog';
import { LogbookRecentComponent } from 'src/app/components/logbook/logbook-recent/logbook-recent.component';
import { AuthService } from 'src/app/services/auth.service';
import { AccessControlComponent } from 'src/app/components/dashboards/biomar/access-control/access-control.component';
import { RawMaterialDispatchComponent } from 'src/app/components/dashboards/biomar/raw-material-dispatch/raw-material-dispatch.component';
import { FinishedProductDispatchComponent } from 'src/app/components/dashboards/biomar/finished-product-dispatch/finished-product-dispatch.component';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { CalendarModule } from 'primeng/calendar';
import { LogbookService } from 'src/app/services/logbook.service';
import { MultiSelectModule } from 'primeng/multiselect';
import { BalancedFuelComponent } from 'src/app/components/dashboards/expalsa-options/balanced-fuel/balanced-fuel.component';
import { TechnicalDashboardComponent } from 'src/app/components/dashboards/technical/technical-dashboard.component';

@Component({
    selector: 'app-dashboard',
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
        DoughnutComponent,
        DialogModule,
        LogbookRecentComponent,
        RawMaterialDispatchComponent,
        FinishedProductDispatchComponent,
        AccessControlComponent,
        OverlayPanelModule,
        CalendarModule,
        MultiSelectModule,
        BalancedFuelComponent,
        TechnicalDashboardComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.sass'],
})
export class DashboardComponent {
    private readonly menuService = inject(MenuService);
    private readonly authService = inject(AuthService);
    private readonly userService = inject(UserService);
    private readonly logbookService = inject(LogbookService);

    toggle = computed(() => this.menuService.toggle());
    destinyIntern = computed(() => this.logbookService.destinyIntern());
    user_permissions_signal = computed(() => this.authService.user_permissions_signal());

    user_session: any;
    isLoading: boolean = false;
    optionsDashboard = ["Expalsa", "Biomar", "Técnicos"];
    optionsGraphBiomar = ["Control de acceso", "Despacho de materia prima", "Despacho de producto terminado"];
    optionsGraphExpalsa = ["Bitácoras", "Balanceado y combustible"];
    optionDashboardSelected = "";
    optionGraphBiomarSelected = "Control de acceso";
    optionGraphExpalsaSelected = "Bitácoras";
    
    filters: any = {};

    dateRange: Date[] | null = null;
    selectedDestiny: any = [];


    ngOnInit() {
        this.user_session = this.userService.getDataSession();

        if (this.user_session.role === "admin_tlsg") {
            this.optionDashboardSelected = "Expalsa";
        }
        this.logbookService.getAllDestinyIntern({business: "2"});

    }
    
    onChangeDahboard(option: string) {
        this.optionDashboardSelected = option
    }

    onChangeGraphBiomar(option: string) {
        this.optionGraphBiomarSelected = option
    }

    onChangeGraphExpalsa(option: string) {
        this.optionGraphExpalsaSelected = option
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

            filter_date.start_date = this.formatLocalDate(start);
            filter_date.end_date = this.formatLocalDate(end);
        };
        };

        filter_date.destiny = this.selectedDestiny.length > 0 ? this.selectedDestiny.join(',') : null;

        this.filters = filter_date;
    }

    clearFilter(op: any) {
        op.hide()
        this.dateRange = null;
        this.selectedDestiny = [];
        this.filters = {};
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

}