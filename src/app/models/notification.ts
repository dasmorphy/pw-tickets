export interface NotificationItem {
    body: string;
    created_at: string;
    data?: NotificationData;
    id_notification: string;
    img_url: string | null;
    is_deleted: boolean;
    is_read: boolean;
    notification_type: string;
    read_at: string | null;
    sent_at: string;
    status: string;
    title: string;
    updated_at: string;
    user_id: string;
}

export interface NotificationData {
    history_id?: number;
    notification_type?: string;
    [key: string]: any;
}

export interface NotificationCache {
    items: NotificationItem[];
    saved_at: number;
}

export type NotificationFilter = 'all' | 'unread' | 'read';
