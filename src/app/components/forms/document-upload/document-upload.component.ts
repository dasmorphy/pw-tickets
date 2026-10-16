import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { UtilsService } from 'src/app/services/utils.service';

// Mismas extensiones que acepta el backend (proxy-glpi-ms / utils/inspection_documents.py)
const ALLOWED_EXTENSIONS = [
    'pdf',
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt',
];

@Component({
    selector: 'app-document-upload',
    standalone: true,
    imports: [CommonModule, ButtonModule],
    templateUrl: './document-upload.component.html',
    styleUrls: ['./document-upload.component.sass']
})
export class DocumentUploadComponent {
    private utilsService = inject(UtilsService);

    @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;

    @Input() files: File[] = [];
    @Output() filesChange = new EventEmitter<File[]>();

    @Input() maxFiles = 5;
    @Input() maxSizeMb = 10;
    @Input() disabled = false;

    readonly accept = ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(',');
    dragging = false;

    get remaining(): number {
        return this.maxFiles - this.files.length;
    }

    openPicker() {
        if (!this.disabled && this.remaining > 0) {
            this.fileInput.nativeElement.click();
        }
    }

    onFileInput(event: Event) {
        const input = event.target as HTMLInputElement;
        this.addFiles(Array.from(input.files ?? []));
        // Permite volver a elegir el mismo archivo después de quitarlo
        input.value = '';
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.dragging = !this.disabled && this.remaining > 0;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.dragging = false;
        if (!this.disabled) {
            this.addFiles(Array.from(event.dataTransfer?.files ?? []));
        }
    }

    addFiles(selected: File[]) {
        const accepted: File[] = [];
        const rejected: string[] = [];

        for (const file of selected) {
            const duplicated = [...this.files, ...accepted].some(f => f.name === file.name && f.size === file.size);
            if (duplicated) {
                continue;
            }
            if (!ALLOWED_EXTENSIONS.includes(this.extension(file.name))) {
                rejected.push(`${file.name} (tipo no permitido)`);
                continue;
            }
            if (file.size > this.maxSizeMb * 1024 * 1024) {
                rejected.push(`${file.name} (supera ${this.maxSizeMb} MB)`);
                continue;
            }
            accepted.push(file);
        }

        if (accepted.length > this.remaining) {
            this.utilsService.onWarn(`Solo se pueden adjuntar hasta ${this.maxFiles} documentos.`);
            accepted.splice(this.remaining);
        }

        if (rejected.length) {
            this.utilsService.onWarn(`No se adjuntaron: ${rejected.join(', ')}`);
        }

        if (accepted.length) {
            this.files = [...this.files, ...accepted];
            this.filesChange.emit(this.files);
        }
    }

    removeFile(index: number) {
        this.files = this.files.filter((_, i) => i !== index);
        this.filesChange.emit(this.files);
    }

    extension(name: string): string {
        return (name.split('.').pop() ?? '').toLowerCase();
    }

    fileIcon(name: string): string {
        const ext = this.extension(name);
        if (ext === 'pdf') return 'pi-file-pdf';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic'].includes(ext)) return 'pi-image';
        if (['xls', 'xlsx', 'csv'].includes(ext)) return 'pi-file-excel';
        if (['doc', 'docx'].includes(ext)) return 'pi-file-word';
        return 'pi-file';
    }

    formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}
