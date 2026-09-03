import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import dataControlFormsJson  from '../../utils/controlsForms.json';

@Injectable({
    providedIn: 'root'
})
export class UtilsService {
    private readonly messageService = inject(MessageService)

    showModalImage: WritableSignal<any> = signal<any>(null);

    firstControlForms: string;

    openImagesPreview(images: any) {
        this.showModalImage.set(images);
    }

    closeImagesPreview() {
        this.showModalImage.set(null);
    }

    validateControlsForms(form: FormGroup, controlsIgnore: string[]) {
        Object.keys(form.controls).forEach((key) => {
            const control = form.get(key);
            if (control && !controlsIgnore.includes(key)) {
                if ((Array.isArray(control.value) && control.value.length === 0) || control.value === null || control.value === undefined || control.value === ''
                    || control.value === false) {
                    if (!this.firstControlForms) {
                        this.firstControlForms = key;
                    }
                    control.setErrors({ campoVacio: true });
                } else {
                    this.deleteErrorControl(control, 'campoVacio');
                }
            }
        });
    }


    deleteErrorControl(control_name: any, name_error: string) {
        if (control_name?.hasError(name_error)) {
            control_name?.setErrors(null)
        }
    }

    showControlVoiled() {
        const controles: any = dataControlFormsJson
        if (controles.hasOwnProperty(this.firstControlForms)) {
            const controlFound = controles[this.firstControlForms];

            if (this.firstControlForms && this.firstControlForms !== '') {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: `El campo ${controlFound} es requerido`,
                });
            }
        }

        this.firstControlForms = '';
    }

    downloadFile(response: any, defaultName: string) {
        const blob = response.body as Blob;

        const contentDisposition = response.headers.get('content-disposition');
        let fileName = defaultName;

        if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match?.[1]) {
            fileName = match[1];
        }
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();

        window.URL.revokeObjectURL(url);
    }

    formatNumber(value: number): string {
        if (value >= 1_000_000) {
            return (value / 1_000_000).toFixed(1) + 'M';
        }
        if (value >= 1_000) {
            return (value / 1_000).toFixed(1) + 'K';
        }
        return value.toString();
    }

    formatLocalDate(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');

        return `${y}-${m}-${d} ${h}:${min}:${s}`;
    }

    getSeverityDispatch(status: string) {
        switch (status) {
        case "Ingresado en bodega":
            return 'success';
        case "En tránsito":
            return 'warning';
        case "Listo para despacho":
            return 'info';
        case "Finalizado":
            return 'success';
        case "Pendiente Salida":
            return 'warning';
        default:
            return 'info';
        }
    }

    getSeverityEntryControl(status: string) {
        switch (status) {
        case "Finalizado":
            return 'success';
        case "Pendiente Salida":
            return 'warning';
        default:
            return 'info';
        }
    }

    getSeverityPurchaseOrder(status: string) {
        switch (status) {
        case "Completado":
            return 'success';
        case "Incompleto":
            return 'warning';
        case "Con Novedad":
            return 'danger';
        default:
            return 'info';
        }
    }

    getSeverityProjectTechnical(status: string) {
        switch (status) {
        case "Aprobado":
            return 'success';
        case "Pendiente aprobación":
            return 'warning';
        case "Finalizado":
            return 'danger';
        case "Rechazado":
            return 'danger';
        case "En ejecución":
            return 'info';
        default:
            return 'info';
        }
    }

    onSuccess(message: string, time: number = 5000, title: string = 'Éxito') {
        this.messageService.add({
            life: time,
            severity: 'success',
            summary: title,
            detail: message
        });
    }

    onWarn(message: string, time: number = 5000) {
        this.messageService.add({
            life: time,
            severity: 'warn',
            summary: 'Aviso',
            detail: message
        });
    }

    onError(message: string, time: number = 5000) {
        this.messageService.add({
            life: time,
            severity: 'error',
            summary: 'Error',
            detail: message
        });
    }
}


