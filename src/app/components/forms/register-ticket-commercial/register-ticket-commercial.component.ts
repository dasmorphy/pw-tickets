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
import { GlpiService } from 'src/app/services/glpi.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';

interface ProformaItem {
    material_id: number | null;
    model: string;
    description: string;
    quantity: number | null;
    pvp: number | null;
    is_manual: boolean;
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
            proforma: this.fb.group({
                // Número provisional hasta definir la secuencia real de cotizaciones
                ruc: ['', [Validators.required, Validators.pattern(/^\d{13}$/)]],
                client: ['', Validators.required],
                requested_by: ['', Validators.required],
                project: ['', Validators.required],
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
        return this.round((item.quantity ?? 0) * (item.pvp ?? 0));
    }

    private round(value: number): number {
        return Math.round((value + Number.EPSILON) * 100) / 100;
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

    private toProformaItem(material: any): ProformaItem {
        const equipment = material?.equipment;

        // Los productos nuevos del registro técnico no tienen material_id: el PVP se ingresa manualmente
        if (!equipment) {
            return {
                material_id: null,
                model: '',
                description: [material?.other, material?.material_description].filter(Boolean).join(' - '),
                quantity: material?.quantity ?? null,
                pvp: null,
                is_manual: false,
            };
        }

        return {
            material_id: material.material_id,
            model: equipment.model ?? '',
            description: equipment.product ?? '',
            quantity: material?.quantity ?? null,
            pvp: equipment.base_price ?? null,
            is_manual: false,
        };
    }

    addProformaItem() {
        this.proformaItems.push({
            material_id: null,
            model: '',
            description: '',
            quantity: 1,
            pvp: null,
            is_manual: true,
        });
    }

    removeProformaItem(index: number) {
        this.proformaItems.splice(index, 1);
    }

    onRucInput(event: Event) {
        const input = event.target as HTMLInputElement;
        const value = input.value.replace(/\D/g, '').slice(0, 13);
        input.value = value;
        this.proformaForm.get('ruc')?.setValue(value);
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
            if (!item.description?.trim()) {
                return `Ingrese la descripción del ítem ${i + 1}.`;
            }
            if (!item.quantity || item.quantity <= 0) {
                return `Ingrese una cantidad mayor a 0 en el ítem ${i + 1}.`;
            }
            if (item.pvp === null || item.pvp === undefined) {
                return `Ingrese el PVP del ítem ${i + 1}.`;
            }
        }

        return null;
    }

    saveTicket() {
        if (this.ticketForm.invalid) {
            this.ticketForm.markAllAsTouched();
            this.utilsService.onWarn(
                this.proformaForm.get('ruc')?.invalid && this.proformaForm.get('ruc')?.value
                    ? 'El RUC debe tener 13 dígitos.'
                    : 'Por favor, complete todos los campos requeridos.'
            );
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
            //         pvp: item.pvp,
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
