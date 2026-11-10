import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Material } from 'src/app/models/logistic';
import { GlpiService } from 'src/app/services/glpi.service';
import { MaterialDeliveryService, PendingMaterialInfo } from 'src/app/services/material-delivery.service';
import { ProjectTechnicalService } from 'src/app/services/project-technical.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';

// Datos para crear en el catálogo el producto de un pendiente (sugeridos desde el pendiente)
interface PendingProductForm {
    product: string;
    code: string;
    model: string;
    unit: string;
    provider_id: number | null;
    stock: number | null;
    base_price: number | null;
    profit_margin_percent: number | null;
    description: string;
}

// Crear un producto nuevo o usar uno que ya está en el catálogo (evita duplicados
// cuando varios pendientes son el mismo producto)
type ResolveMode = 'new' | 'existing';

/**
 * Crea en el catálogo el producto de un material pendiente, o lo vincula a un
 * producto existente sumándole el stock recibido. Se usa desde el modal
 * de entrega de materiales y desde la lista de productos pendientes de logística.
 */
@Component({
    selector: 'app-pending-product-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        DialogModule,
        DropdownModule,
        InputNumberModule,
        InputTextModule,
        InputTextareaModule,
        SelectButtonModule,
    ],
    templateUrl: './pending-product-dialog.component.html',
    styleUrls: ['./pending-product-dialog.component.sass']
})
export class PendingProductDialogComponent implements OnChanges {
    // El diálogo se muestra mientras haya un pendiente
    @Input() pending: PendingMaterialInfo | null = null;
    // Mínimo de stock: la cantidad de la proforma aprobada, 0 si aún no tiene
    @Input() minStock = 0;
    // Unidades ya entregadas con el pendiente; null si no se conocen
    @Input() delivered: number | null = null;
    @Input() source = 'Producto nuevo de la proforma';
    @Output() closed = new EventEmitter<void>();
    // Emite el id del producto creado en el catálogo
    @Output() created = new EventEmitter<number>();

    private readonly deliveryService = inject(MaterialDeliveryService);
    private readonly glpiService = inject(GlpiService);
    private readonly projectTechnicalService = inject(ProjectTechnicalService);
    private readonly userService = inject(UserService);
    private readonly utilsService = inject(UtilsService);

    form: PendingProductForm = this.emptyForm();
    providers: any[] = [];
    loadingProviders = false;
    resolving = false;

