import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import {
    MaterialDelivery,
    MaterialDeliveryService,
    PendingMaterialInfo,
    ProjectMaterial,
    ProjectTechnician,
} from 'src/app/services/material-delivery.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';
import { PendingProductDialogComponent } from '../pending-product-dialog/pending-product-dialog.component';

interface DeliveryRow extends ProjectMaterial {
    toDeliver: number | null;
}

interface DeliveryHistoryItem {
    product: string;
    unit: string | null;
    quantity: number;
}

interface DeliveryHistory extends MaterialDelivery {
    detail: DeliveryHistoryItem[];
    units: number;
}

type DeliveryTab = 'new' | 'history';

@Component({
    selector: 'app-material-delivery-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        DialogModule,
        DropdownModule,
        InputNumberModule,
        InputSwitchModule,
        InputTextModule,
        InputTextareaModule,
        TooltipModule,
        PendingProductDialogComponent,
    ],
    templateUrl: './material-delivery-modal.component.html',
    styleUrls: ['./material-delivery-modal.component.sass']
})
export class MaterialDeliveryModalComponent implements OnChanges {
    @Input() visible = false;
    @Input() project: any;
    @Output() visibleChange = new EventEmitter<boolean>();
    // Emite el id del historial registrado
    @Output() delivered = new EventEmitter<number>();

    private readonly deliveryService = inject(MaterialDeliveryService);
    private readonly userService = inject(UserService);
    private readonly utilsService = inject(UtilsService);

    activeTab: DeliveryTab = 'new';
    loading = false;
    saving = false;

    proformaCode: string | null = null;
    technicians: ProjectTechnician[] = [];
    rows: DeliveryRow[] = [];
    history: DeliveryHistory[] = [];

    selectedTechnician: string | null = null;
    observations = '';
    search = '';
    hideCompleted = true;
    historyTechnician: string | null = null;

