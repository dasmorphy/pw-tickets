import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
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
import { DocumentUploadComponent } from '../document-upload/document-upload.component';

@Component({
    selector: 'app-register-ticket-financial',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonModule,
        CalendarModule,
        CheckboxModule,
        DropdownModule,
        InputNumberModule,
        InputTextareaModule,
        ToastModule,
        FormsModule,
        ReactiveFormsModule,
        InputTextModule,
        DocumentUploadComponent
    ],
    templateUrl: './register-ticket-financial.component.html',
    styleUrls: ['./register-ticket-financial.component.sass']
})
export class RegisterTicketFinancialComponent {
    // id_management_financial: con valor el formulario edita esa gestión
    @Input() ticketIdEdit: number;

    private glpiService = inject(GlpiService);
    private utilsService = inject(UtilsService);
    private userService = inject(UserService);

    ticketForm: FormGroup;

    origins: any = [];
    typeManagement: any = ['Orden de compra', 'Factura'];
    status: any = [];
    // valueInvoice = ['1 mes', '3 meses', '6 meses', '9 meses'];
    user_session: any;
    documents: File[] = [];


    readonly nextActions = ['Facturar', 'Solicitar reunión con cliente', 'En revisión por cliente'];
    readonly actionOwners = ['Asesor', 'Área técnica', 'Contabilidad'];


    constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router) {
        this.ticketForm = this.fb.group({
            type_management: ['', Validators.required],
            status: ['', Validators.required],
            amount_pending: [{ value: null, disabled: true }],
            amount_paid: [null],
            invoice_price: [null],
            date_document: [null],
            number_document: [null],
            inspection_id: [null, Validators.required],
            observations: [null],
        });
    }


    ngOnInit() {
        this.user_session = this.userService.getDataSession();
        const inspectionId = this.route.snapshot.paramMap.get('inspection_id');
        if (inspectionId) {
            this.ticketForm.patchValue({
                inspection_id: parseInt(inspectionId, 10),
                // responsible
            })
        }

        if (this.ticketIdEdit) {
            this.loadTicket();
        }
    }

    loadTicket(): void {
        this.glpiService.getTicketsFinancial({ ticket_financial_id: this.ticketIdEdit }).subscribe({
            next: (response: any) => {
                const dataTicket = response?.data?.[0];
                if (!dataTicket) {
                    this.utilsService.onError('No se encontró la gestión financiera');
                    return;
                }
                this.setTicketEdit(dataTicket);
            },
            error: (error: any) => {
                console.log(error)
                this.utilsService.onError('No se pudo obtener la información de la gestión financiera')
            }
        })
    }

    setTicketEdit(dataTicket: any): void {
        // Las opciones de estado dependen del tipo de gestión
        this.onChangeTypeManagement(dataTicket?.type_management);
        this.ticketForm.patchValue({
            type_management: dataTicket?.type_management,
            status: dataTicket?.status,
            number_document: dataTicket?.number_document,
            date_document: this.toLocalDate(dataTicket?.date_document),
            invoice_price: this.toNumber(dataTicket?.invoice_price),
            amount_paid: this.toNumber(dataTicket?.amount_paid),
            amount_pending: this.toNumber(dataTicket?.amount_pending),
            observations: dataTicket?.observations,
        });
    }

    // El backend envía la fecha en UTC; se toma el día UTC para que no se corra al día anterior
    private toLocalDate(value: any): Date | null {
        if (!value) {
            return null;
        }
        const date = new Date(value);
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }

    private toNumber(value: any): number | null {
        return value === null || value === undefined || value === '' ? null : Number(value);
    }


    onChangeTypeManagement(type: string, resetStatus = false) {
        if (resetStatus) {
            this.ticketForm.patchValue({ status: '' });
        }
        if (type == 'Orden de compra') {
            this.status = ['Solicitado']
        }else {
            this.status = ['Emitida', 'Cobrada']
        }
    }


    calculateAmountPending(): void {
        const invoicePrice = this.ticketForm.get('invoice_price')?.value ?? 0;
        const amountPaid = this.ticketForm.get('amount_paid')?.value ?? 0;

        if (invoicePrice > 0 && amountPaid > 0) {
            const amountPending = invoicePrice - amountPaid;

            this.ticketForm.patchValue({
                amount_pending: amountPending
            });
        }

        if (!amountPaid) {
            this.ticketForm.patchValue({
                amount_pending: null
            });
        }
    }

    saveTicket() {
        if (this.ticketForm.valid) {
            // getRawValue incluye amount_pending, que está deshabilitado
            const ticketData = {
                ...this.ticketForm.getRawValue(),
                user: this.user_session?.user
            };

            if (this.ticketIdEdit) {
                this.updateTicket({ ...ticketData, id_management_financial: this.ticketIdEdit });
                return;
            }

            this.glpiService.saveTicketFinancial(ticketData, this.documents).subscribe({
                next: (data: any) => {
                    console.log(data)
                    this.utilsService.onSuccess('Ticket registrado exitosamente.');
                    this.router.navigate(['/tickets-financieros'])
                },
                error: (error: any) => {
                    console.log(error)
                    this.utilsService.onError(error?.error?.message ?? 'Hubo un error al guardar, por favor intente nuevamente')
                }
            })


        } else {
            this.utilsService.onWarn('Por favor, complete todos los campos requeridos.');
        }
    }

    updateTicket(data: any) {
        this.glpiService.updateTicketFinancial(data).subscribe({
            next: () => {
                this.utilsService.onSuccess('Gestión financiera actualizada exitosamente.');
                this.router.navigate(['/tickets-financieros'])
            },
            error: (error: any) => {
                console.log(error)
                this.utilsService.onError(error?.error?.message ?? 'Hubo un error al actualizar, por favor intente nuevamente')
            }
        })
    }

}