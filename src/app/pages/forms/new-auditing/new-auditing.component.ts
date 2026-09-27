import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    QueryList,
    ViewChildren,
    inject,
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ProjectTechnicalService } from 'src/app/services/project-technical.service';
import { UserService } from 'src/app/services/user.service';
import {
    AuditingItem,
    AuditingSection,
    DEFAULT_AUDITING_SECTIONS,
} from './auditing-sections.data';

type ResponseValue = 'SI' | 'NO' | 'N/A';
type SignatureRole = 'auditor' | 'responsible' | 'client';
type SignatureMode = 'draw' | 'upload';

interface AuditStep {
    label: string;
    sectionNames: string[];
}

interface ProjectOption {
    key: string;
    id_task: number;
    location_id: number;
    name: string;
    code: string;
    client: string;
    location: string;
    displayName: string;
}

interface AuditingResponsePayload {
    item_id: number;
    observation: string;
    response: ResponseValue;
}

interface FindingPayload {
    commitment: string;
    criticality: string;
    description: string;
    // images: string[];
    responsible: string;
}

@Component({
    selector: 'app-new-auditing',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        DropdownModule,
        ProgressSpinnerModule,
        ToastModule,
    ],
    templateUrl: './new-auditing.component.html',
    styleUrls: ['./new-auditing.component.sass'],
})
export class NewAuditingComponent implements OnInit, OnDestroy {
    @ViewChildren('signatureCanvas')
    private signatureCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

    private readonly fb = inject(FormBuilder);
    private readonly projectTechnicalService = inject(ProjectTechnicalService);
    private readonly userService = inject(UserService);
    private readonly messageService = inject(MessageService);
    private readonly router = inject(Router);
    private readonly activatedRoute = inject(ActivatedRoute);

    readonly steps: AuditStep[] = [
        { label: 'Inicio', sectionNames: ['Documentación', 'Seguridad Industrial'] },
        { label: 'Instalación', sectionNames: ['CCTV', 'Control de Acceso'] },
        { label: 'Redes', sectionNames: ['Cableado', 'Rack y Redes'] },
        { label: 'Calidad', sectionNames: ['Calidad'] },
        { label: 'Firmas', sectionNames: [] },
    ];

    readonly responseOptions: Array<{ label: string; value: ResponseValue }> = [
        { label: 'Sí', value: 'SI' },
        { label: 'No', value: 'NO' },
        { label: 'N/A', value: 'N/A' },
    ];

    readonly criticalityOptions = ['Alta', 'Media', 'Baja'];
    readonly signatureRoles: Array<{ key: SignatureRole; label: string }> = [
        { key: 'auditor', label: 'Auditor' },
        { key: 'responsible', label: 'Responsable técnico' },
        { key: 'client', label: 'Cliente' },
    ];

    currentStep = 0;
    sections: AuditingSection[] = [];
    projectOptions: ProjectOption[] = [];
    selectedProject: ProjectOption | null = null;
    userJson: any = {};

    isLoadingSections = true;
    isLoadingProjects = true;
    isSubmitting = false;

    readonly generalForm = this.fb.group({
        project_key: this.fb.nonNullable.control('', Validators.required),
        task_id: this.fb.control<number | null>(null, Validators.required),
        location_id: this.fb.control<number | null>(null, Validators.required),
        responsible: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
    });

    readonly responsesForm = new FormGroup<Record<string, FormControl<string | null>>>({});
    readonly observationsForm = new FormGroup<Record<string, FormControl<string>>>({});
    readonly findings = new FormArray<FormGroup>([]);

    findingImages: File[][] = [];
    findingImagePreviews: string[][] = [];

    signatures: Record<SignatureRole, File | null> = {
        auditor: null,
        responsible: null,
        client: null,
    };

    signaturePreviews: Record<SignatureRole, string | null> = {
        auditor: null,
        responsible: null,
        client: null,
    };

    signatureModes: Record<SignatureRole, SignatureMode> = {
        auditor: 'draw',
        responsible: 'draw',
        client: 'draw',
    };

