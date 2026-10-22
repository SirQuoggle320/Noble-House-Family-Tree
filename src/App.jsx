import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Users, Shield, Download, Upload, Trash2, X, Heart, Baby, Pencil, ImagePlus, Crown, ChevronDown, FileText, Network, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'noble-houses-family-tree-v1';
const starter = {
  houses: [
    { id: 'house-rotstein', name: 'House Rotstein', motto: '', arms: '', notes: 'The principal house.' },
    { id: 'house-hohenfels', name: 'House Hohenfels', motto: '', arms: '', notes: '' }
  ],
  people: [
    { id: 'p1', name: 'Heinrich Rotstein', houseId: 'house-rotstein', birth: '1100', death: '', title: 'Lord of Rotstein', portrait: '', arms: '', notes: 'Example record — edit or delete this person.', parents: [], spouses: ['p2'] },
    { id: 'p2', name: 'Adelheid Hohenfels', houseId: 'house-hohenfels', birth: '1104', death: '', title: '', portrait: '', arms: '', notes: '', parents: [], spouses: ['p1'] },
    { id: 'p3', name: 'Konrad Rotstein', houseId: 'house-rotstein', birth: '1128', death: '', title: 'Heir', portrait: '', arms: '', notes: 'Example child — replace with your own canon.', parents: ['p1','p2'], spouses: [] }
  ]
};
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const safeParse = (v) => { try { return JSON.parse(v); } catch { return null; } };

