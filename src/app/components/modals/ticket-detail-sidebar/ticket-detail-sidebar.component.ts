import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import { SidebarModule } from 'primeng/sidebar';
import { ProjectTechnicalService } from 'src/app/services/project-technical.service';

export type TicketDetailType = 'inspection' | 'technical' | 'commercial' | 'financial';

type FieldFormat = 'text' | 'date' | 'datetime' | 'currency' | 'percent' | 'bool' | 'longtext';

interface DetailField {
    label: string;
    value: any;
    format?: FieldFormat;
}

interface DetailSection {
    title: string;
    icon: string;
    fields: DetailField[];
}

interface DetailMaterial {
    name: string;
    detail: string | null;
    quantity: number | null;
    unit: string | null;
    is_new: boolean;
}

const TYPE_LABELS: Record<TicketDetailType, { label: string; icon: string }> = {
    inspection: { label: 'Inspección', icon: 'pi pi-search' },
    technical: { label: 'Registro técnico', icon: 'pi pi-cog' },
    commercial: { label: 'Gestión comercial', icon: 'pi pi-chart-line' },
    financial: { label: 'Gestión financiera', icon: 'pi pi-wallet' },
};

@Component({
    selector: 'app-ticket-detail-sidebar',
    standalone: true,
    imports: [CommonModule, SidebarModule],
    templateUrl: './ticket-detail-sidebar.component.html',
    styleUrls: ['./ticket-detail-sidebar.component.sass']
})
export class TicketDetailSidebarComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Input() data: any = null;
    @Input() type: TicketDetailType = 'inspection';

    private readonly projectTechnicalService = inject(ProjectTechnicalService);

    sections: DetailSection[] = [];
    auditFields: DetailField[] = [];
    materials: DetailMaterial[] = [];

    // El catálogo se pide una sola vez y solo cuando se abre un registro técnico con materiales
    private catalog: any[] | null = null;
    private loadingCatalog = false;

    get typeInfo() {
        return TYPE_LABELS[this.type] ?? TYPE_LABELS.inspection;
    }

    get headerCode(): string {
        return this.data?.code_management ?? this.data?.code ?? 'Detalle';
    }

    get statusLabel(): string | null {
        if (this.type === 'commercial') {
            return this.data?.status_name ?? null;
        }
        return this.data?.status ?? null;
    }

    ngOnChanges(): void {
        if (!this.data) {
            this.sections = [];
            this.auditFields = [];
            this.materials = [];
            return;
        }

        this.sections = this.buildSections();
        this.auditFields = [
            { label: 'Creado por', value: this.data.created_by },
            { label: 'Fecha de creación', value: this.data.created_at, format: 'datetime' },
            { label: 'Actualizado por', value: this.data.updated_by },
            { label: 'Última actualización', value: this.data.updated_at, format: 'datetime' },
        ];
        this.buildMaterials();
    }

    close(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    isEmpty(value: any): boolean {
        return value === null || value === undefined || value === '';
    }

    private buildSections(): DetailSection[] {
        const d = this.data;
        const inspectionFields: DetailField[] = [
            { label: 'Inspección', value: d.code },
            { label: 'Título', value: d.title_ticket },
            { label: 'Cliente', value: d.client_name },
            { label: 'Ubicación', value: d.location_name },
            { label: 'Contacto', value: d.contact },
            { label: 'Tipo de caso', value: d.case_type },
            { label: 'Prioridad', value: d.priority },
            { label: 'Responsable', value: d.responsible_name },
            { label: 'Fecha compromiso', value: d.commitment_date, format: 'date' },
        ];

        const flowFields: DetailField[] = [
            { label: 'Área actual', value: d.management_area },
            { label: 'Siguiente área', value: d.next_area },
        ];

        switch (this.type) {
            case 'technical':
                return [
                    {
                        title: 'Registro técnico', icon: 'pi pi-cog', fields: [
                            { label: 'Código', value: d.code_management },
                            { label: 'Estado', value: d.status },
                            ...flowFields,
                        ]
                    },
                    { title: 'Inspección', icon: 'pi pi-search', fields: inspectionFields },
                ];

            case 'commercial':
                return [
                    {
                        title: 'Gestión comercial', icon: 'pi pi-chart-line', fields: [
                            { label: 'Código', value: d.code_management },
                            { label: 'Estado', value: d.status_name },
                            { label: 'Origen', value: d.origin_name },
                            { label: 'Tipo de solución', value: d.type_solution_name },
                            { label: 'Valor cotizado', value: d.quoted_amount, format: 'currency' },
                            { label: 'Probabilidad de cierre', value: d.probability_closing, format: 'percent' },
                            { label: 'Fecha estimada de cierre', value: d.closing_date, format: 'date' },
                            { label: 'Fecha prevista de inicio', value: d.scheduled_start_date, format: 'date' },
                            { label: 'Fecha de finalización', value: d.date_finish, format: 'date' },
                            { label: 'Próxima acción', value: d.next_action },
                            { label: 'Responsable próxima acción', value: d.responsible_next_action },
                            { label: 'OC / contrato recibido', value: d.contract_received, format: 'bool' },
                            { label: 'Último seguimiento', value: d.last_followup_at, format: 'datetime' },
                            ...flowFields,
                            { label: 'Observaciones', value: d.observations, format: 'longtext' },
                            ...(d.reason_loss ? [{ label: 'Motivo de pérdida', value: d.reason_loss, format: 'longtext' as FieldFormat }] : []),
                        ]
                    },
                    { title: 'Inspección', icon: 'pi pi-search', fields: inspectionFields },
                ];

            case 'financial':
                return [
                    {
                        title: 'Gestión financiera', icon: 'pi pi-wallet', fields: [
                            { label: 'Código', value: d.code_management },
                            { label: 'Tipo de gestión', value: d.type_management },
                            { label: 'Estado', value: d.status },
                            { label: 'Precio factura', value: d.invoice_price, format: 'currency' },
                            { label: 'Monto pagado', value: d.amount_paid, format: 'currency' },
                            { label: 'Monto pendiente', value: d.amount_pending, format: 'currency' },
                            { label: 'Fecha del documento', value: d.date_document, format: 'date' },
                            ...flowFields,
                            { label: 'Observaciones', value: d.observations, format: 'longtext' },
                        ]
                    },
                    { title: 'Inspección', icon: 'pi pi-search', fields: inspectionFields },
                ];

            default:
                return [
                    {
                        title: 'Inspección', icon: 'pi pi-search', fields: [
                            ...inspectionFields,
                            { label: 'Estado', value: d.status },
                        ]
                    },
                    {
                        title: 'Seguimiento', icon: 'pi pi-directions', fields: [
                            ...flowFields,
                            { label: 'Registro técnico', value: d.technical_id ? `#${d.technical_id}` : 'Sin registro' },
                            { label: 'Estado comercial', value: d.commercial_status },
                            { label: 'Proyecto', value: d.project_id ? `#${d.project_id}` : 'Sin proyecto' },
                            { label: 'Listo para proyecto', value: d.ready_for_project, format: 'bool' },
                        ]
                    },
                ];
        }
    }

    private buildMaterials(): void {
        const rawMaterials: any[] = this.type === 'technical' ? (this.data?.materials ?? []) : [];

        this.materials = rawMaterials.map(material => {
            if (!material.material_id) {
                return {
                    name: material.other || 'Producto sin nombre',
                    detail: material.material_description || null,
                    quantity: material.quantity,
                    unit: null,
                    is_new: true,
                };
            }

            const equipment = this.catalog?.find(item => item.id_equipment === material.material_id);
            return {
                name: equipment?.product ?? `Material #${material.material_id}`,
                detail: equipment?.provider ?? null,
                quantity: material.quantity,
                unit: equipment?.unit ?? null,
                is_new: false,
            };
        });

        if (!this.catalog && !this.loadingCatalog && rawMaterials.some(material => material.material_id)) {
            this.loadCatalog();
        }
    }

    private loadCatalog(): void {
        this.loadingCatalog = true;
        this.projectTechnicalService.getMaterials().subscribe({
            next: (response: any) => {
                this.catalog = response?.data ?? [];
                this.loadingCatalog = false;
                this.buildMaterials();
            },
            error: (error: any) => {
                console.error('Error fetching materials:', error);
                this.loadingCatalog = false;
            }
        });
    }
}
