import { Link, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    LayoutDashboard,
    QrCode,
    Settings,
    UserRound,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    attendanceQrScanner,
    dashboard,
    pageSettings,
    participants,
} from '@/routes';
import type { NavItem } from '@/types';

const standardAdminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutDashboard,
    },
    {
        title: 'Participants',
        href: participants(),
        icon: Users,
    },
    {
        title: 'QR Scanner',
        href: attendanceQrScanner(),
        icon: QrCode,
    },
];

const chedAdminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutDashboard,
    },
    {
        title: 'Participants',
        href: participants(),
        icon: Users,
    },
    {
        title: 'Events',
        href: '/events-management',
        icon: CalendarDays,
    },
    {
        title: 'QR Scanner',
        href: attendanceQrScanner(),
        icon: QrCode,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Page Settings',
        href: pageSettings(),
        icon: Settings,
    },
];

const participantNavItems: NavItem[] = [
    {
        title: 'Participant Profile',
        href: '/participant-profile',
        icon: UserRound,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const adminNavItems = auth.isChedAdmin
        ? chedAdminNavItems
        : standardAdminNavItems;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={
                                    auth.isAdmin
                                        ? dashboard()
                                        : '/participant-profile'
                                }
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain
                    items={auth.isAdmin ? adminNavItems : participantNavItems}
                />
            </SidebarContent>

            <SidebarFooter>
                {auth.isChedAdmin && (
                    <NavFooter items={footerNavItems} className="mt-auto" />
                )}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
