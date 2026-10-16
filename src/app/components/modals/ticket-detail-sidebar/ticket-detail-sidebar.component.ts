import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import { SidebarModule } from 'primeng/sidebar';
import { GlpiService } from 'src/app/services/glpi.service';
import { ProjectTechnicalService } from 'src/app/services/project-technical.service';
import { UtilsService } from 'src/app/services/utils.service';

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

interface InspectionDocument {
    id_document: number;
    document_name: string;
    type: string | null;
    created_at: string;
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
    private readonly glpiService = inject(GlpiService);
    private readonly utilsService = inject(UtilsService);

    sections: DetailSection[] = [];
    auditFields: DetailField[] = [];
    materials: DetailMaterial[] = [];
    documents: InspectionDocument[] = [];
    loadingDocuments = false;
    // Proforma de la inspección (GET de inspecciones: sale_quote_id); null si no existe
    saleQuoteId: number | null = null;
    loadingSaleQuote = false;
    // id_document en descarga/visualización, para deshabilitar sus botones
    busyDocumentId: number | null = null;
    private documentsRequestId: number | null = null;

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
            this.documents = [];
            this.saleQuoteId = null;
            this.documentsRequestId = null;
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
        this.loadDocuments();
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
                            // { label: 'Fecha prevista de inicio', value: d.scheduled_start_date, format: 'date' },
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

    /**
     * El GET de inspecciones ya trae los documentos; los registros técnico, comercial
     * y financiero no, así que en esos casos se piden por el id de la inspección.
     */
    private loadDocuments(): void {
        if (Array.isArray(this.data?.documents)) {
            this.documents = this.data.documents;
            this.saleQuoteId = this.data.sale_quote_id ?? null;
            this.documentsRequestId = null;
            this.loadingDocuments = false;
            return;
        }

        const inspectionId = this.data?.id_inspection;
        this.documents = [];
        this.saleQuoteId = null;
        if (!inspectionId) {
            return;
        }

        this.documentsRequestId = inspectionId;
        this.loadingDocuments = true;
        this.glpiService.getInspectionTechnical({ id_inspection: inspectionId }).subscribe({
            next: (response: any) => {
                // Ignora respuestas de un registro anterior si el usuario ya abrió otro
                if (this.documentsRequestId !== inspectionId) return;
                this.documents = response?.data?.[0]?.documents ?? [];
                this.saleQuoteId = response?.data?.[0]?.sale_quote_id ?? null;
                this.loadingDocuments = false;
            },
            error: (error: any) => {
                if (this.documentsRequestId !== inspectionId) return;
                console.error('Error fetching inspection documents:', error);
                this.loadingDocuments = false;
            }
        });
    }

    canPreview(document: InspectionDocument): boolean {
        const type = document.type ?? '';
        return type === 'application/pdf' || type.startsWith('image/');
    }

    documentIcon(document: InspectionDocument): string {
        const type = document.type ?? '';
        const name = (document.document_name ?? '').toLowerCase();
        if (type === 'application/pdf') return 'pi-file-pdf';
        if (type.startsWith('image/')) return 'pi-image';
        if (/\.(xlsx?|csv)$/.test(name)) return 'pi-file-excel';
        if (/\.docx?$/.test(name)) return 'pi-file-word';
        return 'pi-file';
    }

    previewDocument(document: InspectionDocument): void {
        // La pestaña se abre antes de la petición para que el navegador no la bloquee como popup
        const tab = window.open('', '_blank');
        this.busyDocumentId = document.id_document;
        this.glpiService.downloadInspectionDocument(document.id_document, true).subscribe({
            next: (blob: Blob) => {
                this.busyDocumentId = null;
                const url = window.URL.createObjectURL(blob);
                if (tab) {
                    tab.location.href = url;
                } else {
                    window.open(url, '_blank');
                }
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
            },
            error: (error: any) => {
                this.busyDocumentId = null;
                tab?.close();
                console.error('Error al visualizar documento:', error);
                this.utilsService.onError('No se pudo abrir el documento.');
            }
        });
    }

    downloadDocument(document: InspectionDocument): void {
        this.busyDocumentId = document.id_document;
        this.glpiService.downloadInspectionDocument(document.id_document).subscribe({
            next: (blob: Blob) => {
                this.busyDocumentId = null;
                const url = window.URL.createObjectURL(blob);
                const link = window.document.createElement('a');
                link.href = url;
                link.download = document.document_name || `documento-${document.id_document}`;
                link.click();
                setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            },
            error: (error: any) => {
                this.busyDocumentId = null;
                console.error('Error al descargar documento:', error);
                this.utilsService.onError('No se pudo descargar el documento.');
            }
        });
    }


    downloadSaleQuote(id_quote: number): void {
        this.loadingSaleQuote = true;
        this.glpiService.downloadSaleQuote(id_quote).subscribe({
            next: (blob: Blob) => {
                this.loadingSaleQuote = false;
                const url = window.URL.createObjectURL(blob);
                const link = window.document.createElement('a');
                link.href = url;
                link.download = `cotizacion-${id_quote}.pdf`;
                link.click();
                setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            },
            error: (error: any) => {
                this.loadingSaleQuote = false;
                console.error('Error al descargar documento:', error);
                this.utilsService.onError('No se pudo descargar el documento.');
            }
        });
    }

    previewSaleQuote(id_quote: number): void {
        // La pestaña se abre antes de la petición para que el navegador no la bloquee como popup
        const tab = window.open('', '_blank');
        this.glpiService.downloadSaleQuote(id_quote, true).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                if (tab) {
                    tab.location.href = url;
                } else {
                    window.open(url, '_blank');
                }
                setTimeout(() => window.URL.revokeObjectURL(url), 60000);
            },
            error: (error: any) => {
                tab?.close();
                console.error('Error al visualizar documento:', error);
                this.utilsService.onError('No se pudo abrir el documento.');
            }
        });
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
