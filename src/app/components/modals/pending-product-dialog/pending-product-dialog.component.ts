import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { GlpiService } from 'src/app/services/glpi.service';
import { MaterialDeliveryService, PendingMaterialInfo } from 'src/app/services/material-delivery.service';
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

/**
 * Crea en el catálogo el producto de un material pendiente. Se usa desde el modal
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
    private readonly userService = inject(UserService);
    private readonly utilsService = inject(UtilsService);

    form: PendingProductForm = this.emptyForm();
    providers: any[] = [];
    loadingProviders = false;
    resolving = false;

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
            if (!this.providers.length) {
                this.fetchProviders();
            }
        }
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
