import { CommonModule } from '@angular/common';
import { Component, computed, Input, inject, HostListener } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
    selector: 'app-preview-image',
    standalone: true,
    imports: [
        CommonModule,
        DialogModule,
        ButtonModule,
        TooltipModule
    ],
    templateUrl: './preview-image.component.html',
    styleUrls: ['./preview-image.component.sass']
})

export class ImageGalleryComponent {
    @Input() showImages: any;

    private utilsService = inject(UtilsService);

    images = computed(() => this.utilsService.showModalImage());
    
    selectedIndex = 0;

    selectImage(index: number) {
        this.selectedIndex = index;
    }

    nextImage() {
        if (this.showImages && this.showImages.length > 0) {
            this.selectedIndex = (this.selectedIndex + 1) % this.showImages.length;
        }
    }

    previousImage() {
        if (this.showImages && this.showImages.length > 0) {
            this.selectedIndex = (this.selectedIndex - 1 + this.showImages.length) % this.showImages.length;
        }
    }

    downloadImage() {
        if (this.showImages && this.showImages[this.selectedIndex]) {
            const imageUrl = 'http://st.telearseg.net' + this.showImages[this.selectedIndex].image_path;
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `image-${this.selectedIndex + 1}.jpg`;
            link.click();
        }
    }

    toggleFullscreen() {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyboard(event: KeyboardEvent) {
        if (this.showImages && this.showImages.length > 0) {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                this.previousImage();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                this.nextImage();
            }
        }
    }

    closeModal() {
        this.utilsService.closeImagesPreview();
    }
}