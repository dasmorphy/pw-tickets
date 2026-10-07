import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { SidebarModule } from 'primeng/sidebar';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { v4 as uuidv4 } from 'uuid';
import { GlpiService } from 'src/app/services/glpi.service';
import { ProjectTechnicalService } from 'src/app/services/project-technical.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';
import { environment } from 'src/environments/environment.development';
import { Material, MaterialImage, Provider } from 'src/app/models/logistic';


type StockFilter = 'all' | 'available' | 'low' | 'out';

@Component({
    selector: 'app-logistics-materials',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        DialogModule,
        DropdownModule,
        FileUploadModule,
        InputNumberModule,
        InputTextModule,
        InputTextareaModule,
        SidebarModule,
        TableModule,
        ToastModule,
        TooltipModule,
    ],
    templateUrl: './logistics-materials.component.html',
    styleUrls: ['./logistics-materials.component.sass']
})
export class LogisticsMaterialsComponent implements OnInit {
    @ViewChild('fileUpload') fileUpload?: FileUpload;

    private readonly projectTechnicalService = inject(ProjectTechnicalService);
    private readonly glpiService = inject(GlpiService);
    private readonly userService = inject(UserService);
    private readonly utilsService = inject(UtilsService);
    private readonly fb = inject(FormBuilder);

    readonly maxImages = 10;
    readonly maxImageSize = 5000000;
    // Las imágenes se guardan en /var/www/uploads del servidor de technical-control-ms
    readonly imagesBaseUrl = 'http://192.168.230.61';

    showCreate = false;
    editingMaterial: Material | null = null;
    existingImages: MaterialImage[] = [];
    deleteImageIds: number[] = [];
    isSaving = false;
    providers: Provider[] = [];
    loadingProviders = false;
    images: File[] = [];
    imagesError: string | null = null;

    // profit_margin se captura en % y se envía como fracción (30 -> 0.3)
    materialForm: FormGroup = this.fb.group({
        product: ['', [Validators.required, Validators.maxLength(250)]],
        code: [''],
        model: [''],
        provider_id: [null, Validators.required],
        unit: ['Unid.'],
        stock: [0, [Validators.required, Validators.min(0)]],
        base_price: [null, [Validators.required, Validators.min(0)]],
        profit_margin_percent: [null, [Validators.required, Validators.min(0)]],
        description: [''],
    });

    // Stock igual o menor a este valor se considera bajo
    readonly lowStockLimit = 5;

    readonly stockOptions: { label: string; value: StockFilter }[] = [
        { label: 'Todos', value: 'all' },
        { label: 'Disponible', value: 'available' },
        { label: 'Stock bajo', value: 'low' },
        { label: 'Sin stock', value: 'out' },
    ];

    materials: Material[] = [];
    filteredMaterials: Material[] = [];
    providerOptions: string[] = [];
    isLoading = false;

    search = '';
    selectedProvider: string | null = null;
    selectedStock: StockFilter = 'all';

    selectedMaterial: Material | null = null;
    showDetail = false;

    totalStock = 0;
    inventoryValue = 0;
    lowStockCount = 0;
    outOfStockCount = 0;

    ngOnInit(): void {
        this.fetchMaterials();
    }

    fetchMaterials(): void {
        this.isLoading = true;
        this.projectTechnicalService.getMaterials().subscribe({
            next: (response: any) => {
                this.materials = response?.data ?? [];
                this.providerOptions = [...new Set(
                    this.materials.map(material => material.provider?.trim()).filter((provider): provider is string => !!provider)
                )].sort((a, b) => a.localeCompare(b));
                this.computeSummary();
                this.applyFilters();
                this.isLoading = false;
            },
            error: (error: any) => {
                console.error('Error fetching materials:', error);
                this.isLoading = false;
                this.utilsService.onError('Error al obtener los materiales. Por favor, inténtelo de nuevo más tarde.');
            }
        });
    }

