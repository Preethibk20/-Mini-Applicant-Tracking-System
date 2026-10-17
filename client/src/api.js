async function req(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.fields = data.errors || {};
    throw err;
  }
  return data;
}

const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== '' && v != null && p.set(k, v));
  return p.toString();
};

export const api = {
  list: (params) => req(`/candidates?${qs(params)}`),
  get: (id) => req(`/candidates/${id}`),
  create: (body) => req('/candidates', { method: 'POST', body }),
  update: (id, body) => req(`/candidates/${id}`, { method: 'PUT', body }),
  setStage: (id, stage) => req(`/candidates/${id}/stage`, { method: 'PATCH', body: { stage } }),
  remove: (id) => req(`/candidates/${id}`, { method: 'DELETE' }),
  roles: () => req('/roles'),
  dashboard: () => req('/dashboard'),
  exportAll: () => req('/export'),
  resetDemo: () => req('/seed/reset', { method: 'POST' })
};
