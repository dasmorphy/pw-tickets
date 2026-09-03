import { Component, computed, inject } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { MultiSelectModule } from 'primeng/multiselect';
import { CalendarModule } from 'primeng/calendar';
import { TimelineModule } from 'primeng/timeline';
import { SplitButtonModule } from 'primeng/splitbutton';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { UserService } from 'src/app/services/user.service';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { UtilsService } from 'src/app/services/utils.service';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DispatchService } from 'src/app/services/dispatch.service';
import { EntryAccess } from 'src/app/models/entry-access';
import { EntryDetailsModalComponent } from 'src/app/components/modals/entry-details-modal/entry-details-modal.component';
import { FileUploadModule } from 'primeng/fileupload';
import { v4 as uuidv4} from 'uuid';
import { InputSwitchModule } from 'primeng/inputswitch';

@Component({
    selector: 'app-entry-access-table',
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
        FileUploadModule,
        EntryDetailsModalComponent,
        InputSwitchModule
    ],
    templateUrl: './all-entry-access.component.html',
    styleUrls: ['./all-entry-access.component.sass']
})
export class AllEntryAccessComponent {


    public readonly dispatchService = inject(DispatchService);
    public readonly utilsService = inject(UtilsService);
    public readonly userService = inject(UserService);

    entrySelected = computed(() => this.dispatchService.showModalSummaryEntry());
    areasVisit = computed(() => this.dispatchService.areasVisit());

    dataEntries: EntryAccess[] = [];
    isLoading: boolean = false;
    showUpdate: boolean = false;
    observationOut: string = '';
    selectedEntry: EntryAccess | null = null;

    dateRange: Date[] | null = null;
    selectedAreasVisit:number[] = [];
    filters: any = {};

    images: File[] = [];
    imagesError: string | null = null;
    user_json: any;
    checkedMaterials = new Set<number>();

    items: any = [
        {
            label: 'Ver detalles',
            icon: 'pi pi-eye',
            command: () => this.viewDispatchDetails(this.selectedEntry!)
        },
        {
            label: 'Crear salida',
            icon: 'pi pi-play-circle',
            visible: () => this.selectedEntry?.status === 'Pendiente Salida',
            command: () => this.showUpdate = true
        },
    ];

    ngOnInit() {
        this.user_json = this.userService.getDataSession();
        this.fetchAllEntries();
        this.dispatchService.getAllAreas();
    }

    fetchAllEntries() {
        const filters = { ...this.filters };
        this.isLoading = true;
        this.dispatchService.getAllEntryAccess(filters).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                this.dataEntries = data?.data;
            },
            error: (error: any) => {
                this.isLoading = false;
                console.log(error)
            }
        })
    }

    reloadDataDispatch() {
        this.fetchAllEntries();
    }

    optionsDispatch(entry: any) {
        this.checkedMaterials.clear();
        this.selectedEntry = entry
    }

    getSeverity(status: string) {
        switch (status) {
        case "Finalizado":
            return 'success';
        case "Pendiente Salida":
            return 'warning';
        default:
            return 'info';
        }
    }

    viewDispatchDetails(entry: EntryAccess) {
        const entry_found = this.dataEntries.find(
            item => item.id_access_control === entry.id_access_control
        );
        
        if (entry_found) {
            this.dispatchService.openSummaryEntry(entry_found);
        } 
    }

    closeModal() {
        this.showUpdate = false;
        this.observationOut = '';
        this.images = [];
    }

    onSelectImages(event: any) {
        const selectedFiles: File[] = event.files;

        this.images = [...this.images, ...selectedFiles];

        if (this.images.length < 5) {
            this.imagesError = 'Debe subir al menos 5 imágenes';
            return;
        }

        if (this.images.length > 10) {
            this.imagesError = 'No puede subir más de 10 imágenes';
            this.images = this.images.slice(0, 10); // 👈 recorta exceso
            return;
        }

        this.imagesError = null;
    }

    onRemoveImages(event: any) {
        const removedFile = event.file;

        const index = this.images.findIndex(
            file => file.name === removedFile.name &&
            file.size === removedFile.size &&
            file.lastModified === removedFile.lastModified
        );

        if (index !== -1) {
            this.images.splice(index, 1);
        }
    }

    onToggle(material: any, checked: boolean) {
        if (checked) {
            this.checkedMaterials.add(material.id_material);
        } else {
            this.checkedMaterials.delete(material.id_material);
        }
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

        if (this.selectedAreasVisit.length > 0) {
            filter_date.areas = this.selectedAreasVisit.join(',');
        }

        this.filters = filter_date;
        console.log(this.filters)
        this.fetchAllEntries();
    }

    clearFilter() {

    }

    onSaveOut() {
        const total = this.selectedEntry?.materials?.length || 0;

        if (this.checkedMaterials.size !== total) {
            this.utilsService.onError('Se debe marcar todos los materiales para continuar');
            return;
        }


        if (this.images.length < 2) {
            this.imagesError = 'Debes subir mínimo 2 imágenes';
            this.isLoading = false;
            return;
        }
        
        this.isLoading = true;

        const data_save = {
            observations: this.observationOut,
            user: this.user_json?.user,
            channel: 'ZENTINEL_WEB',
            external_transaction_id: uuidv4()
        };

        const formData = new FormData();

        formData.append(
            'entry_data',
            new Blob([JSON.stringify(data_save)], { type: 'application/json' })
        );

        this.images.forEach((file: File) => {
            formData.append('images', file);
        });

        this.showUpdate = false;
        this.dispatchService.patchEntryAccess(
            formData,
            this.selectedEntry!.id_access_control
        ).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                const message = data?.message ?? 'Salida creada correctamente'
                this.utilsService.onSuccess(message)
                this.observationOut = '';
                this.images = [];
                this.imagesError = '';
                this.fetchAllEntries();
            },
            error: (error: any) => {
                console.log(error);
                this.isLoading = false;
                const error_message = error?.error?.message ?? 'Error al crear la salida, por favor intente nuevamente'
                this.utilsService.onError(error_message)
            }
        })
    }
}