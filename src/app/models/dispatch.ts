export interface Dispatch {
    created_at: Date;
    created_by: string;
    driver: string;
    id_dispatch: number;
    images: Image[];
    name_destiny: string;
    name_vehicle_type: string;
    observations: string;
    order_number: string;
    reception?: Reception;
    skus: Skus[];
    status: string;
    truck_license: string;
    updated_at: Date;
    updated_by: string;
    weight: null;
}

export interface Image {
    image_path: string;
    process: string;
}
export interface Reception {
    created_at: Date;
    id_reception: number;
    is_correct: boolean;
    observations: string;
    reception_detail: any[];
}

export interface Skus {
    id_sku: number;
    products: Product[];
    type_sku: string;
}

export interface Product {
    id_product: number;
    id_product_sku: number;
    name: string;
    quantity: number;
}
