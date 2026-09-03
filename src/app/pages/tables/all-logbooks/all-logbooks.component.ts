import { Component, computed, effect, ElementRef, inject, Input, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MenuItem, SelectItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { Router } from '@angular/router';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/calendar';
import { TimelineModule } from 'primeng/timeline';
import { SplitButtonModule } from 'primeng/splitbutton';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { DashboardService } from 'src/app/services/dashboard.service';
import { UserService } from 'src/app/services/user.service';
import { validate } from 'uuid';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { LogbookService } from 'src/app/services/logbook.service';
import { UtilsService } from 'src/app/services/utils.service';
import { LogBookDetailsModalComponent } from 'src/app/components/modals/logbook-details-modal/logbook-details-modal.component';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { AuthService } from 'src/app/services/auth.service';
import { debounceTime, distinctUntilChanged, filter, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-logbooks-table',
    standalone: true,
    imports: [
        CommonModule,
        DialogModule,
        FormsModule,
        ButtonModule,
        ProgressSpinnerModule,
        ToastModule,
        DropdownModule,
        TableModule,
        InputTextModule,
        ReactiveFormsModule,
        TagModule,
        CalendarModule,
        MultiSelectModule,
        TimelineModule,
        SplitButtonModule,
        NgxTippyModule,
        TieredMenuModule,
        LogBookDetailsModalComponent,
        OverlayPanelModule
    ],
    templateUrl: './all-logbooks.component.html',
    styleUrls: ['./all-logbooks.component.sass']
})
export class AllLogbookComponent {
    @ViewChild('dt_logbooks') dtLogbooks: any;

    @Input() dataModal: any = null;
    
    public readonly dashboardService = inject(DashboardService);
    public readonly userService = inject(UserService);
    public readonly logbookService = inject(LogbookService);
    public readonly utilsService = inject(UtilsService);
    public readonly authService = inject(AuthService);
    public readonly router = inject(Router);

    logbookSelected = computed(() => this.logbookService.showModalSummary());
    categories = computed(() => this.logbookService.categories());
    user_permissions_signal = computed(() => this.authService.user_permissions_signal());


    dataLogbooks: any = [];
    selectedLogbook: any = null;
    isLoading: boolean = true;
    showConfirmDelete: boolean = false;
    searchInput$ = new Subject<string>();

    optionSector: any = [];
    optionGroupBusiness: any = [];
    selectedGroupBusiness: number[] = [];
    selectedSector: number[] = [];
    selectedCategories: number[] = [];
    selectedTime: string[] = ['Diurna', 'Nocturna'];
    filters: any = {
        first: 1,
        rows: 5
    };
    dateRange: Date[] | null = null;
    totalRecords: number = 0;

    optionFilterCategory = [
        { value: 'all', label: 'Todos' },
        { value: 'entrada', label: 'Entrada' },
        { value: 'salida', label: 'Salida' }
    ]

    optionTime= [ 'Diurna', 'Nocturna']

    user_session: any



    breadCrumbItems: MenuItem[] = [
        { label: 'ventas', routerLink: ['/ventas'] },
    ];

    items: any = [
        {
            label: 'Ver detalles',
            icon: 'pi pi-eye',
            command: () => this.viewLogbookDetails(this.selectedLogbook)
        },
        {
            label: 'Continuar',
            icon: 'pi pi-play-circle',
            visible: () => this.user_permissions_signal().includes('CONTINUAR_BITACORA') && this.selectedLogbook?.status === 'Pendiente Salida',
            command: () => this.routeOut()
        },
        {
            label: 'Pdf',
            icon: 'pi pi-file-pdf',
            visible: () => this.user_permissions_signal().includes('BITACORA_PDF'),
            command: () => this.routeOut()
        },
        {
            label: 'Eliminar',
            icon: 'pi pi-trash',
            visible: () => this.user_permissions_signal().includes('ELIMINAR_BITACORA'),
            command: () => this.showConfirmDelete = true
        },
    ];


