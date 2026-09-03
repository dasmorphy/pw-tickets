export interface AuditingItem {
    id_item: number;
    name: string;
    order_number: number;
}

export interface AuditingSection {
    id_section: number;
    name: string;
    order_number: number;
    items: AuditingItem[];
}

export const DEFAULT_AUDITING_SECTIONS: AuditingSection[] = [
    {
        id_section: 1,
        name: 'Documentación',
        order_number: 1,
        items: [
            { id_item: 1, name: 'Planos aprobados', order_number: 1 },
            { id_item: 2, name: 'Cronograma', order_number: 2 },
            { id_item: 3, name: 'Permisos', order_number: 3 },
            { id_item: 4, name: 'ATS', order_number: 4 },
            { id_item: 5, name: 'Manuales', order_number: 5 },
        ],
    },
    {
        id_section: 2,
        name: 'Seguridad Industrial',
        order_number: 2,
        items: [
            { id_item: 6, name: 'EPP completo', order_number: 1 },
            { id_item: 7, name: 'Área delimitada', order_number: 2 },
            { id_item: 8, name: 'Orden y limpieza', order_number: 3 },
            { id_item: 9, name: 'Escaleras certificadas', order_number: 4 },
        ],
    },
    {
        id_section: 3,
        name: 'CCTV',
        order_number: 3,
        items: [
            { id_item: 10, name: 'Ubicación según plano', order_number: 1 },
            { id_item: 11, name: 'Imagen correcta', order_number: 2 },
            { id_item: 12, name: 'Etiquetado', order_number: 3 },
            { id_item: 13, name: 'Grabación OK', order_number: 4 },
        ],
    },
    {
        id_section: 4,
        name: 'Control de Acceso',
        order_number: 4,
        items: [
            { id_item: 14, name: 'Lectores', order_number: 1 },
            { id_item: 15, name: 'Botón salida', order_number: 2 },
            { id_item: 16, name: 'Cerradura', order_number: 3 },
            { id_item: 17, name: 'Pruebas funcionales', order_number: 4 },
        ],
    },
    {
        id_section: 5,
        name: 'Cableado',
        order_number: 5,
        items: [
            { id_item: 18, name: 'Canalización', order_number: 1 },
            { id_item: 19, name: 'Etiquetado', order_number: 2 },
            { id_item: 20, name: 'Organización', order_number: 3 },
            { id_item: 21, name: 'Sin empalmes', order_number: 4 },
        ],
    },
    {
        id_section: 6,
        name: 'Rack y Redes',
        order_number: 6,
        items: [
            { id_item: 22, name: 'Rack ordenado', order_number: 1 },
            { id_item: 23, name: 'Patch panel', order_number: 2 },
            { id_item: 24, name: 'Switch', order_number: 3 },
            { id_item: 25, name: 'UPS', order_number: 4 },
            { id_item: 26, name: 'Conectividad', order_number: 5 },
        ],
    },
    {
        id_section: 7,
        name: 'Calidad',
        order_number: 7,
        items: [
            { id_item: 27, name: 'Acabados', order_number: 1 },
            { id_item: 28, name: 'Limpieza', order_number: 2 },
            { id_item: 29, name: 'Documentación entregada', order_number: 3 },
        ],
    },
];
