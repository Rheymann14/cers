import { Head, router, useForm } from '@inertiajs/react';
import type { ComponentProps, FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
    AlertTriangle,
    Building2,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    ShieldCheck,
    ToggleLeft,
    ToggleRight,
    Trash2,
    X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import InputError from '@/components/input-error';
import { pageSettings } from '@/routes';
import type { LucideIcon } from 'lucide-react';

type BaseSetting = {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    users_count: number;
};

type UserRole = BaseSetting & {
    description: string | null;
    is_default: boolean;
};

type ParticipantType = BaseSetting & {
    description: string | null;
};

type Organization = BaseSetting & {
    type: string;
};

type SettingsKey = 'roles' | 'participant-types' | 'organizations';

type SettingsRecord = UserRole | ParticipantType | Organization;

type SettingsForm = {
    name: string;
    slug: string;
    description: string;
    type: string;
    is_default: boolean;
    is_active: boolean;
};

type Props = {
    userRoles: UserRole[];
    participantTypes: ParticipantType[];
    organizations: Organization[];
};

const pageSizeOptions = [5, 10, 25];

const defaultForm: SettingsForm = {
    name: '',
    slug: '',
    description: '',
    type: 'school',
    is_default: false,
    is_active: true,
};

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

export default function PageSettings({
    userRoles,
    participantTypes,
    organizations,
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

                <SettingsTable
                    tableKey="roles"
                    title="User Role Management"
                    description="Control the account roles available to CERS users."
                    icon={ShieldCheck}
                    searchPlaceholder="Search user roles..."
                    emptyText="No user roles found."
                    items={userRoles}
                    columns={[
                        {
                            label: 'Role',
                            render: (item) => (
                                <div>
                                    <p className="font-medium text-foreground">
                                        {item.name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {'description' in item
                                            ? (item.description ?? '-')
                                            : '-'}
                                    </p>
                                </div>
                            ),
                        },
                        { label: 'Slug', render: (item) => item.slug },
                        {
                            label: 'Default',
                            render: (item) =>
                                'is_default' in item && item.is_default ? (
                                    <Badge variant="secondary">Default</Badge>
                                ) : (
                                    <span className="text-muted-foreground">
                                        No
                                    </span>
                                ),
                        },
                        {
                            label: 'Status',
                            render: (item) => (
                                <StatusBadge active={item.is_active} />
                            ),
                        },
                        {
                            label: 'Users',
                            render: (item) => item.users_count.toLocaleString(),
                        },
                    ]}
                />

                <SettingsTable
                    tableKey="participant-types"
                    title="Participant Type"
                    description="Manage the participant categories shown during event registration."
                    icon={GraduationCap}
                    searchPlaceholder="Search participant types..."
                    emptyText="No participant types found."
                    items={participantTypes}
                    columns={[
                        {
                            label: 'Type',
                            render: (item) => (
                                <div>
                                    <p className="font-medium text-foreground">
                                        {item.name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {'description' in item
                                            ? (item.description ?? '-')
                                            : '-'}
                                    </p>
                                </div>
                            ),
                        },
                        { label: 'Slug', render: (item) => item.slug },
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
                    ]}
                />

                <SettingsTable
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
                        { label: 'Slug', render: (item) => item.slug },
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
                    ]}
                />
            </div>
        </>
    );
}

function SettingsTable({
    tableKey,
    title,
    description,
    icon: Icon,
    searchPlaceholder,
    emptyText,
    items,
    columns,
}: {
    tableKey: SettingsKey;
    title: string;
    description: string;
    icon: LucideIcon;
    searchPlaceholder: string;
    emptyText: string;
    items: SettingsRecord[];
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
            Object.values(item).some((value) =>
                String(value ?? '')
                    .toLowerCase()
                    .includes(query),
            ),
        );
    }, [items, search]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = filteredItems.slice(startIndex, startIndex + pageSize);

    function updateSearch(value: string) {
        setSearch(value);
        setPage(1);
    }

    function updatePageSize(value: number) {
        setPageSize(value);
        setPage(1);
    }

    function openAddDialog() {
        reset();
        clearErrors();
        setEditingItem(null);
        setDialogMode('add');
    }

    function openEditDialog(item: SettingsRecord) {
        clearErrors();
        setEditingItem(item);
        setData({
            name: item.name,
            slug: item.slug,
            description: 'description' in item ? (item.description ?? '') : '',
            type: 'type' in item ? item.type : 'school',
            is_default: 'is_default' in item ? item.is_default : false,
            is_active: item.is_active,
        });
        setDialogMode('edit');
    }

    function closeFormDialog() {
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
        <section className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
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
                                        {item.slug}
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
                                {'is_default' in item && item.is_default && (
                                    <Badge variant="secondary">Default</Badge>
                                )}
                                {'type' in item && (
                                    <Badge variant="outline">{item.type}</Badge>
                                )}
                                <Badge variant="outline">
                                    {item.users_count.toLocaleString()} users
                                </Badge>
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
                                        className="truncate px-2 py-2"
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
                            <div className="space-y-2">
                                <Label htmlFor={`${tableKey}-slug`}>Slug</Label>
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
                        </div>

                        {tableKey === 'organizations' ? (
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
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor={`${tableKey}-description`}>
                                    Description
                                </Label>
                                <Input
                                    id={`${tableKey}-description`}
                                    value={data.description}
                                    onChange={(event) =>
                                        setData(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={!!errors.description}
                                />
                                <InputError message={errors.description} />
                            </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                            {tableKey === 'roles' && (
                                <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={data.is_default}
                                        onChange={(event) =>
                                            setData(
                                                'is_default',
                                                event.target.checked,
                                            )
                                        }
                                    />
                                    Default role
                                </label>
                            )}
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

PageSettings.layout = {
    breadcrumbs: [
        {
            title: 'Page Settings',
            href: pageSettings(),
        },
    ],
};