    private drawingRole: SignatureRole | null = null;
    private drawingHasInk = false;
    private signatureObjectUrls: Partial<Record<SignatureRole, string>> = {};

    ngOnInit(): void {
        this.userJson = this.userService.getDataSession();
        this.loadSections();
        this.loadProjects();
    }

    ngOnDestroy(): void {
        this.findingImagePreviews.flat().forEach((url) => URL.revokeObjectURL(url));
        Object.values(this.signatureObjectUrls).forEach((url) => {
            if (url) {
                URL.revokeObjectURL(url);
            }
        });
    }

    get currentSections(): AuditingSection[] {
        return this.getSectionsForStep(this.currentStep);
    }

    get findingControls(): FormGroup[] {
        return this.findings.controls;
    }

    get isCatalogLoading(): boolean {
        return this.isLoadingSections || this.isLoadingProjects;
    }

    get primaryActionLabel(): string {
        return this.currentStep === this.steps.length - 1 ? 'Guardar fiscalización' : 'Siguiente';
    }

    controlName(itemId: number): string {
        return itemId.toString();
    }

    responseControl(itemId: number): FormControl<string | null> {
        return this.responsesForm.controls[this.controlName(itemId)];
    }

    observationControl(itemId: number): FormControl<string> {
        return this.observationsForm.controls[this.controlName(itemId)];
    }

    getSectionsForStep(stepIndex: number): AuditingSection[] {
        const expectedNames = this.steps[stepIndex]?.sectionNames.map((name) => this.normalizeName(name)) ?? [];
        return this.sections.filter((section) => expectedNames.includes(this.normalizeName(section.name)));
    }

    onProjectChange(projectKey: string | null): void {
        this.selectedProject = this.projectOptions.find((project) => project.key === projectKey) ?? null;
        this.generalForm.patchValue({
            task_id: this.selectedProject?.id_task ?? null,
            location_id: this.selectedProject?.location_id ?? null,
        });
    }

