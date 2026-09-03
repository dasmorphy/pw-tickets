export interface EntryAccess {
    area_id: number;
    area_name: string;
    created_at: Date;
    created_by: string;
    dni: string;
    id_access_control: number;
    images: ImageEntry[];
    materials: Material[];
    names_visit: string;
    observations_entry: string;
    observations_out: string;
    reason_visit: string;
    staff_charge_id: number;
    staff_charge_name: string;
    other_staff: string;
    status: string;
    updated_at: Date;
    updated_by: string;
}

export interface ImageEntry {
    image_path: string;
    type_process: string;
}

export interface Material {
    id_material?: number;
    other_material?: string;
    name?: string;
    quantity: number;
}
