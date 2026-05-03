export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    given_name?: string | null;
    middle_name?: string | null;
    surname?: string | null;
    phone?: string | null;
    organization?: string | null;
    position?: string | null;
    participant_type?: string | null;
    sex?: string | null;
    event_name?: string | null;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
    isAdmin: boolean;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
