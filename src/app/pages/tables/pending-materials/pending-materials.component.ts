import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { PendingProductDialogComponent } from 'src/app/components/modals/pending-product-dialog/pending-product-dialog.component';
import { MaterialDeliveryService, PendingMaterialRow } from 'src/app/services/material-delivery.service';
import { UtilsService } from 'src/app/services/utils.service';

const STATUS_PENDING = 'Pendiente';
const STATUS_CREATED = 'Creado';
const STATUS_REMOVED = 'Eliminado de proforma';

/**
 * Productos nuevos del registro técnico y de las proformas aprobadas que logística
 * debe crear en el catálogo. Los del técnico pueden crearse antes de la proforma.
 */
@Component({
    selector: 'app-pending-materials',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        DropdownModule,
        InputTextModule,
        TableModule,
        ToastModule,
        TooltipModule,
        PendingProductDialogComponent,
    ],
    templateUrl: './pending-materials.component.html',
    styleUrls: ['./pending-materials.component.sass']
})
export class PendingMaterialsComponent implements OnInit {
    private readonly deliveryService = inject(MaterialDeliveryService);
    private readonly utilsService = inject(UtilsService);

    readonly statusOptions = [STATUS_PENDING, STATUS_CREATED, STATUS_REMOVED];
    readonly originOptions = ['Técnico', 'Proforma'];

    pendings: PendingMaterialRow[] = [];
    filteredPendings: PendingMaterialRow[] = [];
    isLoading = false;

    search = '';
    selectedStatus: string | null = STATUS_PENDING;
    selectedOrigin: string | null = null;

    // Pendiente que se está creando en el catálogo
    selectedPending: PendingMaterialRow | null = null;

    pendingCount = 0;
    createdCount = 0;
    removedCount = 0;

    ngOnInit(): void {
        this.fetchPendings();
    }

    fetchPendings(): void {
        this.isLoading = true;
        this.deliveryService.getPendingMaterials().subscribe({
            next: (response) => {
                this.pendings = response?.data ?? [];
                this.pendingCount = this.countByStatus(STATUS_PENDING);
                this.createdCount = this.countByStatus(STATUS_CREATED);
                this.removedCount = this.countByStatus(STATUS_REMOVED);
                this.applyFilters();
                this.isLoading = false;
            },
            error: (error: any) => {
                console.error('Error fetching pending materials:', error);
                this.isLoading = false;
                this.utilsService.onError('Error al obtener los productos pendientes. Por favor, inténtelo de nuevo más tarde.');
            }
        });
    }

    applyFilters(): void {
        const term = this.search.trim().toLowerCase();

        this.filteredPendings = this.pendings.filter(pending => {
            if (term) {
                const haystack = [
                    pending.name_material, pending.description, pending.model,
                    pending.inspection_code, pending.title_ticket, pending.client_name, pending.quote_number,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(term)) {
                    return false;
                }
            }
            if (this.selectedStatus && pending.status !== this.selectedStatus) {
                return false;
            }
            return !this.selectedOrigin || pending.origin === this.selectedOrigin;
        });
    }

    clearFilters(): void {
        this.search = '';
        this.selectedStatus = STATUS_PENDING;
        this.selectedOrigin = null;
        this.applyFilters();
    }

    canCreate(pending: PendingMaterialRow): boolean {
        return pending.status === STATUS_PENDING;
    }

    statusClass(pending: PendingMaterialRow): string {
        if (pending.status === STATUS_CREATED) {
            return 'created';
        }
        return pending.status === STATUS_REMOVED ? 'removed' : 'pending';
    }

    // Con proforma aprobada el stock debe cubrir su cantidad; antes, basta con 0
    minStock(pending: PendingMaterialRow): number {
        return pending.quotation_item_id != null ? pending.quantity ?? 0 : 0;
    }

    openCreate(pending: PendingMaterialRow): void {
        this.selectedPending = pending;
    }

    closeCreate(): void {
        this.selectedPending = null;
    }

    onCreated(): void {
        this.closeCreate();
        this.fetchPendings();
    }

    private countByStatus(status: string): number {
        return this.pendings.filter(pending => pending.status === status).length;
    }
}
