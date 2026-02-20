import { useState, useEffect, useCallback } from 'react';

interface Organization {
  id: string;
  name: string;
  org_number: string;
  address: string;
  city: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  created_at: string;
  updated_at: string | null;
}

type OrgForm = Omit<Organization, 'id' | 'created_at' | 'updated_at'>;

const emptyForm: OrgForm = {
  name: '', org_number: '', address: '', city: '', zip: '',
  phone: '', email: '', website: '', description: '',
};

const BACKEND_URL = (window as any).__MFE_ORG_BACKEND_URL__ || '/api/mfe/organization';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

async function api(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

const styles = {
  container: {
    minHeight: '500px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#e2e8f0',
    padding: '32px 16px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '2rem',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '24px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  label: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 600,
    marginBottom: '4px',
    display: 'block',
  },
  btnPrimary: {
    padding: '10px 24px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  btnDanger: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(239,68,68,0.3)',
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  orgItem: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  error: {
    padding: '12px 16px',
    borderRadius: '10px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    color: '#ef4444',
    fontSize: '0.85rem',
  },
  success: {
    padding: '12px 16px',
    borderRadius: '10px',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.2)',
    color: '#4ade80',
    fontSize: '0.85rem',
  },
};

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function App() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [form, setForm] = useState<OrgForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [selected, setSelected] = useState<Organization | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api('/organizations');
      setOrgs(data.organizations || data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleSave = async () => {
    clearMessages();
    if (!form.name.trim()) { setError('Namn krävs'); return; }
    try {
      if (editId) {
        await api(`/organizations/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
        setSuccess('Organisation uppdaterad!');
      } else {
        await api('/organizations', { method: 'POST', body: JSON.stringify(form) });
        setSuccess('Organisation skapad!');
      }
      setForm(emptyForm);
      setEditId(null);
      setView('list');
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    clearMessages();
    if (!confirm('Vill du verkligen ta bort denna organisation?')) return;
    try {
      await api(`/organizations/${id}`, { method: 'DELETE' });
      setSuccess('Organisation borttagen!');
      setView('list');
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const openEdit = (org: Organization) => {
    setForm({
      name: org.name, org_number: org.org_number, address: org.address,
      city: org.city, zip: org.zip, phone: org.phone, email: org.email,
      website: org.website, description: org.description,
    });
    setEditId(org.id);
    setView('form');
    clearMessages();
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setView('form');
    clearMessages();
  };

  const openDetail = (org: Organization) => {
    setSelected(org);
    setView('detail');
    clearMessages();
  };

  const setField = (key: keyof OrgForm) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏢</div>
        <h1 style={styles.title}>ORGANISATION</h1>
        <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '4px' }}>
          Hantera företag och organisationer
        </p>
      </div>

      {error && <div style={styles.error}>❌ {error}</div>}
      {success && <div style={styles.success}>✅ {success}</div>}

      {/* LIST VIEW */}
      {view === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
              {orgs.length} organisation{orgs.length !== 1 ? 'er' : ''}
            </span>
            <button style={styles.btnPrimary} onClick={openNew}>+ Ny Organisation</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>Laddar...</div>
          ) : orgs.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center', color: '#6b7280' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>🏗️</p>
              <p>Inga organisationer ännu. Skapa din första!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {orgs.map(org => (
                <div
                  key={org.id}
                  style={styles.orgItem}
                  onClick={() => openDetail(org)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>🏢 {org.name}</div>
                      {org.org_number && <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Org.nr: {org.org_number}</div>}
                      {org.city && <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>📍 {org.city}</div>}
                    </div>
                    <span style={{ color: '#4b5563', fontSize: '1.2rem' }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* DETAIL VIEW */}
      {view === 'detail' && selected && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>🏢 {selected.name}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={styles.btnSecondary} onClick={() => openEdit(selected)}>✏️ Redigera</button>
              <button style={styles.btnDanger} onClick={() => handleDelete(selected.id)}>🗑️ Ta bort</button>
            </div>
          </div>

          <div style={styles.grid2}>
            {selected.org_number && <div><span style={styles.label}>Org.nummer</span><div>{selected.org_number}</div></div>}
            {selected.email && <div><span style={styles.label}>E-post</span><div>{selected.email}</div></div>}
            {selected.phone && <div><span style={styles.label}>Telefon</span><div>{selected.phone}</div></div>}
            {selected.website && <div><span style={styles.label}>Webbplats</span><div>{selected.website}</div></div>}
            {selected.address && <div><span style={styles.label}>Adress</span><div>{selected.address}</div></div>}
            {(selected.zip || selected.city) && <div><span style={styles.label}>Ort</span><div>{[selected.zip, selected.city].filter(Boolean).join(' ')}</div></div>}
          </div>

          {selected.description && (
            <div style={{ marginTop: '16px' }}>
              <span style={styles.label}>Beskrivning</span>
              <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{selected.description}</div>
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <button style={styles.btnSecondary} onClick={() => setView('list')}>← Tillbaka</button>
          </div>
        </div>
      )}

      {/* FORM VIEW */}
      {view === 'form' && (
        <div style={styles.card}>
          <h2 style={{ margin: '0 0 20px', fontSize: '1.2rem' }}>
            {editId ? '✏️ Redigera organisation' : '➕ Ny organisation'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Field label="Namn *" value={form.name} onChange={setField('name')} placeholder="Företagets namn" />

            <div style={styles.grid2}>
              <Field label="Org.nummer" value={form.org_number} onChange={setField('org_number')} placeholder="XXXXXX-XXXX" />
              <Field label="Telefon" value={form.phone} onChange={setField('phone')} placeholder="+46..." />
            </div>

            <div style={styles.grid2}>
              <Field label="E-post" value={form.email} onChange={setField('email')} placeholder="info@foretag.se" type="email" />
              <Field label="Webbplats" value={form.website} onChange={setField('website')} placeholder="https://..." />
            </div>

            <Field label="Adress" value={form.address} onChange={setField('address')} placeholder="Gatuadress" />

            <div style={styles.grid2}>
              <Field label="Postnummer" value={form.zip} onChange={setField('zip')} placeholder="XXX XX" />
              <Field label="Ort" value={form.city} onChange={setField('city')} placeholder="Stad" />
            </div>

            <div>
              <label style={styles.label}>Beskrivning</label>
              <textarea
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                value={form.description}
                onChange={e => setField('description')(e.target.value)}
                placeholder="Kort beskrivning av organisationen..."
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button style={styles.btnPrimary} onClick={handleSave}>
                {editId ? '💾 Spara' : '➕ Skapa'}
              </button>
              <button style={styles.btnSecondary} onClick={() => setView('list')}>Avbryt</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '12px 20px',
        borderRadius: '12px',
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.15)',
        fontSize: '0.8rem',
        color: '#60a5fa',
        textAlign: 'center',
      }}>
        ✅ Organisation MFE • Module Federation aktiv
      </div>
    </div>
  );
}
