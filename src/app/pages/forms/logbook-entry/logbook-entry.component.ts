import { CommonModule } from '@angular/common';
import { Component, computed, inject, ViewChild } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LogbookService } from 'src/app/services/logbook.service';
import { UtilsService } from 'src/app/services/utils.service';
import { DialogModule } from 'primeng/dialog';
import { UserService } from 'src/app/services/user.service';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { v4 as uuidv4} from 'uuid';
import { DashboardService } from 'src/app/services/dashboard.service';
import { PurchaseOrderService } from 'src/app/services/puchase-order.service';

@Component({
    selector: 'app-logbook-entry',
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
        FileUploadModule
    ],
    templateUrl: './logbook-entry.component.html',
    styleUrls: ['./logbook-entry.component.sass'],
})
export class LogbookEntryComponent {
    @ViewChild('fileUpload') fileUpload!: FileUpload;

    private logbookService = new LogbookService();
    private utilsService = new UtilsService();
    private dashboardService = new DashboardService();
    private userService = new UserService();
    public readonly purchaseOrderService = inject(PurchaseOrderService);

    categories = computed(() => this.logbookService.categories());
    unitiesWeight = computed(() => this.logbookService.unitiesWeight());
    authorized = computed(() => this.logbookService.authorized());
    destinyIntern = computed(() => this.logbookService.destinyIntern());

    logbookForm: FormGroup;

    images: File[] = [];
    imagesError: string | null = null;

    isLoading: boolean = false;
    showConfirmSave: boolean = false;
    showBlacklistAlert: any = false;
    messageEmpty: string = "No hay opciones disponibles";
    optionGroupBusiness= []
    user_json: any;

    categoryOptions = []

    constructor(private fb: FormBuilder,) {
        this.logbookForm = this.fb.group({
            truck_license: ['', Validators.required],
            dni_driver: ['', Validators.required],
            name_driver: ['', Validators.required],
            id_group_business: ['', Validators.required],
            id_category: ['', Validators.required],
            id_unity: [''],
            shipping_guide: [''],
            quantity: [0],
            description: [''],
            weight: [null],
            provider: [''],
            destiny_intern: ['', Validators.required],
            authorized_by: [''],
            observations: [''],
        });
    }

    ngOnInit() {
        this.user_json = this.userService.getDataSession();

        if (this.user_json?.attributes['group_business']) {
            this.logbookForm.get('id_group_business')?.setValue(this.user_json?.attributes['group_business']);
        }

        this.logbookService.getAllCategories();
        this.logbookService.getAllUnitiesWeight();
        this.logbookService.getAllAuthorized();
        this.logbookService.getAllDestinyIntern({business: "1"});
        this.fetchGroupBusinessByBusiness();
    }

    fetchGroupBusinessByBusiness() {
        const id_business = this.user_json?.attributes?.id_business
        this.dashboardService.getGroupBusinessByBusiness(id_business).subscribe({
        next: (resp: any) => {
            this.optionGroupBusiness = resp?.data
        },
        error: (err) => console.error(err)
        });
    }

    validateDni() {
        const dni = this.logbookForm.get('dni_driver');
        this.utilsService.deleteErrorControl(dni, 'dniInvalid');

        if (dni?.value && dni?.value.length === 10) {
            this.purchaseOrderService.getBlacklist({ dni: dni?.value }).subscribe({
                next: (data: any) => {
                    const isBlacklisted = data?.data?.length > 0;
                    if (isBlacklisted) {
                        this.showBlacklistAlert = data?.data[0];
                        this.utilsService.onError('Conductor en la lista negra');
                        dni?.setErrors({'dniInvalid': true})
                    }
                },
                error: (error: any) => {
                    console.error('Error al validar el DNI:', error);
                    this.utilsService.onError('Error al validar la cédula.');
                }
            })
        }
    }

    onSelectImages(event: any) {
        const selectedFiles: File[] = event.files;

        // 🔄 acumular imágenes
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

    onSubmit() {
        const controls_ignore = ['weight', 'observations'];
        const dniControl = this.logbookForm.get('dni_driver');

        if (dniControl?.getError('dniInvalid')) {
            this.utilsService.onError('Conductor en la lista negra');
            return;
        }

        if (dniControl?.value && dniControl?.value.length < 10) {
            this.utilsService.onError('Cédula inválida, debe tener 10 dígitos');
            return;
        }

        if (this.hideGuide()) {
            controls_ignore.push('shipping_guide');
            this.logbookForm.patchValue({
                shipping_guide: null
            })
        }

        if (this.hideEjectExpalsa()) {
            controls_ignore.push('quantity', 'provider', 'description', 'authorized_by', 'id_unity');
            this.logbookForm.patchValue({
                quantity: null,
                provider: null,
                description: null,
                authorized_by: null,
                id_unity: null,
                weight: null,

            })
        }

        if (this.hidePersonal()) {
            controls_ignore.push('quantity', 'provider', 'id_unity', 'description');
            this.logbookForm.patchValue({
                quantity: null,
                provider: null,
                id_unity: null,
                weight: null,
                description: null
            })
        }

        this.utilsService.validateControlsForms(this.logbookForm, controls_ignore);
        this.utilsService.showControlVoiled();

        if (this.images.length < 5) {
            this.imagesError = 'Debes subir mínimo 5 imágenes';
            this.isLoading = false;
            return;
        }

        if (this.logbookForm.valid) {
            this.showConfirmSave = true;
        }
    }

    hideGuide() {
        const categorys_hide = ['Ejecutivos de expalsa', 'Personal interno', 'Personal externo', 'Cuadrillas para pesca'];
        const category_found = this.categories().find((cat: any) => cat.id_category === this.logbookForm.get('id_category')?.value);

        return categorys_hide.includes(category_found?.name_category)
    }

    hideEjectExpalsa() {
        const categorys_hide = ['Ejecutivos de expalsa'];
        const category_found = this.categories().find((cat: any) => cat.id_category === this.logbookForm.get('id_category')?.value);

        return categorys_hide.includes(category_found?.name_category)
    }

    hidePersonal() {
        const categorys_hide = ['Personal interno', 'Personal externo'];
        const category_found = this.categories().find((cat: any) => cat.id_category === this.logbookForm.get('id_category')?.value);

        return categorys_hide.includes(category_found?.name_category)
    }

    saveLogbook() {
        this.isLoading = true;
        this.showConfirmSave = false;
 
        const data_save = {
            ...this.logbookForm.value,
            created_by: this.user_json?.user,
            name_user: this.user_json?.attributes?.fullname,
            weight: this.logbookForm.get('weight')?.value,
            channel: 'ZENTINEL_WEB',
            external_transaction_id: uuidv4()
        };

        const formData = new FormData();

        formData.append(
            'logbook_entry',
            new Blob([JSON.stringify(data_save)], { type: 'application/json' })
        );

        this.images.forEach((file: File) => {
            formData.append('images', file);
        });

        this.logbookService.saveLogbookEntry(formData).subscribe({
            next: (data: any) => {
                this.isLoading = false;
                const message = data?.message ?? 'Bitácora guardada'
                this.utilsService.onSuccess(message)
                this.logbookForm.reset();
                this.fileUpload.clear();
                this.images = [];
                this.imagesError = '';
            },
            error: (error: any) => {
                console.log(error);
                this.isLoading = false;
                const error_message = error?.error?.message ?? 'Error al guardar la bitacora de entrada, por favor intente nuevamente'
                this.utilsService.onError(error_message)
            }
        })
    }

}
