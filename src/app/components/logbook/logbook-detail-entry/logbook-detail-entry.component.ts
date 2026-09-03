import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AvatarModule } from "primeng/avatar";
import { ButtonModule } from "primeng/button";
import { DialogModule } from "primeng/dialog";
import { DropdownModule } from "primeng/dropdown";
import { InputNumberModule } from "primeng/inputnumber";
import { InputTextModule } from "primeng/inputtext";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { ImageModule } from "primeng/image";

@Component({
    selector: 'app-logbook-detail-entry',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        AvatarModule,
        InputTextModule,
        DropdownModule,
        InputNumberModule,
        FormsModule,
        ReactiveFormsModule,
        ProgressSpinnerModule,
        DialogModule,
        ImageModule
    ],
    templateUrl: './logbook-detail-entry.component.html',
    styleUrls: ['./logbook-detail-entry.component.sass'],
})

export class LogbookDetailEntryComponent {
    @Input() logbookData: any = null;
    
}