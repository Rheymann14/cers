import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    GraduationCap,
    Map,
    MapPin,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    ToggleLeft,
    ToggleRight,
    Trash2,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { pageSettings } from '@/routes';

type BaseSetting = {
    id: number;
    name: string;
    is_active: boolean;
    created_at: string | null;
    users_count: number;
};

type CreatedSetting = BaseSetting & {
    slug: string;
    creator: {
        id: number;
        name: string;
    } | null;
};

type ParticipantType = CreatedSetting & {
    type: string;
};

type Organization = CreatedSetting & {
    type: string;
};

type Province = BaseSetting & {
    code: string;
    region_name: string;
};

type Municipality = BaseSetting & {
    province_id: number;
    code: string;
    type: string;
    province: {
        id: number;
        name: string;
        code: string;
    } | null;
};

type SettingsKey =
    | 'participant-types'
    | 'organizations'
    | 'provinces'
    | 'municipalities';

type SettingsRecord = ParticipantType | Organization | Province | Municipality;

type SettingsForm = {
    name: string;
    slug: string;
    type: string;
    code: string;
    region_name: string;
    province_id: string;
    is_active: boolean;
};

type Props = {
    participantTypes: ParticipantType[];
    organizations: Organization[];
    provinces: Province[];
    municipalities: Municipality[];
};

const pageSizeOptions = [5, 10, 25];

const defaultForm: SettingsForm = {
    name: '',
    slug: '',
    type: 'general',
    code: '',
    region_name: '',
    province_id: '',
    is_active: true,
};

const settingsSections = [
    {
        id: 'participant-types-table',
        label: 'Participant Types',
    },
    {
        id: 'organizations-table',
        label: 'School or Organization Management',
    },
    {
        id: 'provinces-table',
        label: 'Province Management',
    },
    {
        id: 'municipalities-table',
        label: 'Municipality Management',
    },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
});

const preventDialogOutsideClose: NonNullable<
    ComponentProps<typeof DialogContent>['onPointerDownOutside']
> = (event) => {
    const target = event.target;

    if (
        target instanceof HTMLElement &&
        target.closest('[data-radix-popper-content-wrapper]')
    ) {
        return;
    }

    event.preventDefault();
};