    readonly modeOptions = [
        { label: 'Crear producto nuevo', value: 'new' },
        { label: 'Usar producto existente', value: 'existing' },
    ];
    mode: ResolveMode = 'new';
    // Catálogo ordenado con los productos parecidos al pendiente primero
    catalog: Material[] = [];
    loadingCatalog = false;
    existingId: number | null = null;
    // Unidades recibidas que se suman al stock actual del producto existente
    received: number | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['pending'] && this.pending) {
            const pending = this.pending;
            this.form = {
                ...this.emptyForm(),
                product: pending.name_material ?? '',
                model: pending.model ?? '',
                description: pending.description ?? '',
                stock: Math.max(pending.quantity ?? 0, this.minStock),
                base_price: pending.base_price,
                profit_margin_percent: pending.profit_margin != null ? this.round(pending.profit_margin * 100) : null,
            };
            this.mode = 'new';
            this.existingId = null;
            this.received = null;
            if (!this.providers.length) {
                this.fetchProviders();
            }
            if (this.catalog.length) {
                this.catalog = this.sortBySimilarity(this.catalog);
            }
        }
    }

    onModeChange(): void {
        if (this.mode === 'existing' && !this.catalog.length) {
            this.fetchCatalog();
        }
    }

    onExistingChange(): void {
        // Sugiere lo mínimo que falta para cubrir la proforma con el stock actual
        this.received = this.selectedExisting ? this.minReceived : null;
    }

    get selectedExisting(): Material | null {
        return this.catalog.find(material => material.id_equipment === this.existingId) ?? null;
    }

    // Con proforma aprobada, stock actual + recibido debe cubrir su cantidad
    get minReceived(): number {
        return Math.max(0, this.minStock - (this.selectedExisting?.stock ?? 0));
    }

    // Stock con el que quedará el producto existente
    get resultingExistingStock(): number {
        const current = this.selectedExisting?.stock ?? 0;
        return Math.max(0, current + (this.received ?? 0) - (this.delivered ?? 0));
    }

    get profitDollar(): number {
        const basePrice = this.form.base_price ?? 0;
        return this.round(basePrice * ((this.form.profit_margin_percent ?? 0) / 100));
    }

    get finalPrice(): number {
        return this.round((this.form.base_price ?? 0) + this.profitDollar);
    }

    // Stock con el que quedará el catálogo: lo recibido menos lo ya entregado con el pendiente
    get resultingStock(): number {
        return Math.max(0, (this.form.stock ?? 0) - (this.delivered ?? 0));
    }

    close(): void {
        this.closed.emit();
    }

    resolve(): void {
        if (this.mode === 'existing') {
            this.linkExisting();
            return;
        }
        const pending = this.pending;
        if (!pending) {
            return;
        }
        const form = this.form;
        if (!form.product.trim() || form.provider_id == null || form.base_price == null || form.profit_margin_percent == null) {
            this.utilsService.onWarn('Complete el nombre, proveedor, precio base y margen del producto.');
            return;
        }
        if (form.stock == null || form.stock < this.minStock) {
            this.utilsService.onWarn(this.minStock
                ? `El stock debe ser al menos la cantidad de la proforma (${this.minStock}).`
                : 'Ingrese el stock recibido.');
            return;
        }

        const user: any = this.userService.getDataSession();
        this.resolving = true;
        this.deliveryService.resolvePendingMaterial(pending.id_pending_material, {
            product: form.product.trim(),
            code: form.code.trim() || null,
            model: form.model.trim() || null,
            unit: form.unit.trim() || null,
            description: form.description.trim() || null,
            provider_id: form.provider_id,
            base_price: form.base_price,
            profit_margin: this.round(form.profit_margin_percent / 100, 4),
            profit_margin_dollar: this.profitDollar,
            price: this.finalPrice,
            stock: form.stock,
            user: user?.user ?? 'Desconocido',
        }).subscribe({
            next: (response) => {
                this.resolving = false;
                this.utilsService.onSuccess(`"${form.product.trim()}" se creó en el catálogo.`);
                this.created.emit(response?.data?.id_equipment);
            },
            error: (error: any) => {
                console.log(error);
                this.resolving = false;
                this.utilsService.onError(error?.error?.message ?? 'No se pudo crear el producto, intente nuevamente');
            }
        });
    }

    private linkExisting(): void {
        const pending = this.pending;
        const material = this.selectedExisting;
        if (!pending) {
            return;
        }
        if (!material) {
            this.utilsService.onWarn('Seleccione el producto del catálogo.');
            return;
        }
        if (this.received == null || this.received < this.minReceived) {
            this.utilsService.onWarn(this.minReceived
                ? `Con el stock actual (${material.stock ?? 0}) debe recibir al menos ${this.minReceived} para cubrir la proforma (${this.minStock}).`
                : 'Ingrese las unidades recibidas (puede ser 0).');
            return;
        }

        const user: any = this.userService.getDataSession();
        this.resolving = true;
        this.deliveryService.resolvePendingMaterial(pending.id_pending_material, {
            material_id: material.id_equipment,
            stock: this.received,
            user: user?.user ?? 'Desconocido',
        }).subscribe({
            next: (response) => {
                this.resolving = false;
                this.utilsService.onSuccess(`El pendiente se vinculó a "${material.product}".`);
                this.created.emit(response?.data?.id_equipment);
            },
            error: (error: any) => {
                console.log(error);
                this.resolving = false;
                this.utilsService.onError(error?.error?.message ?? 'No se pudo vincular el producto, intente nuevamente');
            }
        });
    }

    private fetchCatalog(): void {
        this.loadingCatalog = true;
        this.projectTechnicalService.getMaterials().subscribe({
            next: (response: any) => {
                this.catalog = this.sortBySimilarity(response?.data ?? []);
                this.loadingCatalog = false;
            },
            error: (error: any) => {
                console.log(error);
                this.loadingCatalog = false;
                this.utilsService.onError('Error al obtener el catálogo de productos.');
            }
        });
    }

    // Los productos que comparten palabras con el nombre o modelo del pendiente van primero
    private sortBySimilarity(catalog: Material[]): Material[] {
        const words = this.words(`${this.pending?.name_material ?? ''} ${this.pending?.model ?? ''}`);
        const score = (material: Material) => {
            const text = this.words(`${material.product ?? ''} ${material.model ?? ''} ${material.code ?? ''}`);
            return words.filter(word => text.includes(word)).length;
        };
        return catalog
            .map(material => ({ material, score: score(material) }))
            .sort((a, b) => b.score - a.score)
            .map(({ material }) => material);
    }

    private words(text: string): string[] {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .split(/[^a-z0-9]+/)
            .filter(word => word.length > 2);
    }

    private fetchProviders(): void {
        this.loadingProviders = true;
        this.glpiService.getProviders().subscribe({
            next: (response: any) => {
                this.providers = response?.data ?? [];
                this.loadingProviders = false;
            },
            error: (error: any) => {
                console.log(error);
                this.loadingProviders = false;
                this.utilsService.onError('Error al obtener los proveedores.');
            }
        });
    }

    private emptyForm(): PendingProductForm {
        return {
            product: '',
            code: '',
            model: '',
            unit: 'Unid.',
            provider_id: null,
            stock: null,
            base_price: null,
            profit_margin_percent: null,
            description: '',
        };
    }

    private round(value: number, decimals = 2): number {
        const factor = 10 ** decimals;
        return Math.round(value * factor) / factor;
    }
}