function loadData() {
  const stored = safeParse(localStorage.getItem(STORAGE_KEY));
  return stored && Array.isArray(stored.people) && Array.isArray(stored.houses) ? stored : starter;
}
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load that image.'));
      img.onload = () => {
        const max = 900, scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function App() {
  const [data, setData] = useState(loadData);
  const [selectedId, setSelectedId] = useState('p1');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('tree');
  const [personModal, setPersonModal] = useState(null);
  const [houseModal, setHouseModal] = useState(null);
  const [notice, setNotice] = useState('');
  const importRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch { setNotice('Storage is full. Export a backup, then use smaller images.'); }
  }, [data]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const people = data.people;
  const houses = data.houses;
  const selected = people.find(p => p.id === selectedId) || null;
  const houseOf = (p) => houses.find(h => h.id === p.houseId)?.name || 'Unassigned';
  const filteredPeople = useMemo(() => people.filter(p => {
    const q = query.toLowerCase().trim();
    return !q || [p.name, p.title, houseOf(p), p.birth, p.death].join(' ').toLowerCase().includes(q);
  }), [people, houses, query]);

  function updatePerson(id, patch) {
    setData(d => ({ ...d, people: d.people.map(p => p.id === id ? { ...p, ...patch } : p) }));
  }
  function savePerson(form) {
    if (!form.name.trim()) { setNotice('Please enter a name.'); return; }
    if (form.id) updatePerson(form.id, form);
    else {
      const id = uid();
      setData(d => ({ ...d, people: [...d.people, { ...form, id, parents: form.parents || [], spouses: form.spouses || [] }] }));
      setSelectedId(id);
    }
    setPersonModal(null);
    setNotice('Person saved.');
  }
  function deletePerson(id) {
    const p = people.find(x => x.id === id);
    if (!p || !confirm(`Delete ${p.name}? Their relationships will also be removed.`)) return;
    setData(d => ({
      ...d,
      people: d.people.filter(x => x.id !== id).map(x => ({
        ...x,
        parents: (x.parents || []).filter(v => v !== id),
        spouses: (x.spouses || []).filter(v => v !== id)
      }))
    }));
    setSelectedId(people.find(p => p.id !== id)?.id || '');
    setNotice('Person deleted.');
  }
  function addRelationship(kind, targetId) {
    if (!selected || !targetId || targetId === selected.id) return;
    if (kind === 'spouse') {
      setData(d => ({ ...d, people: d.people.map(p => {
        if (p.id === selected.id) return { ...p, spouses: [...new Set([...(p.spouses || []), targetId])] };
        if (p.id === targetId) return { ...p, spouses: [...new Set([...(p.spouses || []), selected.id])] };
        return p;
      }) }));
    } else {
      // selected person is parent; target is child
      setData(d => ({ ...d, people: d.people.map(p => p.id === targetId
        ? { ...p, parents: [...new Set([...(p.parents || []), selected.id])] } : p) }));
    }
    setNotice(kind === 'spouse' ? 'Spouse linked both ways.' : 'Child linked to this parent.');
  }
  function removeRelationship(kind, targetId) {
    if (!selected) return;
    if (kind === 'spouse') {
      setData(d => ({ ...d, people: d.people.map(p => {
        if (p.id === selected.id) return { ...p, spouses: (p.spouses || []).filter(id => id !== targetId) };
        if (p.id === targetId) return { ...p, spouses: (p.spouses || []).filter(id => id !== selected.id) };
        return p;
      }) }));
    } else {
      setData(d => ({ ...d, people: d.people.map(p => p.id === targetId
        ? { ...p, parents: (p.parents || []).filter(id => id !== selected.id) } : p) }));
    }
  }
  async function onImage(file, field, currentForm, setForm) {
    try {
      const image = await compressImage(file);
      setForm({ ...currentForm, [field]: image });
    } catch (e) { setNotice(e.message || 'Image upload failed.'); }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'noble-houses-backup.json'; a.click();
    URL.revokeObjectURL(url); setNotice('Backup exported.');
  }
  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = safeParse(reader.result);
      if (!parsed || !Array.isArray(parsed.people) || !Array.isArray(parsed.houses)) {
        setNotice('That file does not look like a Noble Houses backup.'); return;
      }
      if (confirm('Import this backup and replace the current tree? Export a backup first if you want to keep the current one.')) {
        setData(parsed); setSelectedId(parsed.people[0]?.id || ''); setNotice('Backup imported.');
      }
    };
    reader.readAsText(file);
    if (importRef.current) importRef.current.value = '';
  }
  function saveHouse(house) {
    if (!house.name.trim()) { setNotice('Please enter a house name.'); return; }
    setData(d => ({ ...d, houses: house.id ? d.houses.map(h => h.id === house.id ? house : h) : [...d.houses, { ...house, id: uid() }] }));
    setHouseModal(null); setNotice('House saved.');
  }
  function deleteHouse(id) {
    const h = houses.find(x => x.id === id);
    if (!h || !confirm(`Delete ${h.name}? People in this house will become unassigned.`)) return;
    setData(d => ({ ...d, houses: d.houses.filter(x => x.id !== id), people: d.people.map(p => p.houseId === id ? { ...p, houseId: '' } : p) }));
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Crown size={22}/></div><div><div className="brand-name">NOBLE HOUSES</div><div className="brand-sub">Dynastic archive</div></div></div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <button className={`nav-item ${activeTab === 'tree' ? 'active' : ''}`} onClick={() => setActiveTab('tree')}><Network size={17}/> Family tree</button>
      <button className={`nav-item ${activeTab === 'people' ? 'active' : ''}`} onClick={() => setActiveTab('people')}><Users size={17}/> People <span className="nav-count">{people.length}</span></button>
      <button className={`nav-item ${activeTab === 'houses' ? 'active' : ''}`} onClick={() => setActiveTab('houses')}><Shield size={17}/> Noble houses <span className="nav-count">{houses.length}</span></button>
      <div className="sidebar-spacer"/>
      <div className="sidebar-tip"><Shield size={19}/><strong>Build your dynasty</strong><p>Add people, connect marriages and children, and attach heraldry to every person or house.</p></div>
      <div className="sidebar-foot">LOCAL PROJECT <span>•</span> AUTOSAVES</div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="breadcrumb">ARCHIVE <span>/</span> <b>{activeTab === 'tree' ? 'FAMILY TREE' : activeTab === 'people' ? 'PEOPLE REGISTER' : 'NOBLE HOUSES'}</b></div>
        <div className="top-actions">
          <button className="btn btn-quiet" onClick={exportData}><Download size={16}/> Export backup</button>
          <button className="btn btn-quiet" onClick={() => importRef.current?.click()}><Upload size={16}/> Import</button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e => importData(e.target.files?.[0])}/>
          <button className="btn btn-primary" onClick={() => setPersonModal({})}><Plus size={17}/> Add person</button>
        </div>
      </header>
      <div className="page-heading">
        <div><div className="eyebrow">YOUR WORLD, YOUR CANON</div><h1>{activeTab === 'tree' ? 'Dynastic family tree' : activeTab === 'people' ? 'People register' : 'Noble houses'}</h1><p>{activeTab === 'tree' ? 'Trace marriages, heirs and bloodlines across your realm.' : activeTab === 'people' ? 'Every person, title and connection in one searchable register.' : 'Manage house identities and their coats of arms.'}</p></div>
        <div className="stats"><div className="stat"><span>PEOPLE</span><strong>{people.length}</strong></div><div className="stat"><span>HOUSES</span><strong>{houses.length}</strong></div><div className="stat"><span>LINKS</span><strong>{people.reduce((n,p) => n + (p.spouses || []).filter(id => people.some(x => x.id === id)).length, 0) / 2 + people.reduce((n,p) => n + (p.parents || []).length, 0)}</strong></div></div>
      </div>
      {notice && <div className="notice">{notice}</div>}

      {activeTab === 'tree' && <div className="tree-layout">
        <section className="panel tree-panel">
          <div className="panel-head"><div><h2>Lineage overview</h2><p>Select a person to inspect their connections.</p></div><span className="live-tag"><span/> LIVE TREE</span></div>
          <div className="tree-toolbar"><div className="searchbox"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a person or house…"/></div><button className="btn btn-small" onClick={() => setPersonModal({})}><Plus size={15}/> New person</button></div>
          <TreeView people={filteredPeople} houses={houses} selectedId={selectedId} onSelect={setSelectedId}/>
          <div className="tree-legend"><span><i className="legend-dot blood"/> Person</span><span><i className="legend-line"/> Marriage</span><span><i className="legend-dot house"/> House allegiance</span><span className="legend-note">Tree layout is a compact overview; use a person's panel to navigate exact relationships.</span></div>
        </section>
        <aside className="panel detail-panel">
          {selected ? <PersonDetail person={selected} people={people} houses={houses} houseOf={houseOf} onEdit={() => setPersonModal(selected)} onDelete={() => deletePerson(selected.id)} onSelect={setSelectedId} onAddRelationship={addRelationship} onRemoveRelationship={removeRelationship}/> : <div className="empty-state"><Users size={30}/><h3>No person selected</h3><p>Add a person to start building your family tree.</p><button className="btn btn-primary" onClick={() => setPersonModal({})}><Plus size={16}/> Add first person</button></div>}
        </aside>
      </div>}

      {activeTab === 'people' && <section className="panel register-panel">
        <div className="panel-head"><div><h2>People register</h2><p>Search and select a person to edit their record.</p></div><button className="btn btn-primary" onClick={() => setPersonModal({})}><Plus size={16}/> Add person</button></div>
        <div className="searchbox register-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search names, titles, houses or dates…"/></div>
        <div className="people-list">{filteredPeople.map(p => <button className="person-row" key={p.id} onClick={() => { setSelectedId(p.id); setActiveTab('tree'); }}><Avatar person={p}/><span className="person-row-main"><strong>{p.name}</strong><small>{p.title || 'No title recorded'}</small></span><span className="house-pill">{houseOf(p)}</span><span className="person-date">{p.birth || '—'}{p.death ? `–${p.death}` : ''}</span><ChevronDown size={16} className="row-chevron"/></button>)}
        {filteredPeople.length === 0 && <div className="empty-inline">No people match that search.</div>}</div>
      </section>}

      {activeTab === 'houses' && <section className="houses-grid">
        <button className="house-add-card" onClick={() => setHouseModal({})}><div className="add-circle"><Plus size={22}/></div><strong>Establish a noble house</strong><span>Add its name, motto, notes and coat of arms.</span></button>
        {houses.map(h => <article className="house-card" key={h.id}><div className="house-card-top"><div className="arms-frame">{h.arms ? <img src={h.arms} alt={`${h.name} coat of arms`}/> : <Shield size={32}/>}</div><button className="icon-btn" title="Edit house" onClick={() => setHouseModal(h)}><Pencil size={15}/></button></div><h2>{h.name}</h2><p className="house-motto">{h.motto || 'No motto recorded'}</p><p className="house-notes">{h.notes || 'No notes yet.'}</p><div className="house-card-foot"><span>{people.filter(p => p.houseId === h.id).length} people</span><button className="text-button" onClick={() => setHouseModal(h)}>Edit house <span>→</span></button><button className="icon-btn danger-icon" title="Delete house" onClick={() => deleteHouse(h.id)}><Trash2 size={14}/></button></div></article>)}
      </section>}
      <footer className="app-footer"><span>✦</span> A private archive for your fictional dynasties <span className="footer-right">Your data stays in this browser until you export it.</span></footer>
    </main>
    {personModal && <PersonEditor initial={personModal} people={people} houses={houses} onClose={() => setPersonModal(null)} onSave={savePerson} onImage={onImage}/>}
    {houseModal && <HouseEditor initial={houseModal} onClose={() => setHouseModal(null)} onSave={saveHouse} onImage={onImage}/>}
  </div>;
}

