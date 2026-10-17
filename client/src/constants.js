export const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

export const STAGE_CONFIG = {
  Applied: {
    color: '#6366F1', // Indigo
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.28)',
    dot: '#818CF8',
    label: 'Applied'
  },
  Screening: {
    color: '#06B6D4', // Cyan
    bg: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(6, 182, 212, 0.28)',
    dot: '#22D3EE',
    label: 'Screening'
  },
  Interview: {
    color: '#F59E0B', // Amber
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.28)',
    dot: '#FBBF24',
    label: 'Interview'
  },
  Offer: {
    color: '#A855F7', // Purple
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.28)',
    dot: '#C084FC',
    label: 'Offer'
  },
  Hired: {
    color: '#10B981', // Emerald
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.28)',
    dot: '#34D399',
    label: 'Hired'
  },
  Rejected: {
    color: '#EF4444', // Rose / Red
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.28)',
    dot: '#F87171',
    label: 'Rejected'
  }
};

export const STAGE_COLOR = {
  Applied: '#6366F1',
  Screening: '#06B6D4',
  Interview: '#F59E0B',
  Offer: '#A855F7',
  Hired: '#10B981',
  Rejected: '#EF4444'
};

export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
  'linear-gradient(135deg, #3B82F6 0%, #2DD4BF 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
  'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #F97316 0%, #FBBF24 100%)',
  'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)'
];

export function getAvatarGradient(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export function getInitials(name = '') {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const fmtDate = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

export const fmtTimeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
};

export function exportCandidatesToCSV(candidates, filename = 'candidates_export.csv') {
  if (!candidates || !candidates.length) return;
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Skills', 'Experience (Yrs)', 'Rating', 'Stage', 'Applied At'];
  const rows = candidates.map(c => [
    c.id,
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${(c.email || '').replace(/"/g, '""')}"`,
    `"${(c.phone || '').replace(/"/g, '""')}"`,
    `"${(c.role || '').replace(/"/g, '""')}"`,
    `"${(c.skills || '').replace(/"/g, '""')}"`,
    c.experience || 0,
    c.rating || 4,
    c.stage,
    c.created_at
  ]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
