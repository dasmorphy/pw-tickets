import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { GlpiService } from 'src/app/services/glpi.service';
import { ProjectTechnicalService } from 'src/app/services/project-technical.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';

/**
 * catalog: material del registro técnico con material_id (solo se edita la cantidad)
 * new:     producto nuevo, del registro técnico o agregado en la proforma (modelo, descripción y precios manuales)
 * added:   ítem agregado desde la proforma eligiendo un material del catálogo
 */
type ProformaItemKind = 'catalog' | 'new' | 'added';

interface ProformaItem {
    kind: ProformaItemKind;
    material_id: number | null;
    model: string;
    description: string;
    quantity: number | null;
    base_price: number | null;
    // Fracción: 0.3 = 30 %
    profit_margin: number | null;
    profit_margin_dollar: number | null;
    price: number | null;
}

@Component({
    selector: 'app-register-ticket-commercial',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonModule,
        CalendarModule,
        CheckboxModule,
        DropdownModule,
        InputNumberModule,
        InputTextModule,
        InputTextareaModule,
        ToastModule,
        TooltipModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    templateUrl: './register-ticket-commercial.component.html',
    styleUrls: ['./register-ticket-commercial.component.sass']
})
export class RegisterTicketCommercialComponent {
    @Input() ticketIdEdit: number;

    private glpiService = inject(GlpiService);
    private utilsService = inject(UtilsService);
    private userService = inject(UserService);
    private projectTechnicalService = inject(ProjectTechnicalService);

    ticketForm: FormGroup;

    origins: any = [];
    solutionTypes: any = [];
    status: any = [];
    readonly nextActions = ['Solicitar reunión con cliente', 'En revisión por cliente'];
    readonly actionOwners = ['Asesor', 'Área técnica', 'Contabilidad'];

    readonly ivaRate = 0.15;
    readonly proformaDate = new Date();
    proformaItems: ProformaItem[] = [];
    loadingMaterials = false;
    catalogMaterials: any[] = [];
    loadingCatalog = false;

    user_session: any;

    constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router) {
        this.ticketForm = this.fb.group({
            origin_id: ['', Validators.required],
            type_solution_id: ['', Validators.required],
            status_id: ['', Validators.required],
            probability_closing: [null],
            closing_date: [null],
            next_action: [null],
            inspection_id: [null, Validators.required],
            // nextActionOwner: ['', Validators.required],
            // requires_technical: [false],
            // requires_material: [false],
            scheduled_start_date: [null],
            contract_received: [false],
            observations: [null],
            reason_loss: [null],
            // Datos de solo lectura: se completan desde la inspección
            proforma: this.fb.group({
                ruc: [''],
                client: [''],
                requested_by: [''],
                project: [''],
            })
        });
    }


    ngOnInit() {
        this.user_session = this.userService.getDataSession();
        const ticketId = this.route.snapshot.paramMap.get('inspection_id');
        if (ticketId) {
            const inspectionId = parseInt(ticketId, 10);
            this.ticketForm.patchValue({
                inspection_id: inspectionId,
                // responsible
            })
            this.fetchInspection(inspectionId);
            this.fetchInspectionMaterials(inspectionId);
        }
        this.fetchOrigin();
        this.fetchStatus();
        this.fetchTypeSolution();
        this.fetchCatalog();

        if (this.ticketIdEdit) {
            this.loadTicket()
        }
    }

    get proformaForm(): FormGroup {
        return this.ticketForm.get('proforma') as FormGroup;
    }

    get subtotal(): number {
        return this.round(this.proformaItems.reduce((sum, item) => sum + this.itemTotal(item), 0));
    }

    get iva(): number {
        return this.round(this.subtotal * this.ivaRate);
    }

    get total(): number {
        return this.round(this.subtotal + this.iva);
    }

    itemTotal(item: ProformaItem): number {
        return this.round((item.quantity ?? 0) * (item.price ?? 0));
    }

    marginPercent(item: ProformaItem): number | null {
        return item.profit_margin != null ? this.round(item.profit_margin * 100) : null;
    }

    // Producto nuevo: el margen se ingresa en % y se recalculan ganancia y PVP
    onNewItemPriceChange(item: ProformaItem, marginPercent?: number | null): void {
        if (marginPercent !== undefined) {
            item.profit_margin = marginPercent != null ? this.round(marginPercent / 100, 4) : null;
        }

        if (item.base_price == null) {
            item.profit_margin_dollar = null;
            item.price = null;
            return;
        }

        item.profit_margin_dollar = this.round(item.base_price * (item.profit_margin ?? 0));
        item.price = this.round(item.base_price + item.profit_margin_dollar);
    }

    private round(value: number, decimals = 2): number {
        const factor = 10 ** decimals;
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    loadTicket(): void {
        this.glpiService.getTicketsCommercial({'ticket_commercial_id': this.ticketIdEdit}).subscribe({
            next: (data: any) => {
                const dataTicket = data?.data?.[0]
                this.setTicketEdit(dataTicket)
            },
            error: (error: any) => {
                console.log(error)
                this.utilsService.onError('No se pudo obtener la información del ticket comercial')
            }
        })
    }

    setTicketEdit(dataTicket: any) {
        this.ticketForm.patchValue({
            origin_id: dataTicket?.origin_id,
            type_solution_id: dataTicket?.type_solution_id,
            status_id: dataTicket?.status_id,
            probability_closing: dataTicket?.probability_closing,
            closing_date: dataTicket?.closing_date,
            next_action: dataTicket?.next_action,
            scheduled_start_date: dataTicket?.scheduled_start_date,
            requires_technical: dataTicket?.requires_technical,
            requires_material: dataTicket?.requires_material,
            contract_received: dataTicket?.contract_received,
            reason_loss: dataTicket?.reason_loss,
            observations: dataTicket?.observations,
        })
    }

    fetchOrigin() {
        this.glpiService.getCommercialOrigin().subscribe({
            next: (data: any) => {
                this.origins = data?.data;
            },
            error: (error: any) => {
                console.log(error);
                this.utilsService.onError('No se pudo obtener los origenes, por favor intente nuevamente')
            }
        })
    }

    fetchStatus() {
        this.glpiService.getCommercialStatus().subscribe({
            next: (data: any) => {
                this.status = data?.data;
            },
            error: (error: any) => {
                console.log(error);
                this.utilsService.onError('No se pudo obtener los estados, por favor intente nuevamente')
            }
        })
    }

    fetchTypeSolution() {
        this.glpiService.getCommercialTypeSolution().subscribe({
            next: (data: any) => {
                this.solutionTypes = data?.data;
            },
            error: (error: any) => {
                console.log(error);
                this.utilsService.onError('No se pudo obtener las soluciones, por favor intente nuevamente')
            }
        })
    }

    fetchInspection(inspectionId: number) {
        this.glpiService.getInspectionTechnical({ id_inspection: inspectionId }).subscribe({
            next: (data: any) => {
                const inspection = data?.data?.[0];
                this.proformaForm.patchValue({
                    client: inspection?.client_name ?? '',
                    project: inspection?.title_ticket ?? '',
                    requested_by: inspection?.contact ?? '',
                });
            },
            error: (error: any) => {
                console.log(error);
                this.utilsService.onError('No se pudo obtener la información de la inspección');
            }
        })
    }

    fetchInspectionMaterials(inspectionId: number) {
        this.loadingMaterials = true;
        this.glpiService.getInspectionMaterials(inspectionId).subscribe({
            next: (data: any) => {
                this.proformaItems = (data?.data ?? []).map((material: any) => this.toProformaItem(material));
                this.loadingMaterials = false;
            },
            error: (error: any) => {
                console.log(error);
                this.loadingMaterials = false;
                this.utilsService.onError('No se pudo obtener los materiales del registro técnico');
            }
        })
    }

    fetchCatalog() {
        this.loadingCatalog = true;
        this.projectTechnicalService.getMaterials().subscribe({
            next: (data: any) => {
                this.catalogMaterials = data?.data ?? [];
                this.loadingCatalog = false;
            },
            error: (error: any) => {
                console.log(error);
                this.loadingCatalog = false;
                this.utilsService.onError('No se pudo obtener el catálogo de materiales');
            }
        })
    }

    private toProformaItem(material: any): ProformaItem {
        const equipment = material?.equipment;

        // Los productos nuevos del registro técnico no tienen material_id: los precios se ingresan manualmente
        if (!equipment) {
            return {
                kind: 'new',
                material_id: null,
                model: '',
                description: [material?.other, material?.material_description].filter(Boolean).join(' - '),
                quantity: material?.quantity ?? null,
                base_price: null,
                profit_margin: null,
                profit_margin_dollar: null,
                price: null,
            };
        }

        return {
            kind: 'catalog',
            material_id: material.material_id,
            ...this.pricesFromEquipment(equipment),
            quantity: material?.quantity ?? null,
        };
    }

    private pricesFromEquipment(equipment: any) {
        const basePrice = equipment?.base_price ?? null;
        const profitDollar = equipment?.profit_margin_dollar ?? null;
        return {
            model: equipment?.model ?? '',
            description: equipment?.product ?? '',
            base_price: basePrice,
            profit_margin: equipment?.profit_margin ?? null,
            profit_margin_dollar: profitDollar,
            // Si el catálogo no trae price se calcula como precio base + ganancia
            price: equipment?.price ?? (basePrice != null ? this.round(basePrice + (profitDollar ?? 0)) : null),
        };
    }

    addProformaItem(kind: 'added' | 'new') {
        this.proformaItems.push({
            kind,
            material_id: null,
            model: '',
            description: '',
            quantity: 1,
            base_price: null,
            profit_margin: null,
            profit_margin_dollar: null,
            price: null,
        });
    }

    onSelectCatalogMaterial(item: ProformaItem, materialId: number | null) {
        const equipment = this.catalogMaterials.find(material => material.id_equipment === materialId);
        Object.assign(item, {
            material_id: equipment?.id_equipment ?? null,
            ...this.pricesFromEquipment(equipment),
        });
    }

    removeProformaItem(index: number) {
        this.proformaItems.splice(index, 1);
    }

    isInvalid(path: string): boolean {
        const control = this.ticketForm.get(path);
        return !!control && control.invalid && (control.touched || control.dirty);
    }

    private validateProformaItems(): string | null {
        if (!this.proformaItems.length) {
            return 'Agregue al menos un ítem a la proforma.';
        }

        for (let i = 0; i < this.proformaItems.length; i++) {
            const item = this.proformaItems[i];
            if (item.kind === 'added' && !item.material_id) {
                return `Seleccione el material del ítem ${i + 1}.`;
            }
            if (!item.description?.trim()) {
                return `Ingrese la descripción del ítem ${i + 1}.`;
            }
            if (!item.quantity || item.quantity <= 0) {
                return `Ingrese una cantidad mayor a 0 en el ítem ${i + 1}.`;
            }
            if (item.price == null) {
                return item.kind === 'new'
                    ? `Ingrese el precio base del ítem ${i + 1}.`
                    : `El material del ítem ${i + 1} no tiene precio en el catálogo.`;
            }
        }

        return null;
    }

    saveTicket() {
        if (this.ticketForm.invalid) {
            this.ticketForm.markAllAsTouched();
            this.utilsService.onWarn('Por favor, complete todos los campos requeridos.');
            return;
        }

        const itemsError = this.validateProformaItems();
        if (itemsError) {
            this.utilsService.onWarn(itemsError);
            return;
        }

        const ticketData = {
            ...this.ticketForm.value,
            quoted_amount: this.total,
            // proforma: {
            //     ...this.proformaForm.value,
            //     date: this.proformaDate,
            //     items: this.proformaItems.map((item, index) => ({
            //         item: index + 1,
            //         material_id: item.material_id,
            //         model: item.model?.trim() || null,
            //         description: item.description.trim(),
            //         quantity: item.quantity,
            //         base_price: item.base_price,
            //         profit_margin: item.profit_margin,
            //         profit_margin_dollar: item.profit_margin_dollar,
            //         price: item.price,
            //         total: this.itemTotal(item),
            //     })),
            //     subtotal: this.subtotal,
            //     iva_rate: this.ivaRate,
            //     iva: this.iva,
            //     total: this.total,
            // },
            user: this.user_session?.user
        };

        if (this.ticketIdEdit) {
            this.updateTicket(ticketData);
        }else{
            this.glpiService.saveTicketCommercial(ticketData).subscribe({
                next: (data: any) => {
                    this.utilsService.onSuccess('Ticket registrado exitosamente.');
                    this.router.navigate(['/tickets-comercial'])
                },
                error: (error: any) => {
                    console.log(error)
                    this.utilsService.onError(error?.error?.message ?? 'Hubo un error al guardar, por favor intente nuevamente')
                }
            })
        }
    }

    updateTicket(data: any) {
        this.glpiService.updateTicketCommercial(data).subscribe({
            next: (data: any) => {
                this.utilsService.onSuccess('Ticket actualizado exitosamente.');
                this.router.navigate(['/tickets-comercial'])
            },
            error: (error: any) => {
                console.log(error)
                this.utilsService.onError(error?.error?.message ?? 'Error al crear el registro, por favor intente nuevamente');
            }
        })
    }

}
