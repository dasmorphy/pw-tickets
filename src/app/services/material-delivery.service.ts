import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment.development";

// Producto nuevo de la proforma que aún no existe en el catálogo
export interface PendingMaterialInfo {
    id_pending_material: number;
    // 'Pendiente' | 'Creado'
    status: string;
    name_material: string | null;
    model: string | null;
    quantity: number;
    base_price: number | null;
    profit_margin: number | null;
    profit_margin_dollar: number | null;
}

// Línea de la proforma a entregar: un ítem o un componente de "Materiales varios"
export interface ProjectMaterial {
    // Clave estable de la línea: item-{id} o additional-{id}
    key: string;
    quotation_item_id: number | null;
    additional_material_id: number | null;
    // null mientras el producto nuevo no se cree en el catálogo
    material_id: number | null;
    product: string;
    model: string | null;
    code: string | null;
    unit: string | null;
    // Cantidad aprobada en la proforma
    quantity: number;
    delivered: number;
    pending: number;
    // null cuando el producto aún no existe en el catálogo
    stock: number | null;
    is_new: boolean;
    // Ítem "Materiales varios" del que proviene el material
    group: string | null;
    pending_material: PendingMaterialInfo | null;
}

export interface DeliveryItem {
    key: string;
    material_id: number | null;
    pending_material_id: number | null;
    quantity: number;
}

export interface MaterialDelivery {
    id_delivery: number;
    technician: string;
    technician_name: string;
    delivered_by: string;
    created_at: string;
    observations: string | null;
    status: string;
    items: DeliveryItem[];
}

export interface ProjectTechnician {
    user: string;
    fullname_user: string;
}

export interface ProjectMaterialsResponse {
    project_id: number;
    quote_id: number;
    proforma_code: string | null;
    technicians: ProjectTechnician[];
    materials: ProjectMaterial[];
    deliveries: MaterialDelivery[];
}

export interface SaveDeliveryPayload {
    task_id: number;
    delivered_to: string;
    observation: string | null;
    items: {
        quotation_item_id: number | null;
        additional_material_id: number | null;
        // Solo enteros: el stock del catálogo es entero
        quantity: number;
    }[];
    user: string;
}

export interface ResolvePendingPayload {
    product: string;
    code: string | null;
    model: string | null;
    unit: string | null;
    description: string | null;
    provider_id: number | null;
    base_price: number | null;
    // Fracción: 30 % -> 0.3
    profit_margin: number | null;
    profit_margin_dollar: number | null;
    price: number | null;
    // Stock recibido; mínimo la cantidad de la proforma
    stock: number;
    user: string;
}

@Injectable({
    providedIn: 'root'
})
export class MaterialDeliveryService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiTicket}/rest/proxy-glpi-api/v1.0`;

    getProjectMaterials(projectId: number): Observable<{ data: ProjectMaterialsResponse }> {
        return this.http.get<{ data: ProjectMaterialsResponse }>(`${this.baseUrl}/project-materials/${projectId}`);
    }

    saveDelivery(data: SaveDeliveryPayload): Observable<{ message: string; data: { id_history: number } }> {
        return this.http.post<{ message: string; data: { id_history: number } }>(`${this.baseUrl}/material-delivery`, { data });
    }

    getPendingMaterials(filters?: { quote_id?: number; status?: string }): Observable<any> {
        let params = new HttpParams();
        if (filters?.quote_id != null) {
            params = params.set('quote_id', filters.quote_id);
        }
        if (filters?.status) {
            params = params.set('status', filters.status);
        }
        return this.http.get(`${this.baseUrl}/pending-material`, { params });
    }

    resolvePendingMaterial(idPendingMaterial: number, data: ResolvePendingPayload): Observable<{ message: string; data: { id_equipment: number } }> {
        return this.http.post<{ message: string; data: { id_equipment: number } }>(
            `${this.baseUrl}/pending-material/${idPendingMaterial}/resolve`,
            { data }
        );
    }
}