    ngOnInit() {
        this.user_session = this.userService.getDataSession();
        const user_attributes = this.user_session?.attributes;

        if (this.dataModal) {
            this.dataLogbooks = this.dataModal
        }

        if (this.user_permissions_signal()?.includes('DATA_BY_SECTOR')) {
            this.fetchGroupBusinessBySector(user_attributes?.sector?.[0])
        }else{
            this.fetchGroupBusinessByBusiness();
        }

        this.fetchSectorByBusiness();
        this.logbookService.getAllCategories();
        this.debounceSearch();
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

    fetchHistoryLogbook() {
        this.isLoading = true;
        const attributes = this.user_session?.attributes
        const filters = { ...this.filters };

        if (this.user_session?.role == 'guardia') {
            filters.user = this.user_session?.user
        }

        if (this.user_permissions_signal().includes('DATA_BY_GROUP_BUSINESS')) {
            filters.groups_business_id = attributes?.group_business?.toString()
        }

        if (this.user_permissions_signal().includes('DATA_BY_SECTOR')) {
            filters.sectors = attributes?.sector?.join(',') || '';
        }

        this.logbookService.getAllLogbooksPaginated(filters).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                const dataHistory = data?.data;
                this.dataLogbooks = dataHistory?.data;
                this.totalRecords = dataHistory?.pagination?.total;
            },
            error: (error: any) => {
                this.isLoading = false;
                console.log(error)
            }
        })
    }

    fetchReportHistory() {
        this.isLoading = true;
        this.user_session = this.userService.getDataSession();
        const filters = { ...this.filters };


        if (this.user_session?.role !== 'admin') {
            filters.user = this.user_session?.user
        }

        this.logbookService.getReportHistory(filters).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                this.utilsService.downloadFile(data, 'reporte_excel');
            },
            error: (error: any) => {
                this.isLoading = false;
                console.log(error)
            }
        })
    }

    reloadHistoryLogbook() {
        this.fetchHistoryLogbook();
    }

    generateReportHistory() {
        this.fetchReportHistory();
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

    applyFilter(imagePanel: any) {
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

        if (this.selectedCategories.length > 0) {
            filter_date.ids_categories = this.selectedCategories.join(',');;
        }

        this.filters = filter_date;
        this.fetchHistoryLogbook();
    }

    clearFilter() {
        this.dateRange = null;
        this.selectedGroupBusiness = [];
        this.selectedSector = [];
        this.selectedTime = ['Diurna', 'Nocturna'];
        this.selectedCategories = [];
        this.filters = { first: 1, rows: 5 };
        this.fetchHistoryLogbook();
    }

    onFilterChange(event: any) {
        console.log(event)
    }

    optionsLogbook(loogbook: any) {
        this.selectedLogbook = loogbook
    }

    routeOut() {
        this.router.navigate(['/reporte-salida'], {
            state: {
                data: this.selectedLogbook
            }
        });
    }

    viewLogbookDetails(log: any) {
        this.logbookService.openSummary(log);
    }

    getSeverity(status_logbook: string) {
        switch (status_logbook) {
        case "Finalizado":
            return 'success';
        case "Pendiente Salida":
            return 'warning';
        default:
            return 'info';
        }
    }

    deleteLogbook() {
        this.isLoading = true;
        this.showConfirmDelete = false;
        const id_logbook = this.selectedLogbook?.record_id;
        const type_logbook = this.selectedLogbook?.record_type == 'entry' ? 'entrada' : 'salida';

        this.logbookService.deleteLogbook(id_logbook, type_logbook).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                this.utilsService.onSuccess(data?.data?.message ?? 'Bitácora eliminada correctamente');
                this.fetchHistoryLogbook();
            },
            error: (error: any) => {
                this.isLoading = false;
                console.log(error)
                this.utilsService.onError(error?.error?.message ?? 'No se pudo eliminar la bitácora');
            }
        })
    }

    pageChange(event: any) {
        const page = (event.first / event.rows) + 1;
        this.filters.first = page;
        this.filters.rows = event.rows;
        this.fetchHistoryLogbook();
    }

    searchLogbook(valueSearch: any) {
        const value = valueSearch?.target?.value || '';
        this.filters.search = value
        this.searchInput$.next(value);
    }

    debounceSearch() {
        this.searchInput$.pipe(
            debounceTime(750),
            distinctUntilChanged(),
            filter(value => value.length >= 2 || value.length === 0),
            tap((valueSearch) => {
                this.dtLogbooks.first = 0;
                this.dtLogbooks.rows = 5;
                delete this.filters.first;
                delete this.filters.rows;
                this.filters.search = valueSearch || '';
                this.fetchHistoryLogbook();
            })
        ).subscribe();
    }
}
