import { Check, ChevronsUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type EventStatus = 'ongoing' | 'upcoming' | 'closed';

export type EventFilterOption = {
    value: string;
    label: string;
    starts_at: string | null;
    ends_at: string | null;
};

function toDate(value: string | null): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

export function getEventStatus(
    event: Pick<EventFilterOption, 'starts_at' | 'ends_at'>,
    now = new Date(),
): EventStatus {
    const startsAt = toDate(event.starts_at);
    const endsAt = toDate(event.ends_at);

    if (endsAt && now > endsAt) {
        return 'closed';
    }

    if (startsAt && now < startsAt) {
        return 'upcoming';
    }

    return 'ongoing';
}

export function FilterCountBadge({ count }: { count: number }) {
    return (
        <Badge
            variant="secondary"
            className="ml-auto shrink-0 px-1.5 py-0 text-[10px]"
        >
            {count}
        </Badge>
    );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
    return (
        <Badge
            className={cn(
                'shrink-0 border-transparent px-1.5 py-0 text-[10px] capitalize',
                status === 'ongoing' &&
                    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
                status === 'upcoming' &&
                    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                status === 'closed' &&
                    'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
            )}
        >
            {status}
        </Badge>
    );
}

/**
 * Searchable event picker used by the admin pages that work on one event at a time.
 */
export function EventFilter<T extends EventFilterOption>({
    value,
    options,
    onChange,
    ariaLabel,
    renderMeta,
}: {
    value: string | null;
    options: T[];
    onChange: (value: string) => void;
    ariaLabel: string;
    renderMeta?: (option: T) => ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((option) => option.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={ariaLabel}
                    className="h-auto min-h-8 justify-between gap-2 px-2 py-1 text-xs"
                >
                    <span className="max-w-44 truncate text-left">
                        {selectedOption?.label ?? 'Select event'}
                    </span>
                    {selectedOption && (
                        <EventStatusBadge
                            status={getEventStatus(selectedOption)}
                        />
                    )}
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-[min(calc(100vw-2rem),24rem)] p-0"
            >
                <Command>
                    <CommandInput placeholder="Search events..." />
                    <CommandList>
                        <CommandEmpty>No event found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const status = getEventStatus(option);

                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={`${option.label} ${status} ${option.starts_at ?? ''} ${option.ends_at ?? ''}`}
                                        onSelect={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                        }}
                                        className="items-start"
                                    >
                                        <Check
                                            className={cn(
                                                'mt-0.5 mr-2 size-4 shrink-0',
                                                value === option.value
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        <span className="min-w-0 flex-1 break-words whitespace-normal">
                                            {option.label}
                                        </span>
                                        <EventStatusBadge status={status} />
                                        {renderMeta?.(option)}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