    addFinding(): void {
        this.findings.push(this.fb.group({
            description: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(1000)]),
            criticality: this.fb.nonNullable.control('', Validators.required),
            responsible: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
            commitment: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(500)]),
        }));
        this.findingImages.push([]);
        this.findingImagePreviews.push([]);
    }

    removeFinding(index: number): void {
        this.findingImagePreviews[index]?.forEach((url) => URL.revokeObjectURL(url));
        this.findings.removeAt(index);
        this.findingImages.splice(index, 1);
        this.findingImagePreviews.splice(index, 1);
    }

    onFindingImagesSelected(event: Event, findingIndex: number): void {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        const availableSlots = Math.max(0, 10 - this.findingImages[findingIndex].length);
        const validImages = files.filter((file) => file.type.startsWith('image/')).slice(0, availableSlots);

        if (validImages.length !== files.length) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Evidencias limitadas',
                detail: 'Solo se aceptan imágenes y un máximo de 10 por hallazgo.',
            });
        }

        validImages.forEach((file) => {
            this.findingImages[findingIndex].push(file);
            this.findingImagePreviews[findingIndex].push(URL.createObjectURL(file));
        });
        input.value = '';
    }

    removeFindingImage(findingIndex: number, imageIndex: number): void {
        const preview = this.findingImagePreviews[findingIndex][imageIndex];
        URL.revokeObjectURL(preview);
        this.findingImages[findingIndex].splice(imageIndex, 1);
        this.findingImagePreviews[findingIndex].splice(imageIndex, 1);
    }

    setSignatureMode(role: SignatureRole, mode: SignatureMode): void {
        this.signatureModes[role] = mode;
    }

    beginSignature(event: PointerEvent, role: SignatureRole, canvas: HTMLCanvasElement): void {
        event.preventDefault();
        this.prepareCanvas(canvas);
        this.drawingRole = role;
        this.drawingHasInk = false;
        canvas.setPointerCapture(event.pointerId);

        const point = this.getCanvasPoint(event, canvas);
        const context = canvas.getContext('2d');
        context?.beginPath();
        context?.moveTo(point.x, point.y);
    }

    drawSignature(event: PointerEvent, role: SignatureRole, canvas: HTMLCanvasElement): void {
        if (this.drawingRole !== role) {
            return;
        }

        event.preventDefault();
        const point = this.getCanvasPoint(event, canvas);
        const context = canvas.getContext('2d');
        context?.lineTo(point.x, point.y);
        context?.stroke();
        this.drawingHasInk = true;
    }

    endSignature(event: PointerEvent, role: SignatureRole, canvas: HTMLCanvasElement): void {
        if (this.drawingRole !== role) {
            return;
        }

        event.preventDefault();
        this.drawingRole = null;
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }

        if (!this.drawingHasInk) {
            return;
        }

        canvas.toBlob((blob) => {
            if (!blob) {
                return;
            }
            this.clearSignatureObjectUrl(role);
            this.signatures[role] = new File([blob], `${role}-signature.png`, { type: 'image/png' });
            this.signaturePreviews[role] = canvas.toDataURL('image/png');
        }, 'image/png');
    }

    onSignatureUpload(event: Event, role: SignatureRole): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file || !file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Archivo no válido',
                detail: 'La firma debe ser un archivo de imagen.',
            });
            input.value = '';
            return;
        }

        this.clearSignatureObjectUrl(role);
        const previewUrl = URL.createObjectURL(file);
        this.signatureObjectUrls[role] = previewUrl;
        this.signatures[role] = file;
        this.signaturePreviews[role] = previewUrl;
        input.value = '';
    }

    clearSignature(role: SignatureRole): void {
        this.clearSignatureObjectUrl(role);
        this.signatures[role] = null;
        this.signaturePreviews[role] = null;

        const canvasRef = this.signatureCanvases?.find(
            (reference) => reference.nativeElement.dataset['role'] === role,
        );
        const canvas = canvasRef?.nativeElement;
        if (canvas) {
            canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    hasSignature(role: SignatureRole): boolean {
        return Boolean(this.signatures[role]);
    }

    openStep(stepIndex: number): void {
        if (stepIndex <= this.currentStep || this.previousStepsAreValid(stepIndex)) {
            this.currentStep = stepIndex;
            this.scrollToTop();
            return;
        }

        this.markStepTouched(this.firstInvalidStep());
        this.showIncompleteStepMessage();
    }

    previousStep(): void {
        if (this.currentStep === 0) {
            this.cancel();
            return;
        }
        this.currentStep -= 1;
        this.scrollToTop();
    }

    nextOrSubmit(): void {
        if (!this.isStepValid(this.currentStep)) {
            this.markStepTouched(this.currentStep);
            this.showIncompleteStepMessage();
            return;
        }

        if (this.currentStep < this.steps.length - 1) {
            this.currentStep += 1;
            this.scrollToTop();
            return;
        }

        this.submitAuditing();
    }

    isStepValid(stepIndex: number): boolean {
        if (!this.sections.length) {
            return false;
        }

        if (stepIndex === 0 && this.generalForm.invalid) {
            return false;
        }

        if (stepIndex === this.steps.length - 1) {
            return this.signatureRoles.every((signature) => this.hasSignature(signature.key));
        }

        const responsesAreValid = this.getSectionsForStep(stepIndex)
            .flatMap((section) => section.items)
            .every((item) => this.responseControl(item.id_item)?.valid);

        if (!responsesAreValid) {
            return false;
        }

        return stepIndex !== 3 || this.findings.valid;
    }

    isStepComplete(stepIndex: number): boolean {
        return stepIndex < this.currentStep && this.isStepValid(stepIndex);
    }

    isStepAvailable(stepIndex: number): boolean {
        return stepIndex <= this.currentStep || this.previousStepsAreValid(stepIndex);
    }

    cancel(): void {
        void this.router.navigate(['/fiscalizaciones']);
    }

    private loadSections(): void {
        this.isLoadingSections = true;
        this.projectTechnicalService.getAuditingSections().pipe(
            finalize(() => this.isLoadingSections = false),
        ).subscribe({
            next: (response: any) => {
                const apiSections = Array.isArray(response?.data) ? response.data : [];
                const sections = this.hasEveryExpectedSection(apiSections)
                    ? apiSections
                    : DEFAULT_AUDITING_SECTIONS;
                this.setSections(sections);
            },
            error: () => {
                this.setSections(DEFAULT_AUDITING_SECTIONS);
                this.messageService.add({
                    severity: 'info',
                    summary: 'Catálogo local',
                    detail: 'Se cargaron las secciones incluidas en el formulario.',
                });
            },
        });
    }

    private loadProjects(): void {
        this.isLoadingProjects = true;
        this.projectTechnicalService.getProjectsTechnical().pipe(
            finalize(() => this.isLoadingProjects = false),
        ).subscribe({
            next: (response: any) => {
                const projects = Array.isArray(response?.data) ? response.data : [];
                this.projectOptions = projects
                    .filter((project: any) => project?.id_task && project?.location_id)
                    .map((project: any) => ({
                        key: `${project.id_task}:${project.location_id}`,
                        id_task: Number(project.id_task),
                        location_id: Number(project.location_id),
                        name: project.name ?? 'Proyecto sin nombre',
                        code: project.code ?? '',
                        client: project.client ?? 'N/A',
                        location: project.location ?? 'N/A',
                        displayName: [project.code, project.name, project.location].filter(Boolean).join(' · '),
                    }));
                this.applyRequestedProject();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'No se cargaron los proyectos',
                    detail: 'Intenta nuevamente o vuelve al tablero de fiscalizaciones.',
                });
            },
        });
    }

    private applyRequestedProject(): void {
        const requestedTaskId = Number(this.activatedRoute.snapshot.queryParamMap.get('task_id'));
        if (!requestedTaskId) {
            return;
        }

        const project = this.projectOptions.find((option) => option.id_task === requestedTaskId);
        if (project) {
            this.generalForm.controls.project_key.setValue(project.key);
            this.onProjectChange(project.key);
        }
    }

    private setSections(sections: AuditingSection[]): void {
        Object.keys(this.responsesForm.controls).forEach((key) => (this.responsesForm as FormGroup).removeControl(key));
        Object.keys(this.observationsForm.controls).forEach((key) => (this.observationsForm as FormGroup).removeControl(key));

        this.sections = sections
            .map((section) => ({
                ...section,
                id_section: Number(section.id_section),
                order_number: Number(section.order_number),
                items: [...(section.items ?? [])]
                    .map((item) => ({
                        ...item,
                        id_item: Number(item.id_item),
                        order_number: Number(item.order_number),
                    }))
                    .sort((first, second) => first.order_number - second.order_number),
            }))
            .sort((first, second) => first.order_number - second.order_number);

        this.sections.flatMap((section) => section.items).forEach((item) => {
            const name = this.controlName(item.id_item);
            this.responsesForm.addControl(name, new FormControl<string | null>(null, Validators.required));
            this.observationsForm.addControl(name, new FormControl('', { nonNullable: true }));
        });
    }

    private submitAuditing(): void {
        const invalidStep = this.firstInvalidStep();
        if (invalidStep !== -1) {
            this.currentStep = invalidStep;
            this.markStepTouched(invalidStep);
            this.showIncompleteStepMessage();
            return;
        }

        const payload = this.buildRequestPayload();
        console.log(payload)
        const formData = new FormData();
        formData.append(
            'data',
            new Blob([JSON.stringify(payload)], { type: 'application/json' }),
            'auditing.json',
        );

        // this.findingImages.forEach((images, findingIndex) => {
        //     images.forEach((image, imageIndex) => {
        //         formData.append(findingImageKeys[findingIndex][imageIndex], image, image.name);
        //     });
        // });

        this.findingImages.forEach((images, findingIndex) => {
            images.forEach((image, imageIndex) => {
                const key = `finding_${findingIndex}_${imageIndex}`;

                formData.append(
                key,
                image,
                `finding_${findingIndex}_${imageIndex}.webp`,
                );
            });
        });

        this.signatureRoles.forEach(({ key }) => {
            const signature = this.signatures[key];
            if (signature) {
                formData.append(`${key}_img`, signature, signature.name);
            }
        });

        this.isSubmitting = true;
        this.projectTechnicalService.postAuditing(formData).pipe(
            finalize(() => this.isSubmitting = false),
        ).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Fiscalización guardada',
                    detail: 'El registro fue enviado correctamente.',
                });
                window.setTimeout(() => void this.router.navigate(['/fiscalizaciones']), 700);
            },
            error: (error: any) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'No se pudo guardar',
                    detail: error?.error?.message ?? 'Revisa la conexión e intenta nuevamente.',
                });
            },
        });
    }

    private buildRequestPayload() {
        const formValue = this.generalForm.getRawValue();
        const transactionId = uuidv4();
        const responses: AuditingResponsePayload[] = this.sections
            .flatMap((section) => section.items)
            .map((item) => ({
                item_id: item.id_item,
                observation: this.observationControl(item.id_item).value.trim() || 'N/A',
                response: this.responseControl(item.id_item).value as ResponseValue,
            }));

        const findingImageKeys = this.findingImages.map((images, findingIndex) =>
            images.map((_image, imageIndex) => `finding_${findingIndex}_${imageIndex}`),
        );

        const findings: FindingPayload[] = this.findingControls.map((finding, findingIndex) => {
            const value = finding.getRawValue();
            return {
                commitment: value.commitment.trim(),
                criticality: value.criticality,
                description: value.description.trim(),
                images: findingImageKeys[findingIndex],
                responsible: value.responsible.trim(),
            };
        });

        return {
            // findings,
            // payload: {
                // auditor_img: 'auditor_img',
                channel: 'ZENTINEL',
                // client_img: 'client_img',
                data: {
                    findings,
                    location_id: formValue.location_id,
                    responses,
                    responsible: formValue.responsible.trim(),
                    status: 'Pendiente',
                    task_id: formValue.task_id,
                    user: this.userJson?.user ?? 'Desconocido',
                },
                // externalTransactionId: transactionId,
                // El backend actual lee snake_case dentro del archivo JSON multipart.
                external_transaction_id: transactionId,
                // responsible_img: 'responsible_img',
            // },
        };
    }

    private previousStepsAreValid(stepIndex: number): boolean {
        for (let index = 0; index < stepIndex; index += 1) {
            if (!this.isStepValid(index)) {
                return false;
            }
        }
        return true;
    }

    private firstInvalidStep(): number {
        for (let index = 0; index < this.steps.length; index += 1) {
            if (!this.isStepValid(index)) {
                return index;
            }
        }
        return -1;
    }

    private markStepTouched(stepIndex: number): void {
        if (stepIndex < 0) {
            return;
        }
        if (stepIndex === 0) {
            this.generalForm.markAllAsTouched();
        }
        if (stepIndex < this.steps.length - 1) {
            this.getSectionsForStep(stepIndex).flatMap((section) => section.items).forEach((item) => {
                this.responseControl(item.id_item)?.markAsTouched();
            });
        }
        if (stepIndex === 3) {
            this.findings.markAllAsTouched();
        }
    }

    private showIncompleteStepMessage(): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Formulario incompleto',
            detail: 'Completa todos los campos obligatorios antes de continuar.',
        });
    }

    private normalizeName(value: string): string {
        return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }

    private hasEveryExpectedSection(sections: AuditingSection[]): boolean {
        const availableNames = sections.map((section) => this.normalizeName(section.name));
        return this.steps
            .flatMap((step) => step.sectionNames)
            .every((name) => availableNames.includes(this.normalizeName(name)));
    }

    private prepareCanvas(canvas: HTMLCanvasElement): void {
        if (canvas.dataset['ready'] === 'true') {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
        canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));

        const context = canvas.getContext('2d');
        context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        if (context) {
            context.strokeStyle = '#263143';
            context.lineWidth = 2.5;
            context.lineCap = 'round';
            context.lineJoin = 'round';
        }
        canvas.dataset['ready'] = 'true';
    }

    private getCanvasPoint(event: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    private clearSignatureObjectUrl(role: SignatureRole): void {
        const url = this.signatureObjectUrls[role];
        if (url) {
            URL.revokeObjectURL(url);
            delete this.signatureObjectUrls[role];
        }
    }

    private scrollToTop(): void {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
