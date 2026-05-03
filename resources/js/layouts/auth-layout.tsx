import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

export default function AuthLayout({
    title = '',
    description = '',
    background = 'default',
    children,
}: {
    title?: string;
    description?: string;
    background?: 'default' | 'welcome-banner';
    children: React.ReactNode;
}) {
    return (
        <AuthLayoutTemplate
            title={title}
            description={description}
            background={background}
        >
            {children}
        </AuthLayoutTemplate>
    );
}
