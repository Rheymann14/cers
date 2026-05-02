export function normalizeContactNumber(value: string): string {
    const digits = value.replace(/\D/g, '');

    if (!digits) {
        return '';
    }

    if (digits.startsWith('09')) {
        return digits.slice(0, 11);
    }

    return `09${digits.replace(/^0?9?/, '')}`.slice(0, 11);
}