function Avatar({ person, small=false }) {
  return <div className={`avatar ${small ? 'avatar-small' : ''}`}>{person.portrait ? <img src={person.portrait} alt=""/> : <span>{(person.name || '?').split(/\s+/).map(x => x[0]).join('').slice(0,2).toUpperCase()}</span>}</div>;
}
function TreeView({ people, houses, selectedId, onSelect }) {
  if (!people.length) return <div className="tree-empty"><Network size={32}/><h3>Your tree is waiting</h3><p>Add a person, then link their spouse and children from the details panel.</p></div>;
  const filteredIds = new Set(people.map(p => p.id));
  const roots = people.filter(p => !(p.parents || []).some(id => filteredIds.has(id)));
  const ordered = [...roots, ...people.filter(p => !roots.some(r => r.id === p.id))];
  const display = ordered.slice(0, 45);
  return <div className="tree-canvas"><div className="tree-canvas-inner">
    {display.map((p, i) => {
      const spouse = (p.spouses || []).map(id => people.find(x => x.id === id)).filter(Boolean);
      const kids = people.filter(x => (x.parents || []).includes(p.id));
      const house = houses.find(h => h.id === p.houseId);
      const level = (p.parents || []).filter(id => filteredIds.has(id)).length ? 1 : 0;
      return <React.Fragment key={p.id}><button className={`tree-node ${selectedId === p.id ? 'selected' : ''}`} style={{'--node-order': i}} onClick={() => onSelect(p.id)}>
        <div className="node-top"><Avatar person={p} small/><span className="node-name">{p.name}</span></div>
        <div className="node-title">{p.title || house?.name || 'Noble person'}</div>
        <div className="node-bottom">{p.birth || 'Date unknown'}{kids.length ? <span> · {kids.length} child{kids.length > 1 ? 'ren' : ''}</span> : null}</div>
        {p.arms || house?.arms ? <img className="node-arms" src={p.arms || house.arms} alt=""/> : <div className="node-arms-placeholder"><Shield size={15}/></div>}
      </button>
      {spouse.length > 0 && <div className="spouse-connector" title="Spouse linked"><Heart size={12}/></div>}
      {spouse.slice(0,1).map(s => <button key={s.id} className={`tree-node spouse-node ${selectedId === s.id ? 'selected' : ''}`} onClick={() => onSelect(s.id)}><div className="node-top"><Avatar person={s} small/><span className="node-name">{s.name}</span></div><div className="node-title">{s.title || houses.find(h => h.id === s.houseId)?.name || 'Spouse'}</div><div className="node-bottom">{s.birth || 'Date unknown'}</div>{s.arms ? <img className="node-arms" src={s.arms} alt=""/> : <div className="node-arms-placeholder"><Shield size={15}/></div>}</button>}
      {kids.length > 0 && <div className="child-count"><Baby size={12}/> {kids.length} child{kids.length > 1 ? 'ren' : ''}</div>}
    </React.Fragment>;
    })}
    {people.length > 45 && <div className="tree-more">Showing 45 of {people.length} people. Search to narrow the overview.</div>}
  </div></div>;
}
function PersonDetail({ person, people, houses, houseOf, onEdit, onDelete, onSelect, onAddRelationship, onRemoveRelationship }) {
  const [relationship, setRelationship] = useState('spouse');
  const [target, setTarget] = useState('');
  const spouses = (person.spouses || []).map(id => people.find(p => p.id === id)).filter(Boolean);
  const parents = (person.parents || []).map(id => people.find(p => p.id === id)).filter(Boolean);
  const children = people.filter(p => (p.parents || []).includes(person.id));
  const house = houses.find(h => h.id === person.houseId);
  const possible = people.filter(p => p.id !== person.id && (relationship === 'spouse' ? !spouses.some(s => s.id === p.id) : !children.some(c => c.id === p.id)));
  return <div className="detail-scroll">
    <div className="detail-topline"><span className="eyebrow">PERSON RECORD</span><div className="detail-actions"><button className="icon-btn" title="Edit person" onClick={onEdit}><Pencil size={15}/></button><button className="icon-btn danger-icon" title="Delete person" onClick={onDelete}><Trash2 size={15}/></button></div></div>
    <div className="profile-block"><div className="profile-avatar">{person.portrait ? <img src={person.portrait} alt=""/> : <span>{person.name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}</span>}</div><h2>{person.name}</h2><p>{person.title || 'Noble person'}</p><div className="house-tag"><span className="house-tag-dot"/>{houseOf(person)}</div></div>
    <div className="detail-section"><div className="section-title">BIOGRAPHY <span>01</span></div><div className="bio-grid"><div><label>Born</label><strong>{person.birth || 'Unknown'}</strong></div><div><label>Died</label><strong>{person.death || '—'}</strong></div></div>{person.notes && <p className="notes-text">{person.notes}</p>}</div>
    <div className="detail-section"><div className="section-title">HERALDRY <span>02</span></div><div className="heraldry-showcase">{person.arms || house?.arms ? <img src={person.arms || house.arms} alt="Coat of arms"/> : <div className="arms-placeholder"><Shield size={34}/><span>No arms uploaded</span></div>}<div className="heraldry-caption"><strong>{person.arms ? 'Personal arms' : house?.name || 'Unassigned house'}</strong><span>{person.arms ? 'Individual coat of arms' : house?.arms ? 'House arms (inherited display)' : 'Add arms when ready'}</span></div></div></div>
    <div className="detail-section"><div className="section-title">FAMILY CONNECTIONS <span>03</span></div>
      <div className="relationship-heading"><Heart size={14}/> Spouses <span>{spouses.length}</span></div>
      {spouses.length ? spouses.map(s => <RelatedPerson key={s.id} person={s} house={houseOf(s)} onSelect={onSelect} onRemove={() => onRemoveRelationship('spouse',s.id)}/>) : <div className="relationship-empty">No spouse linked yet.</div>}
      <div className="relationship-heading"><Users size={14}/> Parents <span>{parents.length}</span></div>
      {parents.length ? parents.map(p => <RelatedPerson key={p.id} person={p} house={houseOf(p)} onSelect={onSelect} onRemove={() => onRemoveRelationship('parent',p.id)}/>) : <div className="relationship-empty">No parents recorded.</div>}
      <div className="relationship-heading"><Baby size={14}/> Children <span>{children.length}</span></div>
      {children.length ? children.map(c => <RelatedPerson key={c.id} person={c} house={houseOf(c)} onSelect={onSelect} onRemove={() => onRemoveRelationship('child',c.id)}/>) : <div className="relationship-empty">No children linked yet.</div>}
      <div className="add-relationship"><div className="relationship-selects"><select value={relationship} onChange={e => {setRelationship(e.target.value);setTarget('');}}><option value="spouse">Add spouse</option><option value="child">Add child</option></select><select value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose person…</option>{possible.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><button className="btn btn-primary btn-block" disabled={!target} onClick={() => {onAddRelationship(relationship,target);setTarget('');}}><Plus size={15}/> Link {relationship === 'spouse' ? 'spouse' : 'child'}</button><p>To add a new child, create the person first, then link them here. Spouse links are reciprocal.</p></div>
    </div>
  </div>;
}
function RelatedPerson({ person, house, onSelect, onRemove }) {
  return <div className="related-person"><button className="related-main" onClick={() => onSelect(person.id)}><Avatar person={person} small/><span><strong>{person.name}</strong><small>{house}</small></span></button><button className="remove-link" title="Remove relationship" onClick={onRemove}><X size={14}/></button></div>;
}
function ImageField({ label, value, onChange, help }) {
  return <div className="field"><label>{label}</label><div className="image-upload-row"><div className="upload-preview">{value ? <img src={value} alt="Preview"/> : <ImagePlus size={23}/>}</div><div className="upload-controls"><label className="btn btn-quiet upload-btn"><Upload size={14}/> Choose image<input type="file" accept="image/*" hidden onChange={e => { if (e.target.files?.[0]) onChange(e.target.files[0]); e.target.value=''; }}/></label>{value && <button className="text-button" type="button" onClick={() => onChange(null)}>Remove image</button>}<small>{help || 'Image is resized before saving.'}</small></div></div></div>;
}
function PersonEditor({ initial, people, houses, onClose, onSave, onImage }) {
  const [form, setForm] = useState(() => ({ id: initial.id || '', name: initial.name || '', houseId: initial.houseId || '', birth: initial.birth || '', death: initial.death || '', title: initial.title || '', portrait: initial.portrait || '', arms: initial.arms || '', notes: initial.notes || '', parents: initial.parents || [], spouses: initial.spouses || [] }));
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  const upload = (file,field) => onImage(file,field,form,f=>setForm(f));
  return <Modal title={form.id ? 'Edit person' : 'Add a person'} subtitle="Build a clear record for a person in your dynastic history." onClose={onClose} wide>
    <form onSubmit={e => {e.preventDefault();onSave(form);}} className="editor-form">
      <div className="form-grid"><div className="field full"><label>Full name *</label><input autoFocus value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Adelheid von Rotstein" required/></div>
      <div className="field"><label>Noble house</label><select value={form.houseId} onChange={e=>set('houseId',e.target.value)}><option value="">Unassigned</option>{houses.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
      <div className="field"><label>Title / position</label><input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Countess of Winterwald"/></div>
      <div className="field"><label>Birth year</label><input value={form.birth} onChange={e=>set('birth',e.target.value)} placeholder="e.g. 1124"/></div>
      <div className="field"><label>Death year</label><input value={form.death} onChange={e=>set('death',e.target.value)} placeholder="Leave blank if unknown"/></div>
      <div className="field full"><label>Notes / historical details</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Titles, inheritance, marriages, claims, important events…" rows="3"/></div>
      <div className="field"><ImageField label="Portrait (optional)" value={form.portrait} onChange={v=>v ? upload(v,'portrait') : set('portrait','')} help="Optional person image."/></div>
      <div className="field"><ImageField label="Personal coat of arms (optional)" value={form.arms} onChange={v=>v ? upload(v,'arms') : set('arms','')} help="Overrides the house arms on this record."/></div></div>
      <div className="modal-footer"><button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit"><Plus size={16}/>{form.id ? 'Save changes' : 'Create person'}</button></div>
    </form>
  </Modal>;
}
function HouseEditor({ initial, onClose, onSave, onImage }) {
  const [form, setForm] = useState({id:initial.id||'',name:initial.name||'',motto:initial.motto||'',notes:initial.notes||'',arms:initial.arms||''});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return <Modal title={form.id ? 'Edit noble house' : 'Establish a noble house'} subtitle="Record the identity and heraldry of a dynasty." onClose={onClose}>
    <form onSubmit={e=>{e.preventDefault();onSave(form);}} className="editor-form">
      <div className="field"><label>House name *</label><input autoFocus required value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. House Rotstein"/></div>
      <div className="field"><label>Motto</label><input value={form.motto} onChange={e=>set('motto',e.target.value)} placeholder="Optional house motto"/></div>
      <div className="field"><label>Notes</label><textarea rows="3" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Origins, branches, traditions…"/></div>
      <ImageField label="House coat of arms" value={form.arms} onChange={v=>v ? onImage(v,'arms',form,setForm) : set('arms','')} help="PNG or JPG works well; transparent PNG is fine."/>
      <div className="modal-footer"><button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit"><Shield size={16}/> Save house</button></div>
    </form>
  </Modal>;
}
function Modal({ title, subtitle, onClose, children, wide=false }) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className={`modal ${wide?'modal-wide':''}`} role="dialog" aria-modal="true"><div className="modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</section></div>;
}