    // Creación del producto de un pendiente
    pendingRow: DeliveryRow | null = null;
    pendingProduct: PendingMaterialInfo | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['visible'] || changes['project']) && this.visible && this.project) {
            this.resetForm();
            this.activeTab = 'new';
            this.historyTechnician = null;
            this.load();
        }
    }

    get projectId(): number {
        return this.project?.id_task;
    }

    get totalUnits(): number {
        return this.rows.reduce((sum, row) => sum + row.quantity, 0);
    }

    get deliveredUnits(): number {
        return this.rows.reduce((sum, row) => sum + row.delivered, 0);
    }

    get progress(): number {
        return this.totalUnits ? Math.round((this.deliveredUnits / this.totalUnits) * 100) : 0;
    }

    get completedCount(): number {
        return this.rows.filter(row => row.pending === 0).length;
    }

    get pendingCount(): number {
        return this.rows.length - this.completedCount;
    }

    // Productos nuevos que el bodeguero aún debe crear en el catálogo
    get pendingProductsCount(): number {
        return this.rows.filter(row => this.isPendingProduct(row)).length;
    }

    get visibleRows(): DeliveryRow[] {
        const term = this.normalize(this.search);
        return this.rows.filter(row => {
            if (this.hideCompleted && row.pending === 0 && !this.isPendingProduct(row)) {
                return false;
            }
            if (!term) {
                return true;
            }
            return [row.product, row.model, row.code, row.group].some(value => this.normalize(value).includes(term));
        });
    }

    get selectedRows(): DeliveryRow[] {
        return this.rows.filter(row => (row.toDeliver ?? 0) > 0);
    }

    get unitsToDeliver(): number {
        return this.selectedRows.reduce((sum, row) => sum + (row.toDeliver ?? 0), 0);
    }

    get selectedTechnicianName(): string {
        return this.technicians.find(technician => technician.user === this.selectedTechnician)?.fullname_user ?? '';
    }

    get filteredHistory(): DeliveryHistory[] {
        return this.historyTechnician
            ? this.history.filter(delivery => delivery.technician === this.historyTechnician)
            : this.history;
    }

    // Unidades entregadas a cada técnico (resumen del historial)
    get historyByTechnician(): { user: string; name: string; units: number; deliveries: number }[] {
        const summary = new Map<string, { user: string; name: string; units: number; deliveries: number }>();
        for (const delivery of this.history) {
            const entry = summary.get(delivery.technician)
                ?? { user: delivery.technician, name: delivery.technician_name, units: 0, deliveries: 0 };
            entry.units += delivery.units;
            entry.deliveries += 1;
            summary.set(delivery.technician, entry);
        }
        return [...summary.values()].sort((a, b) => b.units - a.units);
    }

    isPendingProduct(row: ProjectMaterial): boolean {
        return row.pending_material?.status === 'Pendiente';
    }

    rowProgress(row: DeliveryRow): number {
        return row.quantity ? Math.min(100, Math.round((row.delivered / row.quantity) * 100)) : 0;
    }

    // Lo máximo que se puede entregar: lo pendiente, limitado por el stock (los productos sin crear no tienen stock)
    maxDeliverable(row: DeliveryRow): number {
        return row.stock != null ? Math.max(0, Math.min(row.pending, row.stock)) : row.pending;
    }

    limitedByStock(row: DeliveryRow): boolean {
        return row.stock != null && row.stock < row.pending;
    }

    deliverAllPending(row: DeliveryRow): void {
        row.toDeliver = this.maxDeliverable(row) || null;
    }

    fillAllPending(): void {
        this.visibleRows.forEach(row => row.toDeliver = this.maxDeliverable(row) || null);
    }

    clearQuantities(): void {
        this.rows.forEach(row => row.toDeliver = null);
    }

    close(): void {
        this.visibleChange.emit(false);
    }

    load(): void {
        this.loading = true;
        this.deliveryService.getProjectMaterials(this.projectId).subscribe({
            next: ({ data }) => {
                this.proformaCode = data.proforma_code;
                this.technicians = this.resolveTechnicians(data.technicians);
                this.rows = data.materials.map(material => ({ ...material, toDeliver: null }));
                this.history = this.buildHistory(data.materials, data.deliveries);
                this.loading = false;
            },
            error: (error: any) => {
                console.log(error);
                this.rows = [];
                this.history = [];
                this.loading = false;
                this.utilsService.onError(error?.error?.message ?? 'No se pudo obtener los materiales del proyecto');
            }
        });
    }

    saveDelivery(): void {
        const error = this.validate();
        if (error) {
            this.utilsService.onWarn(error);
            return;
        }

        const user: any = this.userService.getDataSession();
        const technicianName = this.selectedTechnicianName;
        this.saving = true;
        this.deliveryService.saveDelivery({
            task_id: this.projectId,
            delivered_to: this.selectedTechnician!,
            observation: this.observations.trim() || null,
            items: this.selectedRows.map(row => ({
                quotation_item_id: row.quotation_item_id,
                additional_material_id: row.additional_material_id,
                quantity: row.toDeliver!,
            })),
            user: user?.user ?? 'Desconocido',
        }).subscribe({
            next: ({ data }) => {
                this.saving = false;
                this.utilsService.onSuccess(`Entrega registrada a ${technicianName}.`);
                this.delivered.emit(data?.id_history);
                this.resetForm();
                this.load();
            },
            error: (error: any) => {
                console.log(error);
                this.saving = false;
                this.utilsService.onError(error?.error?.message ?? 'No se pudo registrar la entrega, intente nuevamente');
            }
        });
    }

    openPendingProduct(row: DeliveryRow): void {
        const pending = row.pending_material;
        if (!pending) {
            return;
        }
        this.pendingRow = row;
        this.pendingProduct = { ...pending, name_material: pending.name_material ?? row.product };
    }

    closePendingProduct(): void {
        this.pendingRow = null;
        this.pendingProduct = null;
    }

    onPendingProductCreated(): void {
        this.closePendingProduct();
        this.load();
    }

    private validate(): string | null {
        if (!this.selectedTechnician) {
            return 'Seleccione el técnico que recibe los materiales.';
        }
        if (!this.selectedRows.length) {
            return 'Ingrese la cantidad a entregar de al menos un material.';
        }
        const decimal = this.selectedRows.find(row => !Number.isInteger(row.toDeliver));
        if (decimal) {
            return `La cantidad de "${decimal.product}" debe ser un número entero.`;
        }
        const exceeded = this.selectedRows.find(row => (row.toDeliver ?? 0) > row.pending);
        if (exceeded) {
            return `"${exceeded.product}" supera lo pendiente de la proforma (${exceeded.pending}).`;
        }
        const noStock = this.selectedRows.find(row => row.stock != null && (row.toDeliver ?? 0) > row.stock);
        if (noStock) {
            return `"${noStock.product}" supera el stock disponible (${noStock.stock}).`;
        }
        return null;
    }

    private resetForm(): void {
        this.selectedTechnician = null;
        this.observations = '';
        this.search = '';
        this.closePendingProduct();
        this.clearQuantities();
    }

    // Se priorizan los técnicos asignados al proyecto; si no tiene, se usan los que devuelve la API
    private resolveTechnicians(fallback: ProjectTechnician[]): ProjectTechnician[] {
        const assigned: ProjectTechnician[] = (this.project?.technicals_assignments ?? [])
            .map((assignment: any) => ({
                user: assignment?.user ?? assignment?.username ?? assignment?.fullname_user,
                fullname_user: assignment?.fullname_user ?? assignment?.user,
            }))
            .filter((technician: ProjectTechnician) => !!technician.user);
        return assigned.length ? assigned : fallback;
    }

    private buildHistory(materials: ProjectMaterial[], deliveries: MaterialDelivery[]): DeliveryHistory[] {
        const byKey = new Map(materials.map(material => [material.key, material]));
        return deliveries.map(delivery => {
            const detail = delivery.items.map(item => ({
                product: byKey.get(item.key)?.product ?? 'Material eliminado',
                unit: byKey.get(item.key)?.unit ?? null,
                quantity: item.quantity,
            }));
            return {
                ...delivery,
                detail,
                units: detail.reduce((sum, item) => sum + item.quantity, 0),
            };
        });
    }

    private normalize(value: string | null | undefined): string {
        return (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    }
}