function scrollToSettingsSection(sectionId: string) {
    document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function PageSettings({
    participantTypes,
    organizations,
    provinces,
    municipalities,
}: Props) {
    return (
        <>
            <Head title="Page Settings" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-hidden p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Page Settings
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Maintain the options used in registration forms and
                        participant records.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-2 text-card-foreground shadow-sm">
                    {settingsSections.map((section) => (
                        <Button
                            key={section.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 justify-center text-xs"
                            onClick={() => scrollToSettingsSection(section.id)}
                        >
                            {section.label}
                        </Button>
                    ))}
                </div>

                <SettingsTable
                    sectionId="participant-types-table"
                    tableKey="participant-types"
                    title="Participant Types"
                    description="Manage the participant categories shown during event registration."
                    icon={GraduationCap}
                    searchPlaceholder="Search participant types..."
                    emptyText="No participant types found."
                    items={participantTypes}
                    columns={[
                        {
                            label: 'Participant Type',
                            render: (item) => (
                                <p className="font-medium text-foreground">
                                    {item.name}
                                </p>
                            ),
                        },
                        {
                            label: 'Slug',
                            render: (item) =>
                                'slug' in item ? item.slug : '-',
                        },
                        {
                            label: 'Category',
                            render: (item) =>
                                'type' in item
                                    ? formatTypeLabel(item.type)
                                    : '-',
                        },
                        {
                            label: 'Status',
                            render: (item) => (
                                <StatusBadge active={item.is_active} />
                            ),
                        },
                        {
                            label: 'Participants',
                            render: (item) => item.users_count.toLocaleString(),
                        },
                        {
                            label: 'Date Created',
                            render: (item) => formatDate(item.created_at),
                        },
                        {
                            label: 'Added By',
                            render: (item) =>
                                'creator' in item
                                    ? (item.creator?.name ?? 'System')
                                    : '-',
                        },
                    ]}
                />

                <SettingsTable
                    sectionId="organizations-table"
                    tableKey="organizations"
                    title="School or Organization Management"
                    description="Keep the schools and partner organizations used in participant profiles."
                    icon={Building2}
                    searchPlaceholder="Search schools or organizations..."
                    emptyText="No schools or organizations found."
                    items={organizations}
                    columns={[
                        {
                            label: 'Name',
                            render: (item) => (
                                <p className="font-medium text-foreground">
                                    {item.name}
                                </p>
                            ),
                        },
                        {
                            label: 'Slug',
                            render: (item) =>
                                'slug' in item ? item.slug : '-',
                        },
                        {
                            label: 'Type',
                            render: (item) =>
                                'type' in item ? item.type : '-',
                        },
                        {
                            label: 'Status',
                            render: (item) => (
                                <StatusBadge active={item.is_active} />
                            ),
                        },
                        {
                            label: 'Participants',
                            render: (item) => item.users_count.toLocaleString(),
                        },
                        {
                            label: 'Date Created',
                            render: (item) => formatDate(item.created_at),
                        },
                        {
                            label: 'Added By',
                            render: (item) =>
                                'creator' in item
                                    ? (item.creator?.name ?? 'System')
                                    : '-',
                        },
                    ]}
                />

                <SettingsTable
                    sectionId="provinces-table"
                    tableKey="provinces"
                    title="Province Management"
                    description="Maintain provinces available in participant address selections."
                    icon={Map}
                    searchPlaceholder="Search provinces..."
                    emptyText="No provinces found."
                    items={provinces}
                    columns={[
                        {
                            label: 'Province',
                            render: (item) => (
                                <p className="font-medium text-foreground">
                                    {item.name}
                                </p>
                            ),
                        },
                        {
                            label: 'Code',
                            render: (item) =>
                                'code' in item ? item.code : '-',
                        },
                        {
                            label: 'Region',
                            render: (item) =>
                                'region_name' in item ? item.region_name : '-',
                        },
                        {
                            label: 'Status',
                            render: (item) => (
                                <StatusBadge active={item.is_active} />
                            ),
                        },
                        {
                            label: 'Participants',
                            render: (item) => item.users_count.toLocaleString(),
                        },
                        {
                            label: 'Date Created',
                            render: (item) => formatDate(item.created_at),
                        },
                    ]}
                />

                <SettingsTable
                    sectionId="municipalities-table"
                    tableKey="municipalities"
                    title="Municipality Management"
                    description="Maintain cities and municipalities available under each province."
                    icon={MapPin}
                    searchPlaceholder="Search municipalities..."
                    emptyText="No municipalities found."
                    items={municipalities}
                    provinceOptions={provinces}
                    columns={[
                        {
                            label: 'Municipality',
                            render: (item) => (
                                <p className="font-medium text-foreground">
                                    {item.name}
                                </p>
                            ),
                        },
                        {
                            label: 'Province',
                            render: (item) =>
                                'province' in item
                                    ? (item.province?.name ?? '-')
                                    : '-',
                        },
                        {
                            label: 'Code',
                            render: (item) =>
                                'code' in item ? item.code : '-',
                        },
                        {
                            label: 'Type',
                            render: (item) =>
                                'type' in item ? item.type : '-',
                        },
                        {
                            label: 'Status',
                            render: (item) => (
                                <StatusBadge active={item.is_active} />
                            ),
                        },
                        {
                            label: 'Participants',
                            render: (item) => item.users_count.toLocaleString(),
                        },
                        {
                            label: 'Date Created',
                            render: (item) => formatDate(item.created_at),
                        },
                    ]}
                />
            </div>
        </>
    );
}

function SettingsTable({
    sectionId,
    tableKey,
    title,
    description,
    icon: Icon,
    searchPlaceholder,
    emptyText,
    items,
    provinceOptions = [],
    columns,
}: {
    sectionId: string;
    tableKey: SettingsKey;
    title: string;
    description: string;
    icon: LucideIcon;
    searchPlaceholder: string;
    emptyText: string;
    items: SettingsRecord[];
    provinceOptions?: Province[];
    columns: {
        label: string;
        render: (item: SettingsRecord) => ReactNode;
    }[];
}) {
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(pageSizeOptions[0]);
    const [page, setPage] = useState(1);
    const [editingItem, setEditingItem] = useState<SettingsRecord | null>(null);
    const [deletingItem, setDeletingItem] = useState<SettingsRecord | null>(
        null,
    );
    const [statusItem, setStatusItem] = useState<SettingsRecord | null>(null);
    const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
    const [provincePopoverOpen, setProvincePopoverOpen] = useState(false);
    const {
        data,
        setData,
        post,
        patch,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm<SettingsForm>(defaultForm);

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return items;
        }

        return items.filter((item) =>
            searchableText(item).toLowerCase().includes(query),
        );
    }, [items, search]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = filteredItems.slice(startIndex, startIndex + pageSize);
    const selectedProvince = provinceOptions.find(
        (province) => String(province.id) === data.province_id,
    );

    function updateSearch(value: string) {
        setSearch(value);
        setPage(1);
    }

    function updatePageSize(value: number) {
        setPageSize(value);
        setPage(1);
    }

    function openAddDialog() {
        clearErrors();
        setEditingItem(null);
        setData(defaultSettingsForm(tableKey, provinceOptions));
        setDialogMode('add');
    }

    function openEditDialog(item: SettingsRecord) {
        clearErrors();
        setEditingItem(item);
        setData({
            name: item.name,
            slug: 'slug' in item ? item.slug : '',
            type: 'type' in item ? item.type : 'school',
            code: 'code' in item ? item.code : '',
            region_name: 'region_name' in item ? item.region_name : '',
            province_id: 'province_id' in item ? String(item.province_id) : '',
            is_active: item.is_active,
        });
        setDialogMode('edit');
    }

    function closeFormDialog() {
        setProvincePopoverOpen(false);
        setDialogMode(null);
        setEditingItem(null);
        reset();
        clearErrors();
    }

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: closeFormDialog,
        };

        if (dialogMode === 'edit' && editingItem) {
            patch(`/page-settings/${tableKey}/${editingItem.id}`, options);

            return;
        }

        post(`/page-settings/${tableKey}`, options);
    }

    function submitStatusToggle() {
        if (!statusItem) {
            return;
        }

        router.patch(
            `/page-settings/${tableKey}/${statusItem.id}/status`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setStatusItem(null),
            },
        );
    }

    function submitDelete() {
        if (!deletingItem) {
            return;
        }

        router.delete(`/page-settings/${tableKey}/${deletingItem.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingItem(null),
        });
    }

    const formTitle = dialogMode === 'edit' ? `Edit ${title}` : `Add ${title}`;

    return (
        <section
            id={sectionId}
            className="scroll-mt-4 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
        >
            <div className="flex flex-col gap-3 border-b p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <h2 className="text-base font-medium">{title}</h2>
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    </div>
                </div>
                <Button
                    type="button"
                    size="sm"
                    onClick={openAddDialog}
                    className="h-8 justify-center text-xs"
                >
                    <Plus className="size-3.5" />
                    Add
                </Button>
            </div>

            <div className="flex flex-col gap-3 border-b p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-sm">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => updateSearch(event.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground md:justify-end">
                    <span>Rows</span>
                    <select
                        value={pageSize}
                        onChange={(event) =>
                            updatePageSize(Number(event.target.value))
                        }
                        className="h-9 rounded-md border border-input bg-background px-2 text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        {pageSizeOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="divide-y md:hidden">
                {pageItems.length > 0 ? (
                    pageItems.map((item, index) => (
                        <article key={item.id} className="p-3 sm:p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                                        Seq {startIndex + index + 1}
                                    </p>
                                    <h3 className="truncate text-sm font-semibold">
                                        {item.name}
                                    </h3>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {recordSubtitle(item)}
                                    </p>
                                </div>
                                <ActionButtons
                                    item={item}
                                    onEdit={openEditDialog}
                                    onStatus={setStatusItem}
                                    onDelete={setDeletingItem}
                                />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <StatusBadge active={item.is_active} />
                                {'code' in item && (
                                    <Badge variant="outline">{item.code}</Badge>
                                )}
                                {'type' in item && (
                                    <Badge variant="outline">{item.type}</Badge>
                                )}
                                {'region_name' in item && (
                                    <Badge variant="outline">
                                        {item.region_name}
                                    </Badge>
                                )}
                                {'province' in item && item.province && (
                                    <Badge variant="outline">
                                        {item.province.name}
                                    </Badge>
                                )}
                                <Badge variant="outline">
                                    {item.users_count.toLocaleString()} users
                                </Badge>
                                <Badge variant="outline">
                                    {formatDate(item.created_at)}
                                </Badge>
                                {'creator' in item && (
                                    <Badge variant="outline">
                                        Added by{' '}
                                        {item.creator?.name ?? 'System'}
                                    </Badge>
                                )}
                            </div>
                        </article>
                    ))
                ) : (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                        {emptyText}
                    </div>
                )}
            </div>

            <Table className="hidden table-fixed text-xs md:table">
                <TableHeader>
                    <TableRow className="bg-muted/45 hover:bg-muted/45">
                        <TableHead className="h-9 w-12 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                            Seq
                        </TableHead>
                        {columns.map((column) => (
                            <TableHead
                                key={column.label}
                                className="h-9 px-2 text-[11px] font-semibold text-muted-foreground uppercase"
                            >
                                {column.label}
                            </TableHead>
                        ))}
                        <TableHead className="h-9 w-28 px-2 text-right text-[11px] font-semibold text-muted-foreground uppercase">
                            Actions
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pageItems.length > 0 ? (
                        pageItems.map((item, index) => (
                            <TableRow
                                key={item.id}
                                className="odd:bg-muted/[0.18]"
                            >
                                <TableCell className="px-2 py-2 font-medium text-muted-foreground">
                                    {startIndex + index + 1}
                                </TableCell>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.label}
                                        className="px-2 py-2 align-top leading-5 break-words whitespace-normal"
                                    >
                                        {column.render(item)}
                                    </TableCell>
                                ))}
                                <TableCell className="px-2 py-2">
                                    <div className="flex justify-end">
                                        <ActionButtons
                                            item={item}
                                            onEdit={openEditDialog}
                                            onStatus={setStatusItem}
                                            onDelete={setDeletingItem}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length + 2}
                                className="h-24 text-center text-muted-foreground"
                            >
                                {emptyText}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t p-3 text-sm text-muted-foreground sm:p-4 md:flex-row md:items-center md:justify-between">
                <p>
                    Showing{' '}
                    <span className="font-medium text-foreground">
                        {filteredItems.length === 0 ? 0 : startIndex + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium text-foreground">
                        {Math.min(startIndex + pageSize, filteredItems.length)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium text-foreground">
                        {filteredItems.length}
                    </span>{' '}
                    records
                </p>
                <div className="flex items-center justify-center gap-2 md:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Previous page"
                        disabled={currentPage === 1}
                        onClick={() => setPage(Math.max(1, currentPage - 1))}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <span className="min-w-24 text-center">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Next page"
                        disabled={currentPage === totalPages}
                        onClick={() =>
                            setPage(Math.min(totalPages, currentPage + 1))
                        }
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>

            <Dialog
                open={dialogMode !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeFormDialog();
                    }
                }}
            >
                <DialogContent
                    className="max-h-[calc(100vh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-lg"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            {dialogMode === 'edit' ? (
                                <Pencil className="size-4 text-muted-foreground" />
                            ) : (
                                <Plus className="size-4 text-muted-foreground" />
                            )}
                            {formTitle}
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Update the option details used across registration
                            and participant management.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitForm} className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor={`${tableKey}-name`}>Name</Label>
                                <Input
                                    id={`${tableKey}-name`}
                                    value={data.name}
                                    onChange={(event) =>
                                        setData('name', event.target.value)
                                    }
                                    aria-invalid={!!errors.name}
                                />
                                <InputError message={errors.name} />
                            </div>

                            {usesSlug(tableKey) ? (
                                <div className="space-y-2">
                                    <Label htmlFor={`${tableKey}-slug`}>
                                        Slug
                                    </Label>
                                    <Input
                                        id={`${tableKey}-slug`}
                                        value={data.slug}
                                        onChange={(event) =>
                                            setData('slug', event.target.value)
                                        }
                                        aria-invalid={!!errors.slug}
                                    />
                                    <InputError message={errors.slug} />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor={`${tableKey}-code`}>
                                        Code
                                    </Label>
                                    <Input
                                        id={`${tableKey}-code`}
                                        value={data.code}
                                        onChange={(event) =>
                                            setData('code', event.target.value)
                                        }
                                        aria-invalid={!!errors.code}
                                    />
                                    <InputError message={errors.code} />
                                </div>
                            )}
                        </div>

                        {tableKey === 'provinces' && (
                            <div className="space-y-2">
                                <Label htmlFor={`${tableKey}-region-name`}>
                                    Region name
                                </Label>
                                <Input
                                    id={`${tableKey}-region-name`}
                                    value={data.region_name}
                                    onChange={(event) =>
                                        setData(
                                            'region_name',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={!!errors.region_name}
                                />
                                <InputError message={errors.region_name} />
                            </div>
                        )}

                        {tableKey === 'municipalities' && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label id={`${tableKey}-province-label`}>
                                        Province
                                    </Label>
                                    <Popover
                                        open={provincePopoverOpen}
                                        onOpenChange={setProvincePopoverOpen}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button
                                                id={`${tableKey}-province`}
                                                type="button"
                                                variant="outline"
                                                role="combobox"
                                                aria-labelledby={`${tableKey}-province-label`}
                                                aria-expanded={
                                                    provincePopoverOpen
                                                }
                                                aria-invalid={
                                                    !!errors.province_id
                                                }
                                                className={cn(
                                                    'h-9 w-full justify-between font-normal',
                                                    !selectedProvince &&
                                                        'text-muted-foreground',
                                                )}
                                            >
                                                <span className="truncate">
                                                    {selectedProvince?.name ??
                                                        'Select province'}
                                                </span>
                                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            align="start"
                                            className="w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] p-0"
                                        >
                                            <Command>
                                                <CommandInput placeholder="Search province..." />
                                                <CommandList>
                                                    <CommandEmpty>
                                                        No provinces found.
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {provinceOptions.map(
                                                            (province) => (
                                                                <CommandItem
                                                                    key={
                                                                        province.id
                                                                    }
                                                                    value={`${province.name} ${province.code} ${province.region_name}`}
                                                                    onSelect={() => {
                                                                        setData(
                                                                            'province_id',
                                                                            String(
                                                                                province.id,
                                                                            ),
                                                                        );
                                                                        setProvincePopoverOpen(
                                                                            false,
                                                                        );
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            'mr-2 size-4',
                                                                            data.province_id ===
                                                                                String(
                                                                                    province.id,
                                                                                )
                                                                                ? 'opacity-100'
                                                                                : 'opacity-0',
                                                                        )}
                                                                    />
                                                                    <span className="truncate">
                                                                        {
                                                                            province.name
                                                                        }
                                                                    </span>
                                                                </CommandItem>
                                                            ),
                                                        )}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <InputError message={errors.province_id} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`${tableKey}-type`}>
                                        Municipality type
                                    </Label>
                                    <Input
                                        id={`${tableKey}-type`}
                                        value={data.type}
                                        onChange={(event) =>
                                            setData('type', event.target.value)
                                        }
                                        aria-invalid={!!errors.type}
                                    />
                                    <InputError message={errors.type} />
                                </div>
                            </div>
                        )}

                        {tableKey === 'organizations' && (
                            <div className="space-y-2">
                                <Label htmlFor={`${tableKey}-type`}>
                                    Organization type
                                </Label>
                                <Input
                                    id={`${tableKey}-type`}
                                    value={data.type}
                                    onChange={(event) =>
                                        setData('type', event.target.value)
                                    }
                                    aria-invalid={!!errors.type}
                                />
                                <InputError message={errors.type} />
                            </div>
                        )}

                        {tableKey === 'participant-types' && (
                            <div className="space-y-2">
                                <Label htmlFor={`${tableKey}-type`}>
                                    Category
                                </Label>
                                <Select
                                    value={data.type}
                                    onValueChange={(value) =>
                                        setData('type', value)
                                    }
                                >
                                    <SelectTrigger
                                        id={`${tableKey}-type`}
                                        aria-invalid={!!errors.type}
                                    >
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">
                                            General
                                        </SelectItem>
                                        <SelectItem value="4ps">4Ps</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.type} />
                            </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(event) =>
                                        setData(
                                            'is_active',
                                            event.target.checked,
                                        )
                                    }
                                />
                                Active
                            </label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={closeFormDialog}
                                disabled={processing}
                            >
                                <X className="size-3.5" />
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={processing}
                            >
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={statusItem !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setStatusItem(null);
                    }
                }}
            >
                <DialogContent
                    className="gap-3 p-4 sm:max-w-sm"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            {statusItem?.is_active ? (
                                <ToggleLeft className="size-4 text-amber-500" />
                            ) : (
                                <ToggleRight className="size-4 text-emerald-600" />
                            )}
                            {statusItem?.is_active
                                ? 'Set inactive?'
                                : 'Set active?'}
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Change whether{' '}
                            <span className="font-medium text-foreground">
                                {statusItem?.name}
                            </span>{' '}
                            can be selected in new records .
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setStatusItem(null)}
                        >
                            <X className="size-3.5" />
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={submitStatusToggle}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deletingItem !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingItem(null);
                    }
                }}
            >
                <DialogContent
                    className="gap-3 p-4 sm:max-w-sm"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <AlertTriangle className="size-4 text-destructive" />
                            Delete record?
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Delete{' '}
                            <span className="font-medium text-foreground">
                                {deletingItem?.name}
                            </span>
                            ? Existing participant records will remain, but this
                            option will no longer be available.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingItem(null)}
                        >
                            <X className="size-3.5" />
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={submitDelete}
                        >
                            <Trash2 className="size-3.5" />
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}

function ActionButtons({
    item,
    onEdit,
    onStatus,
    onDelete,
}: {
    item: SettingsRecord;
    onEdit: (item: SettingsRecord) => void;
    onStatus: (item: SettingsRecord) => void;
    onDelete: (item: SettingsRecord) => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Open actions for ${item.name}`}
                    className="size-8"
                >
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem onSelect={() => onEdit(item)}>
                    <Pencil className="size-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onStatus(item)}>
                    {item.is_active ? (
                        <ToggleLeft className="size-4" />
                    ) : (
                        <ToggleRight className="size-4" />
                    )}
                    {item.is_active ? 'Set inactive' : 'Set active'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDelete(item)}
                >
                    <Trash2 className="size-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return active ? (
        <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            Active
        </Badge>
    ) : (
        <Badge className="border-transparent bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
            Inactive
        </Badge>
    );
}

