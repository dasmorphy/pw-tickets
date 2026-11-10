import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { NewProvider } from 'src/app/models/logistic';
import { GlpiService } from 'src/app/services/glpi.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';

/** Registra un proveedor (POST /providers). Solo el nombre es obligatorio. */
@Component({
    selector: 'app-provider-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        DialogModule,
        DropdownModule,
        InputTextModule,
    ],
    templateUrl: './provider-form-dialog.component.html',
    styleUrls: ['./provider-form-dialog.component.sass']
})
export class ProviderFormDialogComponent implements OnChanges {
    @Input() visible = false;
    @Output() closed = new EventEmitter<void>();
    // Emite el id del proveedor creado
    @Output() created = new EventEmitter<number>();

    private readonly fb = inject(FormBuilder);
    private readonly glpiService = inject(GlpiService);
    private readonly userService = inject(UserService);
    private readonly utilsService = inject(UtilsService);

    readonly statusOptions = ['CREDITO', 'SIN CREDITO'];
    isSaving = false;

    providerForm = this.fb.group({
        provider: ['', [Validators.required, Validators.maxLength(250)]],
        ruc: ['', [Validators.pattern(/^\d{10}(\d{3})?$/)]],
        seller: [''],
        number_contact: ['', [Validators.pattern(/^[\d\s+()-]{7,20}$/)]],
        email: ['', [Validators.email]],
        address: [''],
        status: ['CREDITO'],
    });

    ngOnChanges(changes: SimpleChanges): void {
        // Formulario limpio cada vez que se abre
        if (changes['visible'] && this.visible) {
            this.providerForm.reset({ status: 'CREDITO' });
        }
    }

    isInvalid(control: string): boolean {
        const field = this.providerForm.get(control);
        return !!field && field.invalid && (field.touched || field.dirty);
    }

    close(): void {
        if (!this.isSaving) {
            this.closed.emit();
        }
    }

    save(): void {
        if (this.providerForm.invalid) {
            this.providerForm.markAllAsTouched();
            this.utilsService.onWarn('Por favor, revise los campos del proveedor.');
            return;
        }

        const values = this.providerForm.value;
        const text = (value?: string | null) => value?.trim() || null;
        const user: any = this.userService.getDataSession();

        const data: NewProvider = {
            provider: values.provider!.trim(),
            ruc: text(values.ruc),
            seller: text(values.seller),
            number_contact: text(values.number_contact),
            email: text(values.email),
            address: text(values.address),
            status: values.status ?? null,
            user: user?.user ?? null,
        };

        this.isSaving = true;
        this.glpiService.saveProvider(data).subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.utilsService.onSuccess(response?.message ?? 'Proveedor registrado correctamente');
                this.created.emit(response?.data?.id_provider);
            },
            error: (error: any) => {
                console.log(error);
                this.isSaving = false;
                this.utilsService.onError(error?.error?.message ?? 'No se pudo registrar el proveedor, intente nuevamente');
            }
        });
    }
}
