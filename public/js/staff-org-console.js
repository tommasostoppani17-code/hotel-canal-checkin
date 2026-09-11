/**
 * Due sezioni separate:
 * - Console Dev: hotel → manager → dipendenti per reparto (tutti gli hotel)
 * - Console Manager: solo il proprio hotel (staff, password standard, toggle manager, moduli)
 */
(function () {
  const apiPrefix = () => {
    const m = window.location.pathname.match(/^(\/h\/[^/]+)/i);
    return m ? m[1] : '';
  };

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function kindLabel(kind) {
    if (kind === 'live') return 'Live';
    if (kind === 'affiliate') return 'Affiliato';
    return 'Template';
  }

  async function api(path, opts = {}) {
    const res = await fetch(`${apiPrefix()}${path}`, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.error || body.code || 'error');
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  function renderModules(hotel, catalog, canEdit) {
    const mods = hotel.modules || {};
    return `
      <div class="org-modules" data-hotel="${esc(hotel.slug)}">
        ${(catalog || [])
          .map((m) => {
            const on = Boolean(mods[m.id]);
            return `
            <label class="org-mod-row ${canEdit ? '' : 'is-readonly'}">
              <span class="org-mod-copy">
                <span class="org-mod-title">${esc(m.label)}</span>
                <span class="org-mod-id">${esc(m.id)}</span>
              </span>
              <input type="checkbox" data-mod="${esc(m.id)}" ${on ? 'checked' : ''} ${canEdit ? '' : 'disabled'} />
            </label>`;
          })
          .join('')}
      </div>`;
  }

  function renderStaffRow(person, { canManage, compact = false } = {}) {
    const isMgr = person.role === 'manager' || person.role === 'dev';
    const isDev = person.role === 'dev';
    return `
      <li class="org-staff-row ${compact ? 'is-compact' : ''}" data-staff="${esc(person.id)}">
        <div class="org-staff-main">
          <span class="org-staff-name">${esc(person.label)}</span>
          <span class="org-staff-meta">${esc(person.role)}${person.protected ? ' · protetto' : ''}</span>
        </div>
        ${
          canManage && !isDev
            ? `<div class="org-staff-actions">
            <button type="button" class="org-btn" data-act="toggle-mgr" data-on="${isMgr ? '0' : '1'}">
              ${isMgr ? 'Togli manager' : 'Rendi manager'}
            </button>
            <button type="button" class="org-btn org-btn--ghost" data-act="reset-pin">Password standard</button>
          </div>`
            : isDev
              ? `<span class="org-staff-badge">Dev</span>`
              : ''
        }
      </li>`;
  }

  function employeesOnly(deps) {
    return (deps || [])
      .map((d) => ({
        ...d,
        staff: (d.staff || []).filter((p) => p.role !== 'manager' && p.role !== 'dev'),
      }))
      .filter((d) => d.staff.length);
  }

  function renderDepartments(deps, opts) {
    if (!deps?.length) {
      return `<p class="org-empty">Nessun dipendente assegnato. Struttura pronta da personalizzare.</p>`;
    }
    return deps
      .map(
        (d) => `
      <section class="org-dept">
        <h4 class="org-dept-title">${esc(d.label)} <span>${d.staff.length}</span></h4>
        <ul class="org-staff-list">
          ${d.staff.map((p) => renderStaffRow(p, opts)).join('')}
        </ul>
      </section>`,
      )
      .join('');
  }

  /** Dev: hotel → manager → dipendenti per reparto */
  function renderDevHotel(hotel, payload, { open = false } = {}) {
    const managers = hotel.managers || [];
    const empDeps = employeesOnly(hotel.departments);
    return `
      <article class="org-hotel org-hotel--dev ${open ? 'is-open' : ''}" data-slug="${esc(hotel.slug)}">
        <button type="button" class="org-hotel-head" data-act="toggle-hotel">
          <span class="org-hotel-title">
            <span class="org-hotel-name">${esc(hotel.name)}</span>
            <span class="org-pill org-pill--${esc(hotel.kind)}">${esc(kindLabel(hotel.kind))}</span>
          </span>
          <span class="org-hotel-sub">
            ${esc(hotel.city || '—')} · ${hotel.roomCount || 0} camere · ${managers.length} manager · ${hotel.staffCount || 0} staff
          </span>
        </button>
        <div class="org-hotel-body">
          ${hotel.notes ? `<p class="org-notes">${esc(hotel.notes)}</p>` : ''}

          <h4 class="org-section-label">1 · Manager</h4>
          ${
            managers.length
              ? `<ul class="org-staff-list org-staff-list--mgr">
                  ${managers
                    .map((m) =>
                      renderStaffRow(
                        { ...m, role: m.role || 'manager' },
                        { canManage: true },
                      ),
                    )
                    .join('')}
                </ul>`
              : `<p class="org-empty">Nessun manager ancora. Promuovi qualcuno dall’organico.</p>`
          }

          <h4 class="org-section-label">2 · Dipendenti per reparto</h4>
          ${renderDepartments(empDeps, { canManage: true })}

          <h4 class="org-section-label">3 · Moduli hotel</h4>
          ${renderModules(hotel, payload.modulesCatalog, true)}
        </div>
      </article>`;
  }

  /** Manager: solo il proprio hotel — staff + moduli, senza lista multi-hotel */
  function renderManagerHotel(hotel, payload) {
    return `
      <article class="org-hotel org-hotel--manager is-open" data-slug="${esc(hotel.slug)}">
        <div class="org-hotel-head org-hotel-head--static">
          <span class="org-hotel-title">
            <span class="org-hotel-name">${esc(hotel.name)}</span>
            <span class="org-pill org-pill--live">Tuo hotel</span>
          </span>
          <span class="org-hotel-sub">
            ${esc(hotel.city || '—')} · ${hotel.roomCount || 0} camere · ${hotel.staffCount || 0} persone
          </span>
        </div>
        <div class="org-hotel-body">
          <h4 class="org-section-label">Moduli attivi</h4>
          <p class="org-mini">Accendi o spegni funzionalità per questo hotel.</p>
          ${renderModules(hotel, payload.modulesCatalog, true)}

          <h4 class="org-section-label">Il tuo staff</h4>
          <p class="org-mini">Password standard per tutti i nuovi / reset. Puoi promuovere altri account a manager.</p>
          ${renderDepartments(hotel.departments || [], { canManage: true })}
        </div>
      </article>`;
  }

  function paint(root, payload, forcedView) {
    if (!root) return;
    if (!payload?.ok) {
      root.innerHTML = `<p class="org-empty">Accesso riservato.</p>`;
      return;
    }

    const view = forcedView || payload.mode;
    root.dataset.orgView = view;

    if (view === 'dev') {
      const hotels = payload.hotels || [];
      root.innerHTML = `
        <header class="org-head">
          <p class="org-kicker">Sezione Dev</p>
          <h2 class="org-title">Hotel → Manager → Organico</h2>
          <p class="org-lead">Canal e affiliati già popolati. Gli slot template sono pronti da personalizzare per i prossimi hotel (~10 strutture).</p>
          <p class="org-hint">${esc(payload.standardPinHint || '')}</p>
        </header>
        <div class="org-stack">
          ${hotels.map((h, i) => renderDevHotel(h, payload, { open: i === 0 })).join('') || '<p class="org-empty">Nessun hotel.</p>'}
        </div>`;
      return;
    }

    if (view === 'manager' && payload.hotel) {
      root.innerHTML = `
        <header class="org-head">
          <p class="org-kicker">Sezione Manager</p>
          <h2 class="org-title">Staff del tuo hotel</h2>
          <p class="org-lead">Solo i tuoi dipendenti. Reset password allo standard, promuovi manager, moduli on/off.</p>
          <p class="org-hint">${esc(payload.standardPinHint || '')}</p>
        </header>
        <div class="org-stack">
          ${renderManagerHotel(payload.hotel, payload)}
        </div>`;
      return;
    }

    root.innerHTML = `<p class="org-empty">Nessun dato per questa sezione.</p>`;
  }

  async function reload(root) {
    if (!root) return;
    const view = root.dataset.forceView || 'auto';
    root.innerHTML = `<div class="org-skeleton" aria-hidden="true"></div>`;
    try {
      const q = view && view !== 'auto' ? `?view=${encodeURIComponent(view)}` : '';
      const payload = await api(`/api/staff/org${q}`);
      paint(root, payload, view === 'auto' ? null : view);
      root._orgPayload = payload;
    } catch (err) {
      if (err.status === 401) {
        root.innerHTML = `<p class="org-empty">Sessione scaduta. Rieffettua il login.</p>`;
        return;
      }
      if (err.status === 403) {
        root.innerHTML = `<p class="org-empty">Accesso non consentito a questa sezione.</p>`;
        return;
      }
      root.innerHTML = `<p class="org-empty">Impossibile caricare la console.</p>`;
    }
  }

  function bind(root) {
    if (!root || root._orgBound) return;
    root._orgBound = true;
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest?.('[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      const hotelEl = btn.closest?.('.org-hotel');
      const staffEl = btn.closest?.('.org-staff-row');

      if (act === 'toggle-hotel' && hotelEl) {
        hotelEl.classList.toggle('is-open');
        return;
      }

      if (act === 'toggle-mgr' && staffEl) {
        const id = staffEl.getAttribute('data-staff');
        const on = btn.getAttribute('data-on') === '1';
        btn.disabled = true;
        try {
          await api(`/api/staff/org/staff/${encodeURIComponent(id)}/manager`, {
            method: 'POST',
            body: JSON.stringify({ manager: on }),
          });
          await reload(root);
        } catch {
          btn.disabled = false;
        }
        return;
      }

      if (act === 'reset-pin' && staffEl) {
        const id = staffEl.getAttribute('data-staff');
        if (!window.confirm(`Ripristinare la password standard per ${id}?`)) return;
        btn.disabled = true;
        try {
          await api(`/api/staff/org/staff/${encodeURIComponent(id)}/reset-password`, {
            method: 'POST',
            body: '{}',
          });
          btn.textContent = 'Fatto';
          setTimeout(() => reload(root), 600);
        } catch {
          btn.disabled = false;
        }
      }
    });

    root.addEventListener('change', async (e) => {
      const input = e.target.closest?.('input[data-mod]');
      if (!input || input.disabled) return;
      const wrap = input.closest?.('.org-modules');
      const slug = wrap?.getAttribute('data-hotel');
      if (!slug) return;
      const mod = input.getAttribute('data-mod');
      input.disabled = true;
      try {
        await api(`/api/staff/org/hotels/${encodeURIComponent(slug)}/modules`, {
          method: 'PATCH',
          body: JSON.stringify({ modules: { [mod]: input.checked } }),
        });
      } catch {
        input.checked = !input.checked;
      } finally {
        input.disabled = false;
      }
    });
  }

  window.StaffOrgConsole = {
    /** @param {HTMLElement} root @param {{ view?: 'dev'|'manager'|'auto' }} [opts] */
    async mount(root, opts = {}) {
      if (!root) return;
      root.dataset.forceView = opts.view || 'auto';
      bind(root);
      await reload(root);
    },
    reload,
  };
})();