function defaultSettingsForm(
    tableKey: SettingsKey,
    provinceOptions: Province[],
): SettingsForm {
    return {
        ...defaultForm,
        type:
            tableKey === 'participant-types'
                ? 'general'
                : tableKey === 'municipalities'
                  ? 'Mun'
                  : 'school',
        province_id:
            tableKey === 'municipalities' && provinceOptions[0]
                ? String(provinceOptions[0].id)
                : '',
    };
}

function usesSlug(tableKey: SettingsKey) {
    return tableKey === 'participant-types' || tableKey === 'organizations';
}

function recordSubtitle(item: SettingsRecord) {
    if ('slug' in item) {
        return item.slug;
    }

    if ('province' in item) {
        return item.province?.name ?? item.code;
    }

    if ('region_name' in item) {
        return item.region_name;
    }

    return '-';
}

function searchableText(item: SettingsRecord) {
    const values: string[] = [
        item.name,
        item.created_at ?? '',
        item.is_active ? 'active' : 'inactive',
        String(item.users_count),
    ];

    if ('slug' in item) {
        values.push(item.slug, item.creator?.name ?? 'System');
    }

    if ('type' in item) {
        values.push(item.type);
    }

    if ('code' in item) {
        values.push(item.code);
    }

    if ('region_name' in item) {
        values.push(item.region_name);
    }

    if ('province' in item) {
        values.push(item.province?.name ?? '', item.province?.code ?? '');
    }

    return values.join(' ');
}

function formatDate(value: string | null) {
    if (!value) {
        return '-';
    }

    return dateFormatter.format(new Date(value));
}

function formatTypeLabel(value: string) {
    return value.trim().toLowerCase() === '4ps' ? '4Ps' : 'General';
}

PageSettings.layout = {
    breadcrumbs: [
        {
            title: 'Page Settings',
            href: pageSettings(),
        },
    ],
};
