import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { NgxTippyModule } from "ngx-tippy-wrapper";
import { PrimeNGConfig } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { CalendarModule } from "primeng/calendar";
import { CheckboxModule } from "primeng/checkbox";
import { DialogModule } from "primeng/dialog";
import { DropdownModule } from "primeng/dropdown";
import { InputNumberModule } from "primeng/inputnumber";
import { InputSwitchModule } from "primeng/inputswitch";
import { InputTextModule } from "primeng/inputtext";
import { MultiSelectModule } from "primeng/multiselect";
import { OverlayPanelModule } from "primeng/overlaypanel";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { SplitButtonModule } from "primeng/splitbutton";
import { TableModule } from "primeng/table";
import { TabViewModule } from "primeng/tabview";
import { TagModule } from "primeng/tag";
import { TieredMenuModule } from "primeng/tieredmenu";
import { TimelineModule } from "primeng/timeline";
import { ToastModule } from "primeng/toast";
import { TooltipModule } from "primeng/tooltip";
import { Dispatch } from "src/app/models/dispatch";
import { DashboardService } from "src/app/services/dashboard.service";
import { DispatchService } from "src/app/services/dispatch.service";
import { LogbookService } from "src/app/services/logbook.service";
import { PurchaseOrderService } from "src/app/services/puchase-order.service";
import { UserService } from "src/app/services/user.service";
import { UtilsService } from "src/app/services/utils.service";
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';


@Component({
    selector: 'app-purchase-order',
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
        OverlayPanelModule,
        InputSwitchModule,
        InputNumberModule,
        CheckboxModule,
        TooltipModule,
        TabViewModule,
        BadgeModule,
        ProgressBarModule
    ],
    templateUrl: './purchase-order.component.html',
    styleUrls: ['./purchase-order.component.sass']
})
export class PurchaseOrderComponent {
    public readonly dispatchService = inject(DispatchService);
    public readonly purchaseOrderService = inject(PurchaseOrderService);
    public readonly utilsService = inject(UtilsService);
    public readonly userService = inject(UserService);
    private readonly dashboardService = inject(DashboardService);
    private readonly logbookService = inject(LogbookService);


    showModal: boolean = false;
    showModalReceipts: boolean = false;
    showUploadExcel: boolean = false;
    showNewOrder: boolean = false;
    showUpdate: boolean = false;
    showAddDestiny: boolean = false;
    showAssignOrder: boolean = false;
    orderForm: FormGroup;

    expandedRows = {};

    dataPurchaseOrder: any[] = [];
    dataWithoutOrder: any[] = [];
    isLoading: boolean = false;
    selectedGroupBusiness: number[] = [];

    selectedOrder: any;
    selectedOrderReceipts: any;
    optionGroupBusiness = []
    destinyBySector = []
    selectedDestiny: number | null = null;
    selectedAssignOrder: number | null = null;
    typeOrders = ["BALANCEADO", "COMBUSTIBLE"]
    rangeDates: Date[] | undefined;
    checkAllDestinies: boolean = false;

    dateRangeFilter: Date[] | null = null;
    dateRangeFilterReceipts: Date[] | null = null;
    messageEmpty: string = "No hay opciones disponibles";

    filters: any = {
    };

    user_json: any;

    items: any = [
        {
            label: 'Ver detalles',
            icon: 'pi pi-eye',
            command: () => this.showModal = true
        },
        {
            label: 'Habilitar orden',
            icon: 'pi pi-play-circle',
            visible: () => this.selectedOrder?.status_name === 'Con Novedad' && this.comparisonDates(),
            command: () => this.showUpdate = true
        },
        {
            label: 'Agregar destino',
            icon: 'pi pi-map-marker',
            command: () => {this.showAddDestiny = true; this.checkAllDestinies = false;}
        },
    ];

    itemsWithoutOrder: any = [
        {
            label: 'Ver detalles',
            icon: 'pi pi-eye',
            command: () => this.showModalReceipts = true
        },
        {
            label: 'Asignar orden',
            icon: 'pi pi-play-circle',
            command: () => this.showAssignOrder = true
        },
    ];


    selectedExcelFile: File | null = null;
    isDraggingExcel: boolean = false;
    private readonly acceptedExcelType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    constructor(private fb: FormBuilder, private route: ActivatedRoute, private config: PrimeNGConfig,) {
        this.orderForm = this.fb.group({
            number_order: ['', Validators.required],
            type_order: ['', Validators.required],
            destiny_id: ['', Validators.required],
            provider: ['', Validators.required],
            quantity: [null, Validators.required],
            observations: [''],
        });
    }

    ngOnInit() {
        this.user_json = this.userService.getDataSession();
        const filters = { ...this.filters };
        this.fetchOrderPurchase();
        this.fetchWithoutOrder();
        this.fetchGroupBusinessByBusiness();
        this.fetchGroupBusinessBySector();

    }

    fetchGroupBusinessBySector() {
        const id_sector = this.user_json?.attributes?.sector?.[0] || 0;

        this.logbookService.getGroupBusinessBySector(id_sector).subscribe({
            next: (resp: any) => {
                this.destinyBySector = resp?.data
            },
            error: (err) => console.error(err)
        });
    }