    applyFilters(): void {
        const term = this.search.trim().toLowerCase();

        this.filteredMaterials = this.materials.filter(material => {
            if (term) {
                const haystack = [material.code, material.product, material.model, material.provider]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(term)) {
                    return false;
                }
            }

            if (this.selectedProvider && material.provider?.trim() !== this.selectedProvider) {
                return false;
            }

            return this.matchesStock(material);
        });
    }

    clearFilters(): void {
        this.search = '';
        this.selectedProvider = null;
        this.selectedStock = 'all';
        this.applyFilters();
    }

    get profitDollar(): number {
        const basePrice = this.materialForm.value.base_price ?? 0;
        const margin = (this.materialForm.value.profit_margin_percent ?? 0) / 100;
        return this.round(basePrice * margin);
    }

    get finalPrice(): number {
        return this.round((this.materialForm.value.base_price ?? 0) + this.profitDollar);
    }

    // Cupo de imágenes nuevas: máximo total menos las existentes que se conservan
    get availableImageSlots(): number {
        const kept = this.existingImages.length - this.deleteImageIds.length;
        return Math.max(this.maxImages - kept, 0);
    }

    openCreate(): void {
        this.resetCreateForm();
        this.showCreate = true;
        if (!this.providers.length) {
            this.fetchProviders();
        }
    }

    openEdit(material: Material): void {
        this.resetCreateForm();
        this.editingMaterial = material;
        this.existingImages = [...(material.images ?? [])];
        this.materialForm.reset({
            product: material.product ?? '',
            code: material.code ?? '',
            model: material.model ?? '',
            provider_id: material.provider_id ?? null,
            unit: material.unit?.trim() ?? '',
            stock: material.stock ?? 0,
            base_price: material.base_price,
            profit_margin_percent: material.profit_margin != null ? this.round(material.profit_margin * 100) : null,
            description: material.description ?? '',
        });
        this.showDetail = false;
        this.showCreate = true;
        if (!this.providers.length) {
            this.fetchProviders();
        }
    }

    imageUrl(image: MaterialImage): string {
        return `${this.imagesBaseUrl}${image.image_path}`;
    }

    isMarkedForDelete(image: MaterialImage): boolean {
        return this.deleteImageIds.includes(image.id_image);
    }

    toggleDeleteImage(image: MaterialImage): void {
        this.deleteImageIds = this.isMarkedForDelete(image)
            ? this.deleteImageIds.filter(id => id !== image.id_image)
            : [...this.deleteImageIds, image.id_image];
        this.validateImagesCount();
    }

    private validateImagesCount(): void {
        this.imagesError = this.images.length > this.availableImageSlots
            ? `Puede agregar máximo ${this.availableImageSlots} imágenes (límite de ${this.maxImages} por material).`
            : null;
    }

    fetchProviders(): void {
        this.loadingProviders = true;
        this.glpiService.getProviders().subscribe({
            next: (response: any) => {
                this.providers = response?.data ?? [];
                this.loadingProviders = false;
            },
            error: (error: any) => {
                console.error('Error fetching providers:', error);
                this.loadingProviders = false;
                this.utilsService.onError('Error al obtener los proveedores. Por favor, inténtelo de nuevo más tarde.');
            }
        });
    }

    onSelectImages(event: any): void {
        const selected: File[] = event.currentFiles ?? event.files ?? [];
        this.images = [...selected];
        this.validateImagesCount();
    }

    onRemoveImage(event: any): void {
        const removed: File = event.file;
        this.images = this.images.filter(file =>
            !(file.name === removed.name && file.size === removed.size && file.lastModified === removed.lastModified)
        );
        this.validateImagesCount();
    }

    onClearImages(): void {
        this.images = [];
        this.imagesError = null;
    }

    isInvalid(control: string): boolean {
        const field = this.materialForm.get(control);
        return !!field && field.invalid && (field.touched || field.dirty);
    }

    saveMaterial(): void {
        if (this.materialForm.invalid) {
            this.materialForm.markAllAsTouched();
            this.utilsService.onWarn('Por favor, complete todos los campos requeridos.');
            return;
        }

        if (this.images.length > this.availableImageSlots) {
            this.utilsService.onWarn(`Puede agregar máximo ${this.availableImageSlots} imágenes (límite de ${this.maxImages} por material).`);
            return;
        }

        const { profit_margin_percent, ...values } = this.materialForm.value;
        const user: any = this.userService.getDataSession();
        const editing = this.editingMaterial;

        const fields = {
            product: values.product.trim(),
            code: values.code?.trim() || null,
            model: values.model?.trim() || null,
            provider_id: values.provider_id,
            unit: values.unit?.trim() || null,
            stock: values.stock ?? 0,
            base_price: values.base_price,
            profit_margin: this.round((profit_margin_percent ?? 0) / 100, 4),
            profit_margin_dollar: this.profitDollar,
            price: this.finalPrice,
            description: values.description?.trim() || null,
        };

        const data_save = editing
            ? { ...fields, updated_by: user?.user, delete_images: this.deleteImageIds }
            : { ...fields, created_by: user?.user };

        Object.assign(data_save, {
            channel: 'Tech control',
            external_transaction_id: uuidv4()
        });

        const formData = new FormData();

        formData.append(
            'data',
            new Blob([JSON.stringify(data_save)], { type: 'application/json' })
        );

        this.images.forEach((file: File) => {
            formData.append('images', file);
        });

        const request$ = editing
            ? this.projectTechnicalService.updateMaterial(editing.id_equipment, formData)
            : this.projectTechnicalService.saveMaterial(formData);

        this.isSaving = true;
        request$.subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.utilsService.onSuccess(response?.message ?? (editing ? 'Material actualizado correctamente' : 'Material guardado correctamente'));
                this.showCreate = false;
                this.resetCreateForm();
                this.fetchMaterials();
            },
            error: (error: any) => {
                console.log(error);
                this.isSaving = false;
                this.utilsService.onError(error?.error?.message ?? 'Error al guardar el material, por favor intente nuevamente');
            }
        });
    }

    private resetCreateForm(): void {
        this.materialForm.reset({ unit: 'Unid.', stock: 0 });
        this.fileUpload?.clear();
        this.images = [];
        this.imagesError = null;
        this.editingMaterial = null;
        this.existingImages = [];
        this.deleteImageIds = [];
    }

    private round(value: number, decimals = 2): number {
        const factor = 10 ** decimals;
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    viewDetails(material: Material): void {
        this.selectedMaterial = material;
        this.showDetail = true;
    }

    stockState(material: Material): 'out' | 'low' | 'available' {
        const stock = material.stock ?? 0;
        if (stock <= 0) {
            return 'out';
        }
        return stock <= this.lowStockLimit ? 'low' : 'available';
    }

    stockLabel(material: Material): string {
        return { out: 'Sin stock', low: 'Stock bajo', available: 'Disponible' }[this.stockState(material)];
    }

    private matchesStock(material: Material): boolean {
        if (this.selectedStock === 'all') {
            return true;
        }
        return this.stockState(material) === this.selectedStock;
    }

    private computeSummary(): void {
        this.totalStock = 0;
        this.inventoryValue = 0;
        this.lowStockCount = 0;
        this.outOfStockCount = 0;

        for (const material of this.materials) {
            const stock = Math.max(material.stock ?? 0, 0);
            this.totalStock += stock;
            this.inventoryValue += stock * (material.base_price ?? 0);

            const state = this.stockState(material);
            if (state === 'out') {
                this.outOfStockCount++;
            } else if (state === 'low') {
                this.lowStockCount++;
            }
        }
    }
}
