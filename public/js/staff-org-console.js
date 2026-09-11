/**
 * Console Dev / Manager hotel (staff124 info panel).
 * Dev: hotel → manager → dipendenti per reparto.
 * Manager: solo il suo hotel, password standard, toggle manager, moduli.
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

  function renderStaffRow(person, { canManage }) {
    const isMgr = person.role === 'manager' || person.role === 'dev';
    const isDev = person.role === 'dev';
    return `
      <li class="org-staff-row" data-staff="${esc(person.id)}">
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
            : ''
        }
      </li>`;
  }

  function renderDepartments(deps, opts) {
    if (!deps?.length) {
      return `<p class="org-empty">Nessun dipendente assegnato. La struttura è pronta da personalizzare.</p>`;
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

  function renderHotelCard(hotel, payload, { open = false } = {}) {
    const canEditModules = payload.mode === 'dev' || payload.mode === 'manager';
    const canManageStaff = canEditModules;
    const mgrs = (hotel.managers || [])
      .map((m) => esc(m.label))
      .join(', ') || '—';
    return `
      <article class="org-hotel ${open ? 'is-open' : ''}" data-slug="${esc(hotel.slug)}">
        <button type="button" class="org-hotel-head" data-act="toggle-hotel">
          <span class="org-hotel-title">
            <span class="org-hotel-name">${esc(hotel.name)}</span>
            <span class="org-pill org-pill--${esc(hotel.kind)}">${esc(kindLabel(hotel.kind))}</span>
          </span>
          <span class="org-hotel-sub">
            ${esc(hotel.city || '—')} · ${hotel.roomCount || 0} camere · ${hotel.staffCount || 0} staff
            ${hotel.managers ? ` · Manager: ${mgrs}` : ''}
          </span>
        </button>
        <div class="org-hotel-body">
          ${hotel.notes ? `<p class="org-notes">${esc(hotel.notes)}</p>` : ''}
          <h4 class="org-section-label">Moduli</h4>
          ${renderModules(hotel, payload.modulesCatalog, canEditModules)}
          <h4 class="org-section-label">Organico per reparto</h4>
          ${renderDepartments(hotel.departments, { canManage: canManageStaff })}
        </div>
      </article>`;
  }

  function paint(root, payload) {
    if (!root) return;
    if (!payload?.ok) {
      root.innerHTML = `<p class="org-empty">Accesso riservato a Dev e Manager.</p>`;
      return;
    }

    const title =
      payload.mode === 'dev'
        ? 'Console Dev — hotel, manager, organico'
        : `Console Manager — ${esc(payload.hotel?.name || 'Hotel')}`;
    const lead =
      payload.mode === 'dev'
        ? 'Canal e affiliati già popolati. Gli slot template sono pronti da personalizzare per i prossimi hotel.'
        : 'Solo il tuo staff. Puoi resettare la password allo standard, promuovere manager e accendere/spegnere i moduli.';

    let body = '';
    if (payload.mode === 'dev') {
      body = (payload.hotels || [])
        .map((h, i) => renderHotelCard(h, payload, { open: i === 0 }))
        .join('');
    } else if (payload.hotel) {
      body = renderHotelCard(
        {
          ...payload.hotel,
          managers: (payload.hotel.departments || [])
            .flatMap((d) => d.staff)
            .filter((s) => s.role === 'manager' || s.role === 'dev'),
        },
        payload,
        { open: true },
      );
    }

    root.innerHTML = `
      <header class="org-head">
        <h2 class="org-title">${title}</h2>
        <p class="org-lead">${lead}</p>
        <p class="org-hint">${esc(payload.standardPinHint || '')}</p>
      </header>
      <div class="org-stack">${body}</div>
    `;
  }

  async function reload(root) {
    if (!root) return;
    root.innerHTML = `<div class="org-skeleton" aria-hidden="true"></div>`;
    try {
      const payload = await api('/api/staff/org');
      paint(root, payload);
      root._orgPayload = payload;
    } catch (err) {
      if (err.status === 401) {
        root.innerHTML = `<p class="org-empty">Sessione scaduta. Rieffettua il login.</p>`;
        return;
      }
      root.innerHTML = `<p class="org-empty">Impossibile caricare la console organizzazione.</p>`;
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
    async mount(root) {
      bind(root);
      await reload(root);
    },
    reload,
  };
})();
