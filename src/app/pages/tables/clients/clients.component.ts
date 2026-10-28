import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { Client, ClientCompany, NewClient } from 'src/app/models/client';
import { AuthService } from 'src/app/services/auth.service';
import { GlpiService } from 'src/app/services/glpi.service';
import { UserService } from 'src/app/services/user.service';
import { UtilsService } from 'src/app/services/utils.service';

type CompanyMode = 'existing' | 'new';

// Formato de la identificación según el tipo de documento
const IDENTITY_RULES: Record<string, { pattern: RegExp; message: string }> = {
    Natural: { pattern: /^(\d{10}|\d{13})$/, message: 'La identificación debe tener 10 (cédula) o 13 dígitos (RUC).' },
    'Jurídica': { pattern: /^\d{13}$/, message: 'El RUC debe tener 13 dígitos.' },
};

@Component({
    selector: 'app-clients',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        DialogModule,
        DropdownModule,
        InputTextModule,
        SelectButtonModule,
        TableModule,
        ToastModule,
        TooltipModule,
    ],
    templateUrl: './clients.component.html',
    styleUrls: ['./clients.component.sass']
})
export class ClientsComponent implements OnInit {
    private readonly glpiService = inject(GlpiService);
    private readonly userService = inject(UserService);
    private readonly utilsService = inject(UtilsService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);

    user_permissions_signal = computed(() => this.authService.user_permissions_signal());

    readonly companyModeOptions: { label: string; value: CompanyMode }[] = [
        { label: 'Empresa existente', value: 'existing' },
        { label: 'Nueva empresa', value: 'new' },
    ];
    readonly documentTypes = Object.keys(IDENTITY_RULES);

    clients: Client[] = [];
    filteredClients: Client[] = [];
    isLoading = false;
    search = '';
    selectedCompanyId: number | null = null;

    companies: ClientCompany[] = [];
    loadingCompanies = false;

    showCreate = false;
    isSaving = false;

    clientForm: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(250)]],
        company_mode: ['existing' as CompanyMode],
        client_company_id: [null as number | null],
        company_name: [''],
        type_document: ['Jurídica'],
        identity: [''],
    });

    // Se lee del control y no de clientForm.value: dentro de valueChanges el valor del grupo aún no se actualiza
    get companyMode(): CompanyMode {
        return this.clientForm.get('company_mode')!.value;
    }

    get identityError(): string {
        return IDENTITY_RULES[this.clientForm.get('type_document')!.value]?.message ?? 'Ingrese la identificación.';
    }

    ngOnInit(): void {
        this.clientForm.get('company_mode')!.valueChanges.subscribe(() => this.updateCompanyValidators());
        this.clientForm.get('type_document')!.valueChanges.subscribe(() => this.updateCompanyValidators());
        this.updateCompanyValidators();
        this.fetchClients();
        this.fetchCompanies();
    }

    fetchClients(): void {
        this.isLoading = true;
        this.glpiService.getClients().subscribe({
            next: (response: any) => {
                this.clients = response?.data ?? [];
                this.applyFilters();
                this.isLoading = false;
            },
            error: (error: any) => {
                console.error('Error fetching clients:', error);
                this.isLoading = false;
                this.utilsService.onError('Error al obtener los clientes. Por favor, inténtelo de nuevo más tarde.');
            }
        });
    }

    fetchCompanies(): void {
        this.loadingCompanies = true;
        this.glpiService.getClientCompanies().subscribe({
            next: (response: any) => {
                this.companies = response?.data ?? [];
                this.loadingCompanies = false;
            },
            error: (error: any) => {
                console.error('Error fetching client companies:', error);
                this.loadingCompanies = false;
                this.utilsService.onError('Error al obtener las empresas. Por favor, inténtelo de nuevo más tarde.');
            }
        });
    }

    applyFilters(): void {
        const term = this.search.trim().toLowerCase();

        this.filteredClients = this.clients.filter(client => {
            if (this.selectedCompanyId && client.client_company_id !== this.selectedCompanyId) {
                return false;
            }
            if (!term) {
                return true;
            }
            const company = client.client_company;
            return [client.name, company?.company_name, company?.identity]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(term);
        });
    }

    clearFilters(): void {
        this.search = '';
        this.selectedCompanyId = null;
        this.applyFilters();
    }

    openCreate(): void {
        this.clientForm.reset({ name: '', company_mode: 'existing', client_company_id: null, company_name: '', type_document: 'Jurídica', identity: '' });
        this.showCreate = true;
    }

    isInvalid(control: string): boolean {
        const field = this.clientForm.get(control);
        return !!field && field.invalid && (field.touched || field.dirty);
    }

    saveClient(): void {
        if (this.clientForm.invalid) {
            this.clientForm.markAllAsTouched();
            this.utilsService.onWarn('Por favor, complete todos los campos requeridos.');
            return;
        }

        const values = this.clientForm.value;
        const user: any = this.userService.getDataSession();
        const isNewCompany = values.company_mode === 'new';

        const data: NewClient = {
            name: values.name.trim(),
            client_company_id: isNewCompany ? null : values.client_company_id,
            client_company: isNewCompany
                ? {
                    company_name: values.company_name.trim(),
                    type_document: values.type_document,
                    identity: values.identity.trim(),
                }
                : null,
            user: user?.user,
        };

        this.isSaving = true;
        this.glpiService.saveClient(data).subscribe({
            next: (response: any) => {
                this.isSaving = false;
                this.utilsService.onSuccess(response?.message ?? 'Cliente registrado correctamente');
                this.showCreate = false;
                this.fetchClients();
                // Si se creó una empresa, debe quedar disponible en el selector
                if (isNewCompany) {
                    this.fetchCompanies();
                }
            },
            error: (error: any) => {
                console.log(error);
                this.isSaving = false;
                this.utilsService.onError(error?.error?.message ?? 'Error al guardar el cliente, por favor intente nuevamente');
            }
        });
    }

    // Solo se validan los campos del modo de empresa seleccionado
    private updateCompanyValidators(): void {
        const isNew = this.companyMode === 'new';
        const identityRule = IDENTITY_RULES[this.clientForm.get('type_document')!.value];

        this.setValidators('client_company_id', isNew ? [] : [Validators.required]);
        this.setValidators('company_name', isNew ? [Validators.required, Validators.maxLength(250)] : []);
        this.setValidators('type_document', isNew ? [Validators.required] : []);
        this.setValidators('identity', isNew
            ? [Validators.required, ...(identityRule ? [Validators.pattern(identityRule.pattern)] : [])]
            : []);
    }

    private setValidators(control: string, validators: ValidatorFn[]): void {
        const field = this.clientForm.get(control)!;
        field.setValidators(validators);
        field.updateValueAndValidity({ emitEvent: false });
    }
}
