export function getColorClass(val) {
    if (!val) return 'bg-gray-100 text-gray-500';
    const v = val.toLowerCase();
    if (v.includes('low') || v.includes('safe') || v.includes('health') || v.includes('recommend')) return 'bg-emerald-100 text-emerald-700';
    if (v.includes('moderate') || v.includes('limit')) return 'bg-yellow-100 text-yellow-700';
    if (v.includes('high') || v.includes('excess') || v.includes('avoid')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
}