    fetchOrderPurchase() {
        this.isLoading = true;
        const filters = { ...this.filters };

        this.purchaseOrderService.getAllPurchaseOrders(filters).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                this.dataPurchaseOrder = data?.data?.map((order: any) => ({
                    ...order,
                    label: `${order.number_order} - ${order.type_order}`
                }));
            },
            error: (error: any) => {
                this.isLoading = false;
                console.log(error)
            }
        })
    }

    fetchWithoutOrder() {
        this.isLoading = true;
        const filters = {
            ...this.filters, 
            withoutOrder: true
        };

        this.purchaseOrderService.getPurchaseOrderReceipts(filters).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                this.dataWithoutOrder = data?.data;
            },
            error: (error: any) => {
                this.isLoading = false;
                console.log(error)
            }
        })
    }

    fetchGroupBusinessByBusiness() {
        // const id_business = this.user_json?.attributes?.id_business
        this.dashboardService.getGroupBusinessByBusiness(1).subscribe({
            next: (resp: any) => {
                this.optionGroupBusiness = resp?.data
            },
            error: (err) => console.error(err)
        });
    }

    generateReportHistory() {
        this.fetchReportHistory();
    }

    fetchReportHistory() {
        this.isLoading = true;
        const filters = { ...this.filters };


        if (this.user_json?.role !== 'admin') {
            filters.user = this.user_json?.user
        }

        this.purchaseOrderService.excelOrders(filters).subscribe({
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

    assignOrder() {
        this.isLoading = true;
        const data = {
            id_purchase_order: this.selectedAssignOrder,
            id_receipt: this.selectedOrderReceipts?.id_receipts,
            user: this.user_json?.user
        }

        this.purchaseOrderService.assignReceiptsToOrder(data).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                this.showAssignOrder = false;
                this.selectedAssignOrder = null;
                this.fetchOrderPurchase();
                this.fetchWithoutOrder();
                this.utilsService.onSuccess("Registro asignado correctamente")
            },
            error: (error: any) => {
                this.isLoading = false;
                this.utilsService.onError(error?.error?.message ?? "No se pudo asignar el registro, intente nuevamente");
            }
        })
    }

    reloadDataPurchaseOrder() {
        this.fetchOrderPurchase();
    }

    reloadWithoutOrder() {
        this.fetchWithoutOrder();
    }

    optionsDispatch(loogbook: any) {
        this.selectedOrder = loogbook
    }


    optionsOrderReceipts(order_receipts: any) {
        const data_receipt = {
            ...order_receipts?.logbook_entry,
            id_receipts: order_receipts.id_receipts,
            images: order_receipts?.images,
            created_at: order_receipts?.created_at
        }
        this.selectedOrderReceipts = data_receipt;
    }

    comparisonDates() {
        const endDate = this.selectedOrder!.end_date.substring(0, 10);
        const today = this.utilsService.formatLocalDate(new Date());

        return today > endDate;
    }

    // expandAll() {
    //     this.expandedRows = this.dataPurchaseOrder.reduce((acc, p) => (acc[p.id] = true) && acc, {});
    // }

    // collapseAll() {
    //     this.expandedRows = {};
    // }

    onQuantityInput(event: Event): void {
        const input = event.target as HTMLInputElement;

        // Convierte comas en puntos
        let value = input.value.replace(/,/g, '.');

        // Elimina cualquier carácter que no sea número o punto
        value = value.replace(/[^0-9.]/g, '');

        // Permite solo un punto decimal
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }

        input.value = value;

        this.orderForm.get('quantity')?.setValue(value, {
            emitEvent: false
        });
    }


    saveOrder() {
        if (!this.rangeDates || this.rangeDates.length < 2) {
            this.utilsService.onWarn('Por favor, seleccione un rango de fechas válido.');
            return;
        }

        const [startDate, endDate] = this.rangeDates;

        this.utilsService.validateControlsForms(this.orderForm, ["observations"]);
        this.utilsService.showControlVoiled();

        if (this.orderForm.valid) {
            this.isLoading = true;
            const data_save = {
                ...this.orderForm.value,
                user: this.user_json?.user,
                start_date: this.utilsService.formatLocalDate(startDate),
                end_date: this.utilsService.formatLocalDate(endDate),
            };

            this.purchaseOrderService.savePurchaseOrder(data_save).subscribe({
                next: (data: any) => {
                    this.isLoading = false;
                    const message = data?.message ?? 'Orden de compra guardada correctamente'
                    this.utilsService.onSuccess(message)
                    this.rangeDates = undefined;
                    this.orderForm.reset();
                    this.showNewOrder = false;
                    this.fetchOrderPurchase();
                },
                error: (error: any) => {
                    console.log(error);
                    this.isLoading = false;
                    const error_message = error?.error?.message ?? 'Error al guardar orden de compra, por favor intente nuevamente'
                    this.utilsService.onError(error_message)
                }
            })
        }

    }

    applyFilter(imagePanel: any, isReceipts: boolean = false) {
        imagePanel.hide()
        let filter_date: any = {}
        const dateFilter = isReceipts ? this.dateRangeFilterReceipts : this.dateRangeFilter;

        if (Array.isArray(dateFilter)) {
            if (dateFilter.length === 2) {
                const [startDate, endDate] = dateFilter;

                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);

                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);

                filter_date.start_date = this.utilsService.formatLocalDate(start);
                filter_date.end_date = this.utilsService.formatLocalDate(end);
            };
        };

        if (this.selectedGroupBusiness.length > 0) {
            filter_date.destiny_id = this.selectedGroupBusiness.join(',');
        }

        this.filters = filter_date;
        isReceipts ? this.fetchWithoutOrder() : this.fetchOrderPurchase();
    }

    clearFilter(isReceipts: boolean = false) {
        isReceipts ? this.dateRangeFilterReceipts = null : this.dateRangeFilter = null;
        this.selectedGroupBusiness = [];
        this.filters = { first: 1, rows: 5 };

        isReceipts ? this.fetchWithoutOrder() : this.fetchOrderPurchase();
    }

    closeModalUpdateOrder() {
        this.showAddDestiny = false;
        this.selectedDestiny = null;
        this.checkAllDestinies = false;
    }

    closeModalAssignOrder() {
        this.showAssignOrder = false;
        this.selectedAssignOrder = null;
    }

    updateStatus(data: any) {
        this.showAddDestiny = false;
        this.isLoading = true;
        this.showUpdate = false;
        const data_save = {
            order: {
                ...data,
                user: this.user_json?.user,
            }
        };

        this.purchaseOrderService.updatePurchaseOrder(data_save, this.selectedOrder?.id_order).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                const message = data?.message ?? 'Estado de orden actualizado correctamente'
                this.utilsService.onSuccess(message)
                this.closeModalUpdateOrder();
                this.fetchOrderPurchase();
            },
            error: (error: any) => {
                console.log(error);
                this.isLoading = false;
                const error_message = error?.error?.message ?? 'Error al actualizar estado de orden, por favor intente nuevamente'
                this.utilsService.onError(error_message)
            }
        })
    }

    // assignOrder() {
    //     this.fetchOrderPurchaseWithoutReceipts();
    // }

    getNameDestinies(): string {
        return this.selectedOrder?.destinations?.map((destiny: any) => destiny.name).join(', ') ?? 'N/A';
    }


    viewDetailsReceipts(order_receipts: any) {
        const data_receipt = {
            ...order_receipts?.logbook_entry,
            id_receipts: order_receipts.id_receipts,
            images: order_receipts?.images,
            created_at: order_receipts?.created_at
        }
        this.selectedOrderReceipts = data_receipt;
        this.showModalReceipts = true;
    }

    closeModalOrderReceipts() {
        this.showModalReceipts = false;
        this.selectedOrderReceipts = null;
    }

    onDragOverExcel(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingExcel = true;
    }

    onDragLeaveExcel(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingExcel = false;
    }

    onDropExcel(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingExcel = false;

        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) {
            return;
        }

        if (files.length > 1) {
            this.utilsService.onWarn('Solo se permite subir un archivo a la vez.');
            return;
        }

        this.setExcelFile(files[0]);
    }

    onExcelInputChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            this.setExcelFile(file);
        }
        // Permite volver a seleccionar el mismo archivo
        input.value = '';
    }

    private setExcelFile(file: File) {
        if (!this.isValidExcel(file)) {
            this.utilsService.onWarn('Solo se permiten archivos con formato .xlsx');
            return;
        }
        this.selectedExcelFile = file;
    }

    private isValidExcel(file: File): boolean {
        const isXlsxExtension = file.name.toLowerCase().endsWith('.xlsx');
        const isXlsxType = !file.type || file.type === this.acceptedExcelType;
        return isXlsxExtension && isXlsxType;
    }

    removeExcelFile() {
        this.selectedExcelFile = null;
    }

    closeUploadExcelModal() {
        this.showUploadExcel = false;
        this.selectedExcelFile = null;
        this.isDraggingExcel = false;
    }

    uploadExcel() {
        if (!this.selectedExcelFile) {
            this.utilsService.onWarn('Por favor, seleccione un archivo .xlsx');
            return;
        }

        const formData = new FormData();
        formData.append('file', this.selectedExcelFile, this.selectedExcelFile.name);
        formData.append('user', this.user_json?.user);

        this.isLoading = true;
        this.purchaseOrderService.uploadExcelOrders(formData).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                const message = data?.message ?? 'Archivo subido correctamente';
                this.utilsService.onSuccess(message);
                this.closeUploadExcelModal();
                this.fetchOrderPurchase();
            },
            error: (error: any) => {
                this.isLoading = false;
                const error_message = error?.error?.message ?? 'Error al subir el archivo, por favor intente nuevamente';
                this.utilsService.onError(error_message);
            }
        });
    }

    formatSize(bytes: number) {
        if (!bytes || bytes === 0) {
            return '0 B';
        }
        const k = 1024;
        const dm = 2;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
        return `${formattedSize} ${sizes[i]}`;
    }

}