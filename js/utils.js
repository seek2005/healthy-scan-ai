export function getColorClass(level) {
    if (!level) return 'bg-gray-100 text-gray-800';
    const l = String(level).toLowerCase();
    if (l.includes('low') || l.includes('recommended') || l.includes('rec')) return 'bg-emerald-100 text-emerald-800';
    if (l.includes('medium') || l.includes('med')) return 'bg-yellow-100 text-yellow-800';
    if (l.includes('high')) return 'bg-orange-100 text-orange-800';
    if (l.includes('excessive') || l.includes('bad')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
}
