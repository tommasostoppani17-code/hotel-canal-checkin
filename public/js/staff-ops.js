/**
 * Operazioni reception Riva OS — Housekeeping / Colazioni / Note aperte
 * (niente iframe Sestriere; dati via /api/staff/ops/*)
 */
(function () {
  'use strict';

  const SECTION_TAB = {
    all: 'Tutte le camere',
    canal: 'Hotel Canal',
    walter: 'Walter',
    'extra-vaca': 'Extra Vaca',
    'cadei-polo': "Ca' dei Polo",
    appartamenti: 'Appartamenti',
    airone: 'Airone',
  };
  const SECTION_TAB_SHORT = {
    all: 'Tutte',
    canal: 'Canal',
    walter: 'Walter',
    'extra-vaca': 'Extra Vaca',
    'cadei-polo': "Ca' dei Polo",
    appartamenti: 'Appartamenti',
    airone: 'Airone',
  };
  const ROOM_DISPLAY = { 'cadei-polo:Dilana': 'di Lana' };

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatBfDayLabel(iso) {
    const raw = String(iso || '').trim();
    const ymd = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? raw
      : new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(dt);
  }

  function roomLabel(sectionId, roomId) {
    return ROOM_DISPLAY[`${sectionId}:${roomId}`] || String(roomId);
  }

  function sectionLabel(sec) {
    if (!sec) return '';
    return SECTION_TAB[sec.id] || String(sec.label || sec.name || sec.id || '').trim();
  }

  function sectionLabelShort(sec) {
    if (!sec) return '';
    return SECTION_TAB_SHORT[sec.id] || sectionLabel(sec);
  }

  function sectionTabHtml(sec, on) {
    const full = esc(sectionLabel(sec));
    const short = esc(sectionLabelShort(sec));
    return `<button type="button" class="ops-sec-tab${on ? ' is-on' : ''}" role="tab" aria-selected="${on ? 'true' : 'false'}" data-ops-sec="${esc(sec.id)}" title="${full}"><span class="ops-sec-tab__full">${full}</span><span class="ops-sec-tab__short">${short}</span></button>`;
  }

  function roomKey(sectionId, roomId) {
    return `${sectionId}:${roomId}`;
  }

  function receptionProblem(state) {
    if (!state) return null;
    const text = String(state.receptionProblem ?? state.receptionNote ?? '').trim();
    if (!text) return null;
    let status = state.receptionProblemStatus;
    if (!status && state.receptionNote) status = 'open';
    if (!status) status = 'open';
    return {
      text,
      status,
      isOpen: status === 'open',
      urgent: Boolean(state.receptionProblemUrgent),
      reportedBy: state.receptionProblemBy || '',
    };
  }

  function breakfastInfo(state) {
    if (!state?.breakfast) return { text: '—', tone: 'muted', guests: '—' };
    if (state.breakfast === 'yes') {
      const n = state.breakfastGuests;
      const guests =
        n != null && n !== '' && Number.isFinite(Number(n)) ? String(n) : '—';
      return { text: 'Sì', tone: 'yes', guests };
    }
    return { text: 'No', tone: 'no', guests: '—' };
  }

  function boardPlanAutoLabel(state) {
    const plan = String(state?.boardPlan || '').trim().toLowerCase();
    const hint = state?.boardHint;
    const bf = state?.breakfast;
    const setBy = String(state?.breakfastSetBy || '').trim();

    const planIncluded =
      plan === 'colazione_inclusa' ||
      plan === 'mezza_pensione' ||
      plan === 'pensione_completa' ||
      hint === 'yes';
    const planExcluded =
      plan === 'colazione_esclusa' ||
      plan === 'solo_pernottamento' ||
      hint === 'no';

    // Reception ha forzato uno stato diverso dal piano → copy "modificato"
    if (bf === 'yes' || bf === 'no') {
      const matchesPlan =
        (bf === 'yes' && planIncluded) ||
        (bf === 'no' && planExcluded);
      if (setBy || ((planIncluded || planExcluded) && !matchesPlan)) {
        return {
          kind: 'manual',
          text: setBy
            ? `Modificato da ${setBy}`
            : 'Modificato a mano da reception',
        };
      }
    }

    if (planIncluded) {
      return { kind: 'included', text: 'Incluso da prenotazione' };
    }
    if (planExcluded) {
      return { kind: 'excluded', text: 'Escluso da prenotazione' };
    }
    const detail = String(state?.breakfastDetail || '').trim();
    if (detail) return { kind: 'note', text: detail.slice(0, 56) };
    return null;
  }

  function defaultBreakfastGuests(state) {
    const fromBooking = Number(state?.bookingGuests);
    if (Number.isFinite(fromBooking) && fromBooking >= 1) return Math.min(20, Math.round(fromBooking));
    const fromState = Number(state?.breakfastGuests);
    if (Number.isFinite(fromState) && fromState >= 1) return Math.min(20, Math.round(fromState));
    return 2;
  }

  function createOpsUi(deps) {
    const {
      apiPrefix,
      getPanel,
      showToast,
      getStaffName,
      getSheet,
      getSheetBody,
      getSheetTitle,
      openSheetUi,
      closeSheetUi,
      snapshotPath = '/api/staff/ops/snapshot',
      roomPatchPath = '/api/staff/ops/rooms',
      hkToolbarSlotId = 'opsHkToolbarSlot',
      roomsOnly = false,
    } = deps;

    const root = {
      enabled: false,
      view: 'rooms',
      loading: false,
      sections: [],
      rooms: {},
      generalNotes: [],
      version: 0,
      activeSection: null,
      notesFilter: 'all',
      notesQuery: '',
      bfQuery: '',
      bfFilter: 'all',
      bfStructure: 'all',
      pollTimer: null,
      selected: null,
      refreshInflight: null,
      paxTimers: new Map(),
      paxRollback: new Map(),
    };

    function els() {
      const panel = getPanel();
      if (!panel) return {};
      return {
        panel,
        empty: panel.querySelector('#opsEmpty'),
        shell: panel.querySelector('#opsNative'),
        loading: panel.querySelector('#opsLoading'),
        body: panel.querySelector('#opsBody'),
        sheet: getSheet?.() || document.getElementById('opsIgSheet'),
        sheetBody: getSheetBody?.() || document.getElementById('opsIgSheetBody'),
        sheetTitle: getSheetTitle?.() || document.getElementById('opsIgSheetTitle'),
      };
    }

    async function api(path, options = {}) {
      const res = await fetch(`${apiPrefix}${path}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {}),
        },
        ...options,
        body: options.body != null ? JSON.stringify(options.body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || 'Errore operazioni');
        err.status = res.status;
        err.code = data.code;
        throw err;
      }
      return data;
    }

    function stopPoll() {
      if (root.pollTimer) {
        clearInterval(root.pollTimer);
        root.pollTimer = null;
      }
    }

    function startPoll() {
      stopPoll();
      const ms = 12000;
      root.pollTimer = setInterval(() => {
        if (document.hidden) return;
        refresh({ silent: true }).catch(() => {});
      }, ms);
    }

    function paintOpsSkeleton() {
      const { body } = els();
      const SK = window.RivaSkeleton;
      if (!body || !SK) return;
      if (root.view === 'colazioni') {
        body.innerHTML = SK.opsColazioniGrid(12);
        const slot = document.getElementById(hkToolbarSlotId);
        if (slot && SK.opsHkToolbarSkeleton && !slot.querySelector('[data-bf-structure], [data-ops-sec]')) {
          slot.innerHTML = SK.opsHkToolbarSkeleton();
          slot.hidden = false;
          slot.classList.remove('hidden');
          slot.setAttribute('aria-hidden', 'true');
        }
        return;
      }
      if (root.view === 'rooms') {
        body.innerHTML = SK.opsRoomsGrid(12);
        /* Capsule hotel: skeleton solo se la barra è ancora vuota (primo load) */
        const slot = document.getElementById(hkToolbarSlotId);
        if (slot && SK.opsHkToolbarSkeleton && !slot.querySelector('[data-ops-sec]')) {
          slot.innerHTML = SK.opsHkToolbarSkeleton();
          slot.hidden = false;
          slot.classList.remove('hidden');
          slot.setAttribute('aria-hidden', 'true');
        }
        return;
      }
      if (root.view === 'problems') {
        body.innerHTML = `<div class="notes-scroll" style="padding:0">${SK.feedRows(5)}</div>`;
      }
    }

    async function refresh({ silent = false } = {}) {
      const hasCached = Array.isArray(root.sections) && root.sections.length > 0;
      if (!silent && !hasCached) {
        root.loading = true;
        paintOpsSkeleton();
        paintChrome();
      }
      if (root.refreshInflight) {
        try {
          await root.refreshInflight;
          if (!silent && hasCached) paint();
          return;
        } catch (_) {
          /* fall through to new fetch */
        }
      }
      const run = (async () => {
        const prevVersion = root.version;
        const snap = await api(snapshotPath);
        root.sections = snap.sections || [];
        root.rooms = snap.rooms || {};
        root.generalNotes = snap.generalNotes || [];
        const nextVersion = snap.version || 0;
        root.version = nextVersion;
        if (!root.activeSection && root.sections[0]) {
          root.activeSection = root.sections[0].id;
        } else if (
          root.activeSection &&
          !root.sections.some((s) => s.id === root.activeSection)
        ) {
          root.activeSection = root.sections[0]?.id || null;
        }
        // Poll silenzioso: se i dati non sono cambiati non rifare il DOM (resetta lo scroll).
        // Ma se la toolbar hotel è stata svuotata (cambio tab), rimontalav senza wipe griglia.
        if (silent && nextVersion === prevVersion) {
          if (root.view === 'rooms') softUpdateHkToolbar();
          return;
        }
        paint();
        const { body } = els();
        if (body && window.RivaSkeleton) window.RivaSkeleton.revealEl(body);
      })();
      root.refreshInflight = run.finally(() => {
        if (root.refreshInflight === run) root.refreshInflight = null;
      });
      try {
        await root.refreshInflight;
      } finally {
        root.loading = false;
        paintChrome();
      }
    }

    async function prefetch() {
      if (root.refreshInflight) return root.refreshInflight;
      try {
        await refresh({ silent: true });
      } catch (_) {
        /* prefetch best-effort */
      }
    }

    function paintChrome() {
      const { empty, shell, loading, body } = els();
      if (!shell) return;
      empty?.classList.add('hidden');
      shell.classList.remove('hidden');

      const roomsShell = body?.querySelector('.ops-rooms-shell');
      const toolbar = document.querySelector(`#${hkToolbarSlotId} .ops-sec-tabs`);
      const content = roomsShell?.querySelector('.ops-rooms-content');
      const hasTabs = Boolean(toolbar?.querySelector('[data-ops-sec]'));
      const useSkeleton = Boolean(window.RivaSkeleton);

      shell.classList.toggle('has-ops-tabs', hasTabs && root.view === 'rooms');
      if (hasTabs && root.view === 'rooms') {
        const slot = document.getElementById(hkToolbarSlotId);
        const h = Math.ceil(slot?.getBoundingClientRect().height || 72);
        shell.style.setProperty('--ops-tabs-sticky-h', `${h}px`);
      } else {
        shell.style.removeProperty('--ops-tabs-sticky-h');
      }

      if (useSkeleton) {
        loading?.classList.add('hidden');
        content?.classList.remove('is-loading');
        /* Solo skeleton nelle griglie — mai overlay "Caricamento operazioni" */
        if (root.loading && content && !content.querySelector('.ops-skeleton-bf-rows, .ops-skeleton-grid, .hk-card-skeleton, .skel-block, .skeleton-shimmer')) {
          const SK = window.RivaSkeleton;
          if (root.view === 'colazioni' && SK?.opsColazioniGrid) {
            content.innerHTML = SK.opsColazioniGrid(10);
          } else if (root.view === 'rooms' && SK?.opsRoomsGrid) {
            const host = content.querySelector('.ops-rooms-page') || content;
            if (!host.querySelector('.ops-room:not(.hk-card-skeleton), .ops-skeleton-grid, .hk-card-skeleton, .ops-skeleton-bf-rows')) {
              const cards = SK.opsRoomsCards ? SK.opsRoomsCards(12) : '';
              if (cards) {
                host.insertAdjacentHTML(
                  'afterbegin',
                  `<div class="ops-rooms-grid ops-skeleton-grid">${cards}</div>`,
                );
              } else {
                host.insertAdjacentHTML('afterbegin', SK.opsRoomsGrid(12));
              }
            }
          }
        }
        return;
      }

      loading?.classList.add('hidden');
      content?.classList.remove('is-loading');
    }

    function showEmpty() {
      const { empty, shell, loading, body } = els();
      stopPoll();
      shell?.classList.add('hidden');
      shell?.classList.remove('has-ops-tabs');
      loading?.classList.add('hidden');
      body?.querySelector('.ops-rooms-content')?.classList.remove('is-loading');
      empty?.classList.remove('hidden');
    }

    function setView(view) {
      if (roomsOnly) {
        root.view = 'rooms';
      } else {
        root.view = view === 'colazioni' || view === 'problems' ? view : 'rooms';
      }
      paint();
      startPoll();
    }

    async function load(view) {
      if (roomsOnly) root.view = 'rooms';
      else root.view = view === 'colazioni' || view === 'problems' ? view : 'rooms';
      // Filtri colazioni vivono nella toolbar condivisa: toglierli subito
      // (prima dell'await), altrimenti restano visibili su Note camere.
      if (root.view !== 'colazioni') mountBfToolbar('');
      const { empty, shell } = els();
      empty?.classList.add('hidden');
      shell?.classList.remove('hidden');
      try {
        if (Array.isArray(root.sections) && root.sections.length > 0) {
          paint();
          startPoll();
          void refresh({ silent: true }).catch(() => {});
          return;
        }
        await refresh({ silent: false });
        startPoll();
      } catch (err) {
        if (root.view !== 'colazioni') mountBfToolbar('');
        showEmpty();
        if (showToast) showToast(err.message || 'Operazioni non raggiungibili.', true);
      }
    }

    function deactivate(opts = {}) {
      stopPoll();
      closeSheet();
      mountBfToolbar('');
      /* Default: su HK (roomsOnly) NON svuotare le capsule hotel — CSS le nasconde
         su Ospiti/Team. Altrimenti un refresh silent senza change di version non
         richiama paint() e la subbar resta all-white vuota al ritorno su Camere. */
      const clearToolbar = Object.prototype.hasOwnProperty.call(opts, 'clearToolbar')
        ? Boolean(opts.clearToolbar)
        : !roomsOnly;
      if (clearToolbar) clearHkToolbar();
    }

    /** Remount / sync capsule hotel senza toccare la griglia camere. */
    function ensureHkToolbar() {
      if (root.view !== 'rooms') return;
      softUpdateHkToolbar();
    }

    function roomsSectionIds() {
      return (root.sections || []).map((s) => s.id).join('|');
    }

    function roomCardSig(st) {
      const problem = receptionProblem(st);
      return [
        st?.status || '',
        st?.blocked ? '1' : '0',
        st?.breakfast || '',
        st?.breakfastGuests ?? '',
        problem?.isOpen ? (problem.urgent ? '2' : '1') : '0',
        String(st?.hkNote || '').trim() ? (st.hkNoteUrgent ? '2' : '1') : '0',
        String(st?.managerNote || '').trim() ? (st.managerNoteUrgent ? '2' : '1') : '0',
      ].join('|');
    }

    function paintRoomCard(sectionId, roomId) {
      const key = roomKey(sectionId, roomId);
      const st = root.rooms[key] || {};
      const { body } = els();
      const el = body?.querySelector(`[data-ops-room="${CSS.escape(key)}"]`);
      if (!el) return false;

      const blocked = Boolean(st.blocked);
      const clean = st.status === 'clean' && !blocked;
      const tone = blocked ? 'blocked' : clean ? 'clean' : 'dirty';
      const statusWord =
        tone === 'clean' ? 'Pronta' : tone === 'blocked' ? 'Bloccata' : 'Da rifare';
      const lampTone = blocked ? 'blocked' : clean ? 'ready' : 'dirty';

      el.classList.remove('ops-room--clean', 'ops-room--dirty', 'ops-room--blocked');
      el.classList.add(`ops-room--${tone}`);
      el.setAttribute('data-ops-sig', roomCardSig(st));

      const statusEl = el.querySelector('.ops-room__status');
      if (statusEl && statusEl.textContent !== statusWord) statusEl.textContent = statusWord;

      const ariaHint = blocked ? '' : '. Doppio tap per cambiare stato';
      el.setAttribute(
        'aria-label',
        `Camera ${roomLabel(sectionId, roomId)}, ${statusWord}${ariaHint}`,
      );

      let lamp = el.querySelector('.ops-semaforo');
      if (lamp) {
        if (lamp.tagName === 'BUTTON') {
          const span = document.createElement('span');
          span.className = lamp.className;
          span.innerHTML = lamp.innerHTML;
          lamp.replaceWith(span);
          lamp = span;
        }
        if (blocked) {
          lamp.className = 'ops-semaforo ops-semaforo--blocked';
          lamp.title = 'Bloccata';
          lamp.setAttribute('role', 'img');
          lamp.setAttribute('aria-label', 'Bloccata');
          lamp.removeAttribute('aria-hidden');
        } else {
          lamp.className = `ops-semaforo ops-semaforo--${lampTone}`;
          lamp.removeAttribute('title');
          lamp.removeAttribute('role');
          lamp.removeAttribute('aria-label');
          lamp.setAttribute('aria-hidden', 'true');
        }
        lamp.classList.remove('is-arm');
      }

      /* Chip markers: aggiorna solo se cambia il sig chips (note/bf) — senza rebuild card. */
      const problem = receptionProblem(st);
      const hk = String(st.hkNote || '').trim();
      const mgr = String(st.managerNote || '').trim();
      const markers = [];
      if (!roomsOnly) {
        if (problem?.isOpen) {
          markers.push(
            `<span class="ops-chip ops-chip--reception${problem.urgent ? ' is-urgent' : ''}" title="Reception"></span>`,
          );
        }
        if (hk) {
          markers.push(`<span class="ops-chip ops-chip--hk${st.hkNoteUrgent ? ' is-urgent' : ''}" title="Nota HK"></span>`);
        }
        if (mgr) {
          markers.push(`<span class="ops-chip ops-chip--mgr${st.managerNoteUrgent ? ' is-urgent' : ''}" title="Manager"></span>`);
        }
      }
      let chips = el.querySelector('.ops-room__chips');
      const nextChips = markers.join('');
      const bodyEl = el.querySelector('.ops-room__body');
      if (markers.length) {
        if (!chips) {
          chips = document.createElement('div');
          chips.className = 'ops-room__chips';
          chips.setAttribute('aria-hidden', 'true');
          bodyEl?.appendChild(chips);
        }
        if (chips.innerHTML !== nextChips) chips.innerHTML = nextChips;
      } else if (chips) {
        chips.remove();
      }
      return true;
    }

    function softUpdateRooms(body) {
      const shell = body.querySelector('.ops-rooms-shell');
      const pager = body.querySelector('#opsRoomsPager');
      if (!shell || !pager) return false;
      const existingIds = [...pager.querySelectorAll('[data-ops-page]')]
        .map((el) => el.getAttribute('data-ops-page'))
        .join('|');
      if (existingIds !== roomsSectionIds()) return false;

      const scrollLeft = pager.scrollLeft;
      const scrollTops = {};
      pager.querySelectorAll('[data-ops-page]').forEach((page) => {
        scrollTops[page.getAttribute('data-ops-page')] = page.scrollTop;
      });

      let rebound = false;
      root.sections.forEach((s) => {
        const page = pager.querySelector(`[data-ops-page="${CSS.escape(s.id)}"]`);
        if (!page) return;
        let grid = page.querySelector('.ops-rooms-grid');
        if (!grid) {
          const cards = (s.rooms || []).map((roomId) => {
            const st = root.rooms[roomKey(s.id, roomId)] || {};
            return renderRoomCard(s.id, roomId, st);
          });
          page.innerHTML = `<div class="ops-rooms-grid">${cards.join('') || '<p class="ops-muted">Nessuna camera in questa sezione.</p>'}</div>`;
          rebound = true;
        } else {
          (s.rooms || []).forEach((roomId) => {
            const st = root.rooms[roomKey(s.id, roomId)] || {};
            const sig = roomCardSig(st);
            const key = `${s.id}:${roomId}`;
            const el = grid.querySelector(`[data-ops-room="${CSS.escape(key)}"]`);
            if (el && el.getAttribute('data-ops-sig') === sig) return;
            if (el && paintRoomCard(s.id, roomId)) return;
            const html = renderRoomCard(s.id, roomId, st);
            if (el) {
              el.outerHTML = html;
              rebound = true;
            } else {
              grid.insertAdjacentHTML('beforeend', html);
              rebound = true;
            }
          });
        }
        const top = scrollTops[s.id];
        if (typeof top === 'number') page.scrollTop = top;
      });

      pager.scrollLeft = scrollLeft;
      syncSecTabs(root.activeSection, { scrollTab: false, animateThumb: false });
      softUpdateHkToolbar();
      return { rebound };
    }

    function softUpdateHkToolbar() {
      const slot = document.getElementById(hkToolbarSlotId);
      if (!slot || root.view !== 'rooms' || !root.sections.length) {
        clearHkToolbar();
        return;
      }
      if (!slot.querySelector('.ops-sec-tabs')) {
        mountHkToolbar();
        return;
      }
      const activeId = root.activeSection || root.sections[0]?.id;
      slot.querySelectorAll('[data-ops-sec]').forEach((btn) => {
        const on = btn.getAttribute('data-ops-sec') === activeId;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      const sec = root.sections.find((s) => s.id === activeId) || root.sections[0];
      const stats = sec ? sectionStats(sec) : { cleanN: 0, dirtyN: 0, blockedN: 0 };
      const line = slot.querySelector('#opsRoomsStats');
      if (line) line.innerHTML = statsLineHtml(stats.cleanN, stats.dirtyN, stats.blockedN);
    }

    function bindRoomsCards(body) {
      body.querySelectorAll('.ops-room[data-ops-room]').forEach((card) => {
        if (card.dataset.opsBound === '1') return;
        card.dataset.opsBound = '1';
        const raw = String(card.getAttribute('data-ops-room') || '');
        const [sectionId, ...rest] = raw.split(':');
        const roomId = rest.join(':');
        if (!sectionId || !roomId) return;

        let lastTapAt = 0;
        let singleTimer = null;
        let press = null;
        const TAP_MAX = 14;
        const DBL_MS = 280;

        const clearSingle = () => {
          if (singleTimer) {
            clearTimeout(singleTimer);
            singleTimer = null;
          }
        };

        const openDetail = () => {
          document.querySelectorAll('.ops-room.is-selected').forEach((el) => {
            el.classList.remove('is-selected');
          });
          card.classList.add('is-selected');
          openRoomSheet(sectionId, roomId);
        };

        const onDoubleToggle = () => {
          clearSingle();
          lastTapAt = 0;
          void toggleRoomStatus(sectionId, roomId);
        };

        card.addEventListener(
          'pointerdown',
          (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            press = { x: e.clientX, y: e.clientY, id: e.pointerId };
          },
          { passive: true },
        );
        card.addEventListener('pointercancel', () => {
          press = null;
        });
        card.addEventListener(
          'pointerup',
          (e) => {
            if (!press || e.pointerId !== press.id) return;
            const dx = e.clientX - press.x;
            const dy = e.clientY - press.y;
            press = null;
            if (Math.abs(dx) > TAP_MAX || Math.abs(dy) > TAP_MAX) return;
            e.preventDefault();
            e.stopPropagation();

            const st = root.rooms[roomKey(sectionId, roomId)] || {};
            if (st.blocked) {
              openDetail();
              return;
            }

            const now = Date.now();
            const gap = now - lastTapAt;
            if (gap > 0 && gap < DBL_MS) {
              onDoubleToggle();
              return;
            }
            lastTapAt = now;
            clearSingle();
            singleTimer = window.setTimeout(() => {
              singleTimer = null;
              lastTapAt = 0;
              openDetail();
            }, DBL_MS);
          },
          { passive: false },
        );

        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetail();
          }
        });
      });
    }

    function paint() {
      const { body } = els();
      if (!body) return;
      if (root.view === 'colazioni') {
        clearHkToolbar();
        const existing = body.querySelector('#opsBfPager');
        const { filtersHtml, boardHtml } = renderColazioni();
        if (existing && softUpdateColazioni(body, boardHtml, filtersHtml)) {
          return;
        }
        const prevPager = body.querySelector('#opsBfPager');
        const scrollTops = {};
        prevPager?.querySelectorAll('[data-bf-page]').forEach((page) => {
          scrollTops[page.getAttribute('data-bf-page')] = page.scrollTop;
        });
        body.innerHTML = boardHtml;
        const slot = document.getElementById(hkToolbarSlotId);
        if (slot?.querySelector('.bf-structures') || slot?.querySelector('.ops-stats-line')) {
          softUpdateBfToolbar(filtersHtml);
        } else {
          mountBfToolbar(filtersHtml);
        }
        bindBody(body);
        const nextPager = body.querySelector('#opsBfPager');
        if (nextPager) {
          const activeId = root.bfStructure || 'all';
          const activePage = nextPager.querySelector(`[data-bf-page="${CSS.escape(activeId)}"]`);
          if (activePage) nextPager.scrollLeft = activePage.offsetLeft;
          Object.keys(scrollTops).forEach((id) => {
            const page = nextPager.querySelector(`[data-bf-page="${CSS.escape(id)}"]`);
            if (page) page.scrollTop = scrollTops[id] || 0;
          });
        }
      } else if (root.view === 'problems') {
        clearHkToolbar();
        mountBfToolbar('');
        body.innerHTML = renderProblems();
        bindBody(body);
      } else {
        mountBfToolbar('');
        const soft = softUpdateRooms(body);
        if (soft) {
          if (soft.rebound) bindRoomsCards(body);
          syncSecTabs(root.activeSection, { scrollTab: false });
        } else {
          body.innerHTML = renderRooms();
          mountHkToolbar();
          bindBody(body);
        }
        requestAnimationFrame(() => {
          const tabs = document.querySelector(`#${hkToolbarSlotId} .ops-sec-tabs`);
          const on = tabs?.querySelector('.is-on');
          if (tabs && on) placeSegThumb(tabs, on, { animate: false });
          paintChrome();
        });
      }
    }

    /** Aggiorna le righe colazioni (Sì/No/+/-) senza toccare il tbody — tutte le pagine del pager. */
    function paintBreakfastRow(key) {
      const id = String(key || '').trim();
      if (!id) return false;
      const { body } = els();
      const rows = body?.querySelectorAll(`[data-bf-row="${CSS.escape(id)}"]`);
      if (!rows?.length) return false;
      const st = root.rooms[id] || {};
      let tone = 'unset';
      if (st.breakfast === 'yes') tone = 'yes';
      else if (st.breakfast === 'no') tone = 'no';

      const n = Number(st.breakfastGuests);
      const guestsN = Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
      const auto = boardPlanAutoLabel(st);
      const hintText = auto?.text || String(st.breakfastDetail || '').trim().slice(0, 56);
      const hintKind = auto?.kind || (hintText ? 'note' : '');

      rows.forEach((row) => {
        row.classList.remove('is-yes', 'is-no', 'is-unset');
        row.classList.add(`is-${tone}`);

        const val = row.querySelector('.bf-stepper__val');
        if (val) {
          const next = String(guestsN);
          if (val.textContent !== next) val.textContent = next;
        }

        const yesBtn = row.querySelector('[data-bf-status="yes"]');
        const noBtn = row.querySelector('[data-bf-status="no"]');
        if (yesBtn) {
          yesBtn.classList.toggle('is-on', tone === 'yes');
          yesBtn.classList.remove('is-no');
        }
        if (noBtn) {
          noBtn.classList.toggle('is-on', tone === 'no');
          noBtn.classList.toggle('is-no', tone === 'no');
        }

        const hintEl = row.querySelector('[data-bf-hint]');
        if (hintEl) {
          hintEl.className = `bf-room__hint${hintKind ? ` is-${hintKind}` : ''}`;
          if (hintText) {
            hintEl.hidden = false;
            if (hintEl.textContent !== hintText) hintEl.textContent = hintText;
          } else {
            hintEl.hidden = true;
            hintEl.textContent = '';
          }
        }
      });
      return true;
    }

    /** Solo contatori toolbar — niente rebuild lista né stringhe HTML. */
    function refreshBreakfastToolbarFromState() {
      if (root.view !== 'colazioni') return;
      const slot = document.getElementById(hkToolbarSlotId);
      if (!slot) return;
      const structureId =
        root.bfStructure && root.bfStructure !== 'all'
          ? String(root.bfStructure)
          : 'all';
      const all = allColazioniRows();
      let guestsTotal = 0;
      let nUnset = 0;
      for (const row of all) {
        const tone = !row.state.breakfast
          ? 'unset'
          : row.state.breakfast === 'yes'
            ? 'yes'
            : 'no';
        if (structureId !== 'all' && row.sectionId !== structureId) continue;
        if (tone === 'unset') nUnset += 1;
        if (tone === 'yes') {
          const n = Number(row.state.breakfastGuests);
          if (Number.isFinite(n) && n > 0) guestsTotal += Math.round(n);
        }
      }
      const nEl = slot.querySelector('.ops-bf-stats__n, [data-bf-toolbar-total]');
      if (nEl && nEl.textContent !== String(guestsTotal)) nEl.textContent = String(guestsTotal);
      const { body } = els();
      body?.querySelectorAll('[data-bf-pax-total]').forEach((el) => {
        if (el.textContent !== String(guestsTotal)) el.textContent = String(guestsTotal);
      });
      body?.querySelectorAll('.bf-pax-badge').forEach((badge) => {
        badge.classList.toggle('has-pending', nUnset > 0);
        let sub = badge.querySelector('.bf-pax-badge__sub');
        if (nUnset > 0) {
          if (!sub) {
            sub = document.createElement('span');
            sub.className = 'bf-pax-badge__sub';
            badge.appendChild(sub);
          }
          const next = `${nUnset} da fare`;
          if (sub.textContent !== next) sub.textContent = next;
        } else if (sub) {
          sub.remove();
        }
      });
    }

    function paintColazioniRowOrFallback(key) {
      if (paintBreakfastRow(key)) {
        refreshBreakfastToolbarFromState();
        return;
      }
      paint();
    }

    /** Aggiorna righe colazioni in-place (niente full DOM rebuild / no jump scroll). */
    function softUpdateColazioni(body, boardHtml, filtersHtml) {
      const livePager = body.querySelector('#opsBfPager');
      if (!livePager) return false;
      const tmp = document.createElement('div');
      tmp.innerHTML = boardHtml;
      const nextPager = tmp.querySelector('#opsBfPager');
      if (!nextPager) return false;

      const livePageIds = [...livePager.querySelectorAll('[data-bf-page]')]
        .map((el) => el.getAttribute('data-bf-page'))
        .join('|');
      const nextPageIds = [...nextPager.querySelectorAll('[data-bf-page]')]
        .map((el) => el.getAttribute('data-bf-page'))
        .join('|');
      if (livePageIds !== nextPageIds) return false;

      for (const livePage of livePager.querySelectorAll('[data-bf-page]')) {
        const pageId = livePage.getAttribute('data-bf-page');
        const nextPage = nextPager.querySelector(`[data-bf-page="${CSS.escape(pageId)}"]`);
        const live = livePage.querySelector('tbody.bf-rows, .bf-rows');
        const nextRows = nextPage?.querySelector('tbody.bf-rows, .bf-rows');
        if (!live && !nextRows) continue;
        if (!live || !nextRows) return false;
        const nextIds = [...nextRows.querySelectorAll('[data-bf-row]')]
          .map((el) => el.getAttribute('data-bf-row'))
          .join('|');
        const liveIds = [...live.querySelectorAll('[data-bf-row]')]
          .map((el) => el.getAttribute('data-bf-row'))
          .join('|');
        if (nextIds !== liveIds) return false;
      }

      /* Chirurgico: solo classi / contatore / toggle — mai innerHTML della riga. */
      const seen = new Set();
      livePager.querySelectorAll('[data-bf-row]').forEach((liveEl) => {
        const id = liveEl.getAttribute('data-bf-row');
        if (!id || seen.has(id)) return;
        seen.add(id);
        paintBreakfastRow(id);
      });

      softUpdateBfToolbar(filtersHtml);
      return true;
    }

    function bindColazioniRow(rowEl) {
      if (!rowEl) return;
      rowEl.querySelectorAll('[data-ops-open]').forEach((btn) => {
        btn.onclick = () => {
          const [sectionId, ...rest] = String(btn.getAttribute('data-ops-open') || '').split(':');
          openRoomSheet(sectionId, rest.join(':'));
        };
      });
      rowEl.querySelectorAll('[data-bf-pax-delta]').forEach((btn) => {
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const delta = Number(btn.getAttribute('data-bf-pax-delta'));
          const [sectionId, ...rest] = String(btn.getAttribute('data-bf-room') || '').split(':');
          if (!sectionId || !rest.length || !Number.isFinite(delta)) return;
          bumpBreakfastGuests(sectionId, rest.join(':'), delta);
        };
      });
      rowEl.querySelectorAll('[data-bf-status]').forEach((btn) => {
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const status = btn.getAttribute('data-bf-status');
          const [sectionId, ...rest] = String(btn.getAttribute('data-bf-room') || '').split(':');
          if (!sectionId || !rest.length) return;
          setBreakfastStatus(sectionId, rest.join(':'), status);
        };
      });
    }

    function scrollSegToCenter(track, btn, { smooth = false } = {}) {
      if (!track || !btn) return;
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      if (max <= 1) {
        track.scrollLeft = 0;
        return;
      }
      const target = btn.offsetLeft - (track.clientWidth - btn.offsetWidth) / 2;
      track.scrollTo({
        left: Math.max(0, Math.min(max, target)),
        behavior: smooth ? 'smooth' : 'auto',
      });
    }

    function placeSegThumb(track, btn, { animate = true } = {}) {
      if (!track || !btn) return;
      const thumb = track.querySelector(':scope > .ig-seg-thumb, :scope > .ops-seg-thumb, :scope > .ops-bf-filters__thumb');
      if (thumb) thumb.remove();
      scrollSegToCenter(track, btn, { smooth: Boolean(animate) });
    }

    function softUpdateBfToolbar(filtersHtml) {
      if (root.view !== 'colazioni') return;
      const slot = document.getElementById(hkToolbarSlotId);
      if (!slot || !filtersHtml) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = filtersHtml;
      const newStats = tmp.querySelector('.ops-stats-line');
      const oldStats = slot.querySelector('.ops-stats-line');
      if (newStats && oldStats && oldStats.innerHTML !== newStats.innerHTML) {
        oldStats.innerHTML = newStats.innerHTML;
      }
      const newTabs = tmp.querySelector('.bf-structures');
      const oldTabs = slot.querySelector('.bf-structures');
      if (newTabs && oldTabs) {
        let dirty = false;
        newTabs.querySelectorAll('[data-bf-structure]').forEach((newBtn) => {
          const id = newBtn.getAttribute('data-bf-structure');
          const oldBtn = oldTabs.querySelector(`[data-bf-structure="${CSS.escape(id)}"]`);
          if (!oldBtn) {
            dirty = true;
            return;
          }
          if (oldBtn.innerHTML !== newBtn.innerHTML) {
            oldBtn.innerHTML = newBtn.innerHTML;
          }
          const on = newBtn.classList.contains('is-on');
          oldBtn.classList.toggle('is-on', on);
          oldBtn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        if (dirty || oldTabs.children.length !== newTabs.children.length) {
          oldTabs.innerHTML = newTabs.innerHTML;
          bindBfStructureClicks(slot);
        }
      } else if (!slot.querySelector('.bf-structures')) {
        slot.innerHTML = filtersHtml;
        bindBfStructureClicks(slot);
        requestAnimationFrame(() => {
          const f = slot.querySelector('.bf-structures');
          const on = f?.querySelector('.is-on');
          if (f && on) placeSegThumb(f, on, { animate: false });
        });
      }
      slot.hidden = false;
      slot.classList.remove('hidden');
      slot.setAttribute('aria-hidden', 'false');
    }

    function bindBfStructureClicks(rootEl) {
      if (!rootEl) return;
      rootEl.querySelectorAll('[data-bf-structure]').forEach((btn) => {
        btn.onclick = () => {
          applyBfStructure(btn.getAttribute('data-bf-structure') || 'all');
        };
      });
    }

    function applyBfFilter(_id) {
      // Status filters rimossi: ridisegna solo griglia/strutture.
      if (root.view !== 'colazioni') return;
      root.bfFilter = 'all';
      paint();
    }

    function syncBfTabs(activeId, { scrollTab = true } = {}) {
      const slot = document.getElementById(hkToolbarSlotId);
      const tabs = slot?.querySelector('.bf-structures');
      if (!tabs) return;
      let onBtn = null;
      tabs.querySelectorAll('[data-bf-structure]').forEach((btn) => {
        const on = btn.getAttribute('data-bf-structure') === activeId;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) onBtn = btn;
      });
      refreshBreakfastToolbarFromState();
      if (onBtn) placeSegThumb(tabs, onBtn, { animate: Boolean(scrollTab) });
    }

    function goToBfStructure(sectionId, { fromPager = false } = {}) {
      if (root.view !== 'colazioni') return;
      const next = String(sectionId || 'all').trim() || 'all';
      const normalized = next === 'all' ? 'all' : next;
      if (normalized === (root.bfStructure || 'all')) {
        if (!fromPager) syncBfTabs(normalized);
        return;
      }
      root.bfStructure = normalized;
      syncBfTabs(normalized);
      if (fromPager) return;
      const pager = document.getElementById('opsBfPager');
      const page = pager?.querySelector(`[data-bf-page="${CSS.escape(normalized)}"]`);
      if (pager && page) {
        pager.scrollTo({ left: page.offsetLeft, behavior: 'smooth' });
      } else {
        paint();
      }
    }

    function applyBfStructure(sectionId) {
      goToBfStructure(sectionId);
    }

    async function toggleBreakfastQuick(sectionId, roomId) {
      const st = root.rooms[roomKey(sectionId, roomId)] || {};
      const isYes = st.breakfast === 'yes';
      if (isYes) {
        await patchBreakfastInline(sectionId, roomId, {
          breakfast: 'no',
          breakfastGuests: null,
          breakfastFirstDayOnly: false,
        });
        return;
      }
      await patchBreakfastInline(sectionId, roomId, {
        breakfast: 'yes',
        breakfastGuests: defaultBreakfastGuests(st),
        breakfastFirstDayOnly: false,
      });
    }

    async function patchBreakfastInline(sectionId, roomId, patch) {
      const key = roomKey(sectionId, roomId);
      const prev = { ...(root.rooms[key] || {}) };
      root.rooms[key] = {
        ...prev,
        ...patch,
        breakfastFirstDayOnly: false,
      };
      if (root.view === 'colazioni') paintColazioniRowOrFallback(key);
      try {
        const data = await api(
          `${roomPatchPath}/${encodeURIComponent(sectionId)}/${encodeURIComponent(roomId)}`,
          { method: 'PATCH', body: { ...patch, breakfastFirstDayOnly: false } },
        );
        if (data.room) {
          root.rooms[key] = {
            ...data.room,
            boardPlan: prev.boardPlan || data.room.boardPlan,
            bookingGuests: prev.bookingGuests ?? data.room.bookingGuests,
            boardHint: prev.boardHint ?? data.room.boardHint,
          };
          if (root.view === 'colazioni') paintColazioniRowOrFallback(key);
        }
        if (data.version != null) root.version = data.version;
      } catch (err) {
        root.rooms[key] = prev;
        if (root.view === 'colazioni') paintColazioniRowOrFallback(key);
        showToast?.(err.message || 'Salvataggio non riuscito.', true);
      }
    }

    function setBreakfastStatus(sectionId, roomId, status) {
      const st = root.rooms[roomKey(sectionId, roomId)] || {};
      // Secondo tap sullo stesso stato → torna "da fare"
      if (status === 'yes' && st.breakfast === 'yes') {
        void patchBreakfastInline(sectionId, roomId, {
          breakfast: null,
          breakfastGuests: null,
        });
        return;
      }
      if (status === 'no' && st.breakfast === 'no') {
        void patchBreakfastInline(sectionId, roomId, {
          breakfast: null,
          breakfastGuests: null,
        });
        return;
      }
      if (status === 'yes') {
        void patchBreakfastInline(sectionId, roomId, {
          breakfast: 'yes',
          breakfastGuests: defaultBreakfastGuests(st),
        });
        return;
      }
      if (status === 'no') {
        void patchBreakfastInline(sectionId, roomId, {
          breakfast: 'no',
          breakfastGuests: null,
        });
        return;
      }
      void patchBreakfastInline(sectionId, roomId, {
        breakfast: null,
        breakfastGuests: null,
      });
    }

    function bumpBreakfastGuests(sectionId, roomId, delta) {
      const key = roomKey(sectionId, roomId);
      const st = root.rooms[key] || {};
      if (!root.paxTimers.has(key)) {
        root.paxRollback.set(key, { ...st });
      }
      const rollback = root.paxRollback.get(key) || { ...st };
      const cur = Number(st.breakfastGuests);
      const base = Number.isFinite(cur) && cur >= 0 ? Math.round(cur) : 0;
      let next = base + delta;
      if (next < 0) next = 0;
      if (next > 20) next = 20;

      if (next === 0) {
        root.rooms[key] = { ...st, breakfast: 'no', breakfastGuests: null, breakfastFirstDayOnly: false };
      } else {
        root.rooms[key] = { ...st, breakfast: 'yes', breakfastGuests: next, breakfastFirstDayOnly: false };
      }
      if (root.view === 'colazioni') paintColazioniRowOrFallback(key);

      const prevTimer = root.paxTimers.get(key);
      if (prevTimer) clearTimeout(prevTimer);
      root.paxTimers.set(
        key,
        setTimeout(() => {
          root.paxTimers.delete(key);
          const latest = root.rooms[key] || {};
          const g = Number(latest.breakfastGuests);
          const patch =
            latest.breakfast === 'no' || !Number.isFinite(g) || g <= 0
              ? { breakfast: 'no', breakfastGuests: null, breakfastFirstDayOnly: false }
              : { breakfast: 'yes', breakfastGuests: Math.round(g), breakfastFirstDayOnly: false };
          void (async () => {
            try {
              const data = await api(
                `${roomPatchPath}/${encodeURIComponent(sectionId)}/${encodeURIComponent(roomId)}`,
                { method: 'PATCH', body: patch },
              );
              if (data.room) {
                root.rooms[key] = {
                  ...data.room,
                  boardPlan: rollback.boardPlan || data.room.boardPlan,
                  bookingGuests: rollback.bookingGuests ?? data.room.bookingGuests,
                  boardHint: rollback.boardHint ?? data.room.boardHint,
                };
              }
              if (data.version != null) root.version = data.version;
              if (root.view === 'colazioni') paintColazioniRowOrFallback(key);
            } catch (err) {
              root.rooms[key] = rollback;
              if (root.view === 'colazioni') paintColazioniRowOrFallback(key);
              showToast?.(err.message || 'Salvataggio non riuscito.', true);
            } finally {
              root.paxRollback.delete(key);
            }
          })();
        }, 220),
      );
    }

    function mountBfToolbar(filtersHtml) {
      const slot = document.getElementById(hkToolbarSlotId);
      if (!slot) return;
      /* Legacy slot Colazioni: resta vuoto — chrome unificato su barra HK. */
      const legacy = document.getElementById('opsBfToolbarSlot');
      if (legacy) {
        legacy.innerHTML = '';
        legacy.hidden = true;
        legacy.classList.add('hidden');
        legacy.setAttribute('aria-hidden', 'true');
      }
      if (!filtersHtml || root.view !== 'colazioni') {
        if (slot.querySelector('.bf-structures, #opsBfStats, [data-bf-structure]')) {
          slot.innerHTML = '';
          slot.hidden = true;
          slot.classList.add('hidden');
          slot.setAttribute('aria-hidden', 'true');
        }
        return;
      }
      if (slot.querySelector('.bf-structures') || slot.querySelector('.ops-stats-line')) {
        softUpdateBfToolbar(filtersHtml);
        slot.hidden = false;
        slot.classList.remove('hidden');
        slot.setAttribute('aria-hidden', 'false');
        return;
      }
      slot.innerHTML = filtersHtml;
      slot.hidden = false;
      slot.classList.remove('hidden');
      slot.setAttribute('aria-hidden', 'false');
      bindBfStructureClicks(slot);
      requestAnimationFrame(() => {
        const f = slot.querySelector('.bf-structures');
        const on = f?.querySelector('.is-on');
        if (f && on) placeSegThumb(f, on, { animate: false });
      });
    }

    function statusBadge(tone, { large = false } = {}) {
      const label =
        tone === 'clean' ? 'Pronta' : tone === 'blocked' ? 'Bloccata' : 'Da rifare';
      const icon =
        tone === 'clean'
          ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : tone === 'blocked'
            ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
      return `<span class="ops-status ops-status--${tone}${large ? ' ops-status--lg' : ''}" title="${label}"><span class="ops-status__mark">${icon}</span><span class="ops-status__label">${label}</span></span>`;
    }

    function sectionStats(s) {
      let cleanN = 0;
      let dirtyN = 0;
      let blockedN = 0;
      for (const roomId of s.rooms || []) {
        const st = root.rooms[roomKey(s.id, roomId)] || {};
        if (st.blocked) blockedN += 1;
        else if (st.status === 'clean') cleanN += 1;
        else dirtyN += 1;
      }
      return { cleanN, dirtyN, blockedN, total: (s.rooms || []).length };
    }

    function statsLineHtml(clean, dirty, blocked) {
      return `
        <span><strong>${clean}</strong> pronte</span>
        <span class="ops-stats-dot" aria-hidden="true">·</span>
        <span><strong>${dirty}</strong> da rifare</span>
        <span class="ops-stats-dot" aria-hidden="true">·</span>
        <span><strong>${blocked}</strong> bloccate</span>
      `;
    }

    function clearHkToolbar() {
      const slot = document.getElementById(hkToolbarSlotId);
      if (!slot) return;
      slot.innerHTML = '';
      slot.hidden = true;
      slot.classList.add('hidden');
      slot.setAttribute('aria-hidden', 'true');
    }

    function mountHkToolbar() {
      const slot = document.getElementById(hkToolbarSlotId);
      if (!slot || root.view !== 'rooms' || !root.sections.length) {
        clearHkToolbar();
        return;
      }
      const activeId = root.activeSection || root.sections[0]?.id;
      const sec = root.sections.find((s) => s.id === activeId) || root.sections[0];
      const tabs = root.sections
        .map((s) => sectionTabHtml(s, s.id === activeId))
        .join('');
      const activeStats = sec ? sectionStats(sec) : { cleanN: 0, dirtyN: 0, blockedN: 0 };
      slot.innerHTML = `
        <div class="ig-subbar-tabs-inner">
          <div class="ops-sec-tabs" role="tablist" aria-label="Hotel">${tabs}</div>
          <p class="ops-stats-line" id="opsRoomsStats" aria-label="Riepilogo camere">${statsLineHtml(activeStats.cleanN, activeStats.dirtyN, activeStats.blockedN)}</p>
        </div>`;
      slot.hidden = false;
      slot.classList.remove('hidden');
      slot.setAttribute('aria-hidden', 'false');
      bindSecTabClicks(slot);
      const onTab = slot.querySelector('.ops-sec-tab.is-on');
      const track = slot.querySelector('.ops-sec-tabs');
      if (track && onTab) placeSegThumb(track, onTab, { animate: false });
    }

    function bindSecTabClicks(rootEl) {
      if (!rootEl) return;
      rootEl.querySelectorAll('[data-ops-sec]').forEach((btn) => {
        btn.addEventListener('click', () => {
          goToRoomsSection(btn.getAttribute('data-ops-sec'));
        });
      });
    }

    /** Tap affidabile su iOS (evita click persi dentro scroll container). */
    function bindTap(el, handler) {
      if (!el || typeof handler !== 'function') return;
      let start = null;
      const TAP_MAX = 14;
      el.addEventListener(
        'pointerdown',
        (e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          start = { x: e.clientX, y: e.clientY, id: e.pointerId };
        },
        { passive: true },
      );
      el.addEventListener('pointercancel', () => {
        start = null;
      });
      el.addEventListener(
        'pointerup',
        (e) => {
          if (!start || e.pointerId !== start.id) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          start = null;
          if (Math.abs(dx) > TAP_MAX || Math.abs(dy) > TAP_MAX) return;
          e.preventDefault();
          e.stopPropagation();
          handler(e);
        },
        { passive: false },
      );
    }

    function syncSecTabs(activeId, { scrollTab = true } = {}) {
      const tabs = document.querySelector('.ops-sec-tabs');
      if (!tabs) return;
      let onBtn = null;
      tabs.querySelectorAll('[data-ops-sec]').forEach((btn) => {
        const on = btn.getAttribute('data-ops-sec') === activeId;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) onBtn = btn;
      });
      const sec = root.sections.find((s) => s.id === activeId);
      const statsEl = document.getElementById('opsRoomsStats');
      if (sec && statsEl) {
        const { cleanN, dirtyN, blockedN } = sectionStats(sec);
        statsEl.innerHTML = statsLineHtml(cleanN, dirtyN, blockedN);
      }
      if (onBtn) placeSegThumb(tabs, onBtn, { animate: Boolean(scrollTab) });
    }

    function goToRoomsSection(sectionId, { fromPager = false } = {}) {
      if (!sectionId || sectionId === root.activeSection) {
        if (!fromPager) syncSecTabs(sectionId);
        return;
      }
      root.activeSection = sectionId;
      syncSecTabs(sectionId);
      if (fromPager) return;
      const pager = document.getElementById('opsRoomsPager');
      const page = pager?.querySelector(`[data-ops-page="${sectionId}"]`);
      if (pager && page) {
        pager.scrollTo({ left: page.offsetLeft, behavior: 'smooth' });
      } else {
        paint();
      }
    }

    function renderRooms() {
      const sec = root.sections.find((s) => s.id === root.activeSection) || root.sections[0];
      const activeId = sec?.id || root.activeSection;
      if (sec && root.activeSection !== activeId) root.activeSection = activeId;

      const pages = root.sections
        .map((s) => {
          const cards = (s.rooms || []).map((roomId) => {
            const st = root.rooms[roomKey(s.id, roomId)] || {};
            return renderRoomCard(s.id, roomId, st);
          });
          return `<section class="ops-rooms-page" data-ops-page="${esc(s.id)}" aria-label="${esc(sectionLabel(s))}">
            <div class="ops-rooms-grid">${cards.join('') || '<p class="ops-muted">Nessuna camera in questa sezione.</p>'}</div>
          </section>`;
        })
        .join('');

      return `
        <div class="ops-rooms-shell">
          <div class="ops-rooms-content">
            <div class="ops-rooms-pager" id="opsRoomsPager">${pages}</div>
          </div>
        </div>
      `;
    }

    function renderRoomCard(sectionId, roomId, st) {
      const blocked = Boolean(st.blocked);
      const clean = st.status === 'clean' && !blocked;
      const tone = blocked ? 'blocked' : clean ? 'clean' : 'dirty';
      const statusWord =
        tone === 'clean' ? 'Pronta' : tone === 'blocked' ? 'Bloccata' : 'Da rifare';
      const bf = breakfastInfo(st);
      const problem = receptionProblem(st);
      const hk = String(st.hkNote || '').trim();
      const mgr = String(st.managerNote || '').trim();
      const markers = [];
      const extras = [];
      if (!roomsOnly) {
        if (problem?.isOpen) {
          markers.push(
            `<span class="ops-chip ops-chip--reception${problem.urgent ? ' is-urgent' : ''}" title="Reception"></span>`,
          );
          extras.push(problem.urgent ? 'nota reception urgente' : 'nota reception');
        }
        if (hk) {
          markers.push(`<span class="ops-chip ops-chip--hk${st.hkNoteUrgent ? ' is-urgent' : ''}" title="Nota HK"></span>`);
          extras.push('nota HK');
        }
        if (mgr) {
          markers.push(`<span class="ops-chip ops-chip--mgr${st.managerNoteUrgent ? ' is-urgent' : ''}" title="Manager"></span>`);
          extras.push('nota manager');
        }
      }
      // Puntini colazione solo in area Colazioni, non sulla griglia HK
      if (root.view === 'colazioni') {
        if (bf.tone === 'yes') {
          markers.push(`<span class="ops-chip ops-chip--bf" title="Colazione ${esc(bf.guests)}"></span>`);
          extras.push(`colazione ${bf.guests}`);
        } else if (bf.tone === 'no') {
          markers.push(`<span class="ops-chip ops-chip--bf-no" title="No colazione"></span>`);
          extras.push('no colazione');
        }
      }
      const ariaExtra = extras.length ? `, ${extras.join(', ')}` : '';
      const lampTone = blocked ? 'blocked' : clean ? 'ready' : 'dirty';
      const lamps = `
        <span class="ops-semaforo__lamp ops-semaforo__lamp--red" aria-hidden="true"></span>
        <span class="ops-semaforo__lamp ops-semaforo__lamp--amber" aria-hidden="true"></span>
        <span class="ops-semaforo__lamp ops-semaforo__lamp--green" aria-hidden="true"></span>
      `;
      /* Semaforo solo indicatore: il doppio tap è sull’intera card */
      const lamp = blocked
        ? `<span class="ops-semaforo ops-semaforo--blocked" title="Bloccata" role="img" aria-label="Bloccata">${lamps}</span>`
        : `<span class="ops-semaforo ops-semaforo--${lampTone}" aria-hidden="true">${lamps}</span>`;

      const ariaHint = blocked
        ? ''
        : '. Doppio tap per cambiare stato';
      return `
        <div class="ops-room ops-room--${tone} hk-card-touch-area" data-ops-room="${esc(sectionId)}:${esc(roomId)}" data-ops-sig="${esc(roomCardSig(st))}" tabindex="0" role="button" aria-label="Camera ${esc(roomLabel(sectionId, roomId))}, ${statusWord}${esc(ariaExtra)}${ariaHint}">
          <div class="ops-room__body">
            <span class="ops-room__num">${esc(roomLabel(sectionId, roomId))}</span>
            <span class="ops-room__status">${statusWord}</span>
            ${markers.length ? `<div class="ops-room__chips" aria-hidden="true">${markers.join('')}</div>` : ''}
          </div>
          ${lamp}
        </div>
      `;
    }

    function allColazioniRows() {
      const rows = [];
      for (const sec of root.sections) {
        for (const roomId of sec.rooms) {
          rows.push({
            sectionId: sec.id,
            roomId,
            hotel: sectionLabel(sec),
            state: root.rooms[roomKey(sec.id, roomId)] || {},
          });
        }
      }
      rows.sort((a, b) => {
        const h = a.hotel.localeCompare(b.hotel, 'it');
        if (h) return h;
        return String(a.roomId).localeCompare(String(b.roomId), 'it', { numeric: true });
      });
      return rows;
    }

    function renderColazioni() {
      const allRows = allColazioniRows();
      const q = root.bfQuery.trim().toLowerCase();
      // Filtri stato (Tutte/Da fare/Sì/No) rimossi: sempre elenco completo.
      root.bfFilter = 'all';
      const structureId = root.bfStructure && root.bfStructure !== 'all'
        ? String(root.bfStructure)
        : 'all';

      const matchesQuery = ({ sectionId, roomId, hotel, state }) => {
        if (!q) return true;
        const bf = breakfastInfo(state);
        const statusLabel =
          bf.tone === 'yes' ? 'sì si yes' : bf.tone === 'no' ? 'no' : 'da compilare da impostare da fare unset';
        const auto = boardPlanAutoLabel(state);
        const hay = [
          roomLabel(sectionId, roomId),
          hotel,
          statusLabel,
          bf.guests,
          state.breakfastDetail,
          state.breakfastSetBy,
          state.boardPlan,
          auto?.text,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      };

      const rowTone = (state) => {
        if (!state.breakfast) return 'unset';
        if (state.breakfast === 'yes') return 'yes';
        return 'no';
      };

      const sortRows = (list) =>
        [...list].sort((a, b) => {
          const h = a.hotel.localeCompare(b.hotel, 'it');
          if (h) return h;
          return String(a.roomId).localeCompare(String(b.roomId), 'it', { numeric: true });
        });

      const inStructure = allRows.filter((row) =>
        structureId === 'all' ? true : row.sectionId === structureId,
      );

      let guestsTotal = 0;
      let nUnset = 0;
      const searched = inStructure.filter(matchesQuery);
      for (const { state } of searched) {
        const tone = rowTone(state);
        if (tone === 'unset') nUnset += 1;
        if (tone !== 'yes') continue;
        const n = Number(state.breakfastGuests);
        if (Number.isFinite(n) && n > 0) guestsTotal += Math.round(n);
      }

      const sectionCounts = new Map();
      const sectionUnset = new Map();
      for (const row of allRows) {
        sectionCounts.set(row.sectionId, (sectionCounts.get(row.sectionId) || 0) + 1);
        if (rowTone(row.state) === 'unset') {
          sectionUnset.set(row.sectionId, (sectionUnset.get(row.sectionId) || 0) + 1);
        }
      }

      const structureTabs = [
        {
          id: 'all',
          full: 'Tutte',
          short: 'Tutte',
          count: allRows.length,
          draft: [...sectionUnset.values()].reduce((a, b) => a + b, 0),
        },
        ...root.sections.map((s) => ({
          id: s.id,
          full: sectionLabel(s),
          short: sectionLabelShort(s),
          count: sectionCounts.get(s.id) || 0,
          draft: sectionUnset.get(s.id) || 0,
        })),
      ]
        .map((s) => {
          const on = structureId === s.id;
          return `<button type="button" class="ops-sec-tab${on ? ' is-on' : ''}" data-bf-structure="${esc(s.id)}" role="tab" aria-selected="${on ? 'true' : 'false'}" title="${esc(s.full)}"><span class="ops-sec-tab__full">${esc(s.full)}</span><span class="ops-sec-tab__short">${esc(s.short)}</span></button>`;
        })
        .join('');

      const renderRow = ({ sectionId, roomId, hotel, state }) => {
        const tone = rowTone(state);
        const roomTxt = String(roomLabel(sectionId, roomId) || roomId || '—').trim();
        const n = Number(state.breakfastGuests);
        const guestsN = Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
        const auto = boardPlanAutoLabel(state);
        const key = `${sectionId}:${roomId}`;
        const hintKind = auto?.kind || (String(state.breakfastDetail || '').trim() ? 'note' : '');
        const hintText = auto
          ? esc(auto.text)
          : (String(state.breakfastDetail || '').trim()
            ? esc(String(state.breakfastDetail).trim().slice(0, 56))
            : '');
        return `
          <tr class="is-${tone}" data-bf-row="${esc(key)}">
            <td class="bf-td-room">
              <button type="button" class="bf-room" data-ops-open="${esc(sectionId)}:${esc(roomId)}" aria-label="Nota camera ${esc(roomTxt)}">
                <span class="bf-room__line">
                  <span class="bf-room__num">${esc(roomTxt)}</span>
                  <span class="bf-room__hotel">${esc(hotel)}</span>
                </span>
              </button>
              ${hintText ? `<span class="bf-room__hint${hintKind ? ` is-${hintKind}` : ''}" data-bf-hint>${hintText}</span>` : '<span class="bf-room__hint" data-bf-hint hidden></span>'}
            </td>
            <td class="bf-td-pax">
              <div class="bf-stepper" role="group" aria-label="Persone">
                <button type="button" class="bf-stepper__btn" data-bf-pax-delta="-1" data-bf-room="${esc(key)}" aria-label="Meno">−</button>
                <span class="bf-stepper__val">${guestsN}</span>
                <button type="button" class="bf-stepper__btn" data-bf-pax-delta="1" data-bf-room="${esc(key)}" aria-label="Più">+</button>
              </div>
            </td>
            <td class="bf-td-status">
              <div class="bf-toggle" role="group" aria-label="Colazione">
                <button type="button" class="bf-toggle__btn${tone === 'yes' ? ' is-on' : ''}" data-bf-status="yes" data-bf-room="${esc(key)}">Sì</button>
                <button type="button" class="bf-toggle__btn${tone === 'no' ? ' is-on is-no' : ''}" data-bf-status="no" data-bf-room="${esc(key)}">No</button>
              </div>
            </td>
          </tr>`;
      };

      const renderFeed = (rows, { emptyFiltered }) => {
        const sorted = sortRows(rows);
        if (sorted.length) {
          return `<div class="bf-wrap">
            <div class="bf-table-card colazioni-card-container">
              <table class="bf-table">
                <thead>
                  <tr>
                    <th class="bf-th-room" scope="col">Camera</th>
                    <th class="bf-th-pax" scope="col">Persone</th>
                    <th class="bf-th-status" scope="col">Colazione</th>
                  </tr>
                </thead>
                <tbody class="bf-rows">${sorted.map(renderRow).join('')}</tbody>
              </table>
            </div>
          </div>`;
        }
        const msg = emptyFiltered
          ? 'Nessuna camera trovata con questi filtri.'
          : 'Nessuna camera.';
        return `<div class="bf-wrap"><div class="bf-table-card colazioni-card-container"><p class="bf-empty">${msg}</p></div></div>`;
      };

      const pageDefs = [
        { id: 'all', label: 'Tutte', rows: allRows.filter(matchesQuery) },
        ...root.sections.map((s) => ({
          id: s.id,
          label: sectionLabel(s),
          rows: allRows.filter((r) => r.sectionId === s.id).filter(matchesQuery),
        })),
      ];

      const pagesHtml = pageDefs
        .map((p) => {
          const feed = renderFeed(p.rows, { emptyFiltered: Boolean(q) });
          return `<section class="ops-rooms-page" data-bf-page="${esc(p.id)}" aria-label="${esc(p.label)}">
            <div class="ops-bf-board">${feed}</div>
          </section>`;
        })
        .join('');

      const qEsc = esc(root.bfQuery || '');
      const dayLbl = formatBfDayLabel(root.opsDay || root.day || '');
      const unsetBit = nUnset > 0
        ? `<span class="bf-pax-badge__sub">${nUnset} da fare</span>`
        : '';
      const paxBadge = `
        <div class="bf-pax-badge${nUnset > 0 ? ' has-pending' : ''}" aria-label="Persone in colazione ${esc(dayLbl)}: ${guestsTotal}">
          <span class="bf-pax-badge__n" data-bf-pax-total>${guestsTotal}</span>
          <span class="bf-pax-badge__meta">
            <span class="bf-pax-badge__lbl">Persone</span>
            <span class="bf-pax-badge__day">${esc(dayLbl)}</span>
          </span>
          ${unsetBit}
        </div>`;

      // Stesso markup della barra Housekeeping (tabs + microstats).
      const filtersHtml = `
        <div class="ig-subbar-tabs-inner">
          <div class="ops-sec-tabs bf-structures" role="tablist" aria-label="Struttura">${structureTabs}</div>
          <p class="ops-stats-line" id="opsBfStats" aria-label="Persone in colazione ${esc(dayLbl)}"><strong data-bf-toolbar-total>${guestsTotal}</strong> pax · ${esc(dayLbl)}</p>
        </div>
      `;

      return {
        filtersHtml,
        boardHtml: `
        <div class="ops-bf-shell colazioni-page-wrapper">
          <div class="bf-command-bar bf-command-bar--top" aria-label="Comandi colazioni">
            <input type="search" class="bf-search-pill" data-bf-search placeholder="Cerca stanza o nome…" value="${qEsc}" autocomplete="off" enterkeyhint="search">
            ${paxBadge}
          </div>
          <div class="ops-bf-page">
            <div class="ops-rooms-pager" id="opsBfPager">${pagesHtml}</div>
          </div>
          <div class="bf-command-bar bf-command-bar--bottom" aria-label="Ricerca e totali">
            <input type="search" class="bf-search-pill" data-bf-search placeholder="Cerca stanza…" value="${qEsc}" autocomplete="off" enterkeyhint="search">
            ${paxBadge}
          </div>
        </div>
      `,
      };
    }

    function collectNotes() {
      const items = [];
      for (const sec of root.sections) {
        for (const roomId of sec.rooms) {
          const st = root.rooms[roomKey(sec.id, roomId)] || {};
          const base = {
            sectionId: sec.id,
            roomId,
            sectionLabel: sectionLabel(sec),
            roomLabel: roomLabel(sec.id, roomId),
          };
          const problem = receptionProblem(st);
          if (problem?.isOpen) {
            items.push({
              ...base,
              key: `${sec.id}:${roomId}:reception`,
              source: 'reception',
              text: problem.text,
              urgent: problem.urgent,
              author: problem.reportedBy,
            });
          }
          const hk = String(st.hkNote || '').trim();
          if (hk) {
            items.push({
              ...base,
              key: `${sec.id}:${roomId}:hk`,
              source: 'hk',
              text: hk,
              urgent: Boolean(st.hkNoteUrgent),
              author: st.hkNoteAuthor || '',
            });
          }
          const mgr = String(st.managerNote || '').trim();
          if (mgr) {
            items.push({
              ...base,
              key: `${sec.id}:${roomId}:manager`,
              source: 'manager',
              text: mgr,
              urgent: Boolean(st.managerNoteUrgent),
              author: st.managerNoteBy || '',
            });
          }
        }
      }
      for (const note of root.generalNotes || []) {
        if (!note || note.resolved) continue;
        const text = String(note.text || '').trim();
        if (!text) continue;
        items.push({
          key: `general:${note.id}`,
          id: note.id,
          isGeneral: true,
          source:
            note.authorRole === 'manager'
              ? 'manager'
              : note.authorRole === 'reception'
                ? 'reception'
                : 'hk',
          sectionLabel: 'Generale',
          roomLabel: 'Nota generale',
          text,
          urgent: Boolean(note.urgent),
          author: note.author || '',
        });
      }
      items.sort((a, b) => {
        const ua = a.urgent ? 1 : 0;
        const ub = b.urgent ? 1 : 0;
        if (ua !== ub) return ub - ua;
        return String(a.sectionLabel).localeCompare(String(b.sectionLabel), 'it');
      });
      return items;
    }

    function renderProblems() {
      const all = collectNotes();
      const q = root.notesQuery.trim().toLowerCase();
      const filtered = all.filter((n) => {
        if (!q) return true;
        const hay = `${n.roomLabel} ${n.sectionLabel} ${n.text} ${n.author}`.toLowerCase();
        return hay.includes(q);
      });

      const sourceLabel = (source) =>
        source === 'reception' ? 'Reception' : source === 'manager' ? 'Manager' : 'Pulizie';

      const list = filtered
        .map((n) => {
          const who = n.author
            ? `${sourceLabel(n.source)} · ${n.author}`
            : sourceLabel(n.source);
          const openAttr = n.isGeneral
            ? `data-ops-general="${esc(n.id)}"`
            : `data-ops-open="${esc(n.sectionId)}:${esc(n.roomId)}"`;
          const roomTxt = n.isGeneral ? '★' : String(n.roomLabel || '—').trim();
          const roomLong = !n.isGeneral && roomTxt.length >= 3 ? ' ops-note__room--long' : '';
          return `
            <li>
              <button type="button" class="ops-note ops-note--${esc(n.source)}${n.urgent ? ' is-urgent' : ''}" ${openAttr}>
                <span class="ops-note__room${roomLong}${n.isGeneral ? ' ops-note__room--gen' : ''}">${esc(roomTxt || '—')}</span>
                <span class="ops-note__body">
                  <span class="ops-note__top">
                    ${n.urgent ? '<span class="ops-note__urgent">Urgente</span>' : ''}
                    ${!n.isGeneral && n.sectionLabel ? `<span class="ops-note__hotel">${esc(n.sectionLabel)}</span>` : ''}
                    ${n.isGeneral ? '<span class="ops-note__hotel">Generale</span>' : ''}
                  </span>
                  <span class="ops-note__text">${esc(n.text)}</span>
                  <span class="ops-note__who">${esc(who)}</span>
                </span>
                <span class="ops-note__chevron" aria-hidden="true">›</span>
              </button>
            </li>`;
        })
        .join('');

      const empty = `
        <li class="ops-notes-empty">
          <div class="archive-empty">
            <p class="archive-empty-title">Nessuna nota aperta</p>
            <button type="button" class="btn-action btn-action-ghost" id="opsAddGeneralEmpty">+ Nota generale</button>
          </div>
        </li>`;

      return `
        <div class="ops-problems-shell">
          <div class="notes-toolbar-inline ops-notes-toolbar">
            <p class="notes-toolbar-hint">Problemi e avvisi sulle camere</p>
            <button type="button" class="btn-action btn-action-ghost ops-btn-add" id="opsAddGeneral">+ Nota generale</button>
          </div>
          <div class="ops-notes-scroll">
            <ul class="ops-notes-list">${list || empty}</ul>
          </div>
          <div class="footer-summary">
            <span>${filtered.length === 1
              ? '<strong>1</strong> nota in elenco'
              : `<strong>${filtered.length}</strong> note in elenco`}</span>
          </div>
        </div>
      `;
    }

    function bindRoomsPager(body) {
      const pager = body.querySelector('#opsRoomsPager');
      if (!pager) return;
      const pages = [...pager.querySelectorAll('[data-ops-page]')];
      if (!pages.length) return;

      const snapToActive = () => {
        const page = pager.querySelector(`[data-ops-page="${root.activeSection}"]`);
        if (page) pager.scrollLeft = page.offsetLeft;
      };
      snapToActive();
      requestAnimationFrame(() => {
        snapToActive();
        syncSecTabs(root.activeSection, { scrollTab: true, animateThumb: false });
      });

      let scrollTimer = 0;
      const onScrollEnd = () => {
        const mid = pager.scrollLeft + pager.clientWidth / 2;
        let best = pages[0];
        let bestDist = Infinity;
        for (const page of pages) {
          const center = page.offsetLeft + page.offsetWidth / 2;
          const dist = Math.abs(center - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = page;
          }
        }
        const id = best?.getAttribute('data-ops-page');
        if (id && id !== root.activeSection) {
          root.activeSection = id;
          syncSecTabs(id, { scrollTab: true, animateThumb: true });
        } else {
          syncSecTabs(root.activeSection, { scrollTab: false, animateThumb: true });
        }
      };

      pager.addEventListener(
        'scroll',
        () => {
          window.clearTimeout(scrollTimer);
          scrollTimer = window.setTimeout(onScrollEnd, 80);
        },
        { passive: true },
      );
    }

    function bindBfPager(body) {
      const pager = body.querySelector('#opsBfPager');
      if (!pager) return;
      const pages = [...pager.querySelectorAll('[data-bf-page]')];
      if (!pages.length) return;

      const activeId = root.bfStructure || 'all';
      const snapToActive = () => {
        const page = pager.querySelector(`[data-bf-page="${CSS.escape(activeId)}"]`);
        if (page) pager.scrollLeft = page.offsetLeft;
      };
      snapToActive();
      requestAnimationFrame(() => {
        snapToActive();
        syncBfTabs(root.bfStructure || 'all', { scrollTab: true });
      });

      let scrollTimer = 0;
      const onScrollEnd = () => {
        const mid = pager.scrollLeft + pager.clientWidth / 2;
        let best = pages[0];
        let bestDist = Infinity;
        for (const page of pages) {
          const center = page.offsetLeft + page.offsetWidth / 2;
          const dist = Math.abs(center - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = page;
          }
        }
        const id = best?.getAttribute('data-bf-page');
        if (id && id !== (root.bfStructure || 'all')) {
          root.bfStructure = id;
          syncBfTabs(id, { scrollTab: true });
        } else {
          syncBfTabs(root.bfStructure || 'all', { scrollTab: false });
        }
      };

      pager.addEventListener(
        'scroll',
        () => {
          window.clearTimeout(scrollTimer);
          scrollTimer = window.setTimeout(onScrollEnd, 80);
        },
        { passive: true },
      );
    }

    function bindBody(body) {
      bindSecTabClicks(body);
      bindRoomsPager(body);
      bindBfPager(body);
      bindRoomsCards(body);

      body.querySelectorAll('[data-ops-general]').forEach((btn) => {
        btn.addEventListener('click', () => {
          openGeneralSheet(btn.getAttribute('data-ops-general'));
        });
      });
      body.querySelectorAll('[data-ops-filter]').forEach((btn) => {
        btn.addEventListener('click', () => {
          root.notesFilter = btn.getAttribute('data-ops-filter') || 'all';
          paint();
        });
      });
      body.querySelectorAll('[data-bf-filter]').forEach((btn) => {
        btn.addEventListener('click', () => {
          applyBfFilter(btn.getAttribute('data-bf-filter') || 'all');
        });
      });
      body.querySelectorAll('[data-bf-structure]').forEach((btn) => {
        btn.addEventListener('click', () => {
          applyBfStructure(btn.getAttribute('data-bf-structure') || 'all');
        });
      });
      body.querySelectorAll('[data-bf-toggle]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const [sectionId, ...rest] = String(btn.getAttribute('data-bf-toggle') || '').split(':');
          const roomId = rest.join(':');
          void toggleBreakfastQuick(sectionId, roomId);
        });
      });
      body.querySelectorAll('[data-bf-pax-delta]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const delta = Number(btn.getAttribute('data-bf-pax-delta'));
          const [sectionId, ...rest] = String(btn.getAttribute('data-bf-room') || '').split(':');
          const roomId = rest.join(':');
          if (!sectionId || !roomId || !Number.isFinite(delta)) return;
          bumpBreakfastGuests(sectionId, roomId, delta);
        });
      });
      body.querySelectorAll('[data-bf-status]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const status = btn.getAttribute('data-bf-status');
          const [sectionId, ...rest] = String(btn.getAttribute('data-bf-room') || '').split(':');
          const roomId = rest.join(':');
          if (!sectionId || !roomId) return;
          setBreakfastStatus(sectionId, roomId, status);
        });
      });
      body.querySelectorAll('[data-ops-open]').forEach((btn) => {
        btn.onclick = () => {
          const [sectionId, ...rest] = String(btn.getAttribute('data-ops-open') || '').split(':');
          openRoomSheet(sectionId, rest.join(':'));
        };
      });
      body.querySelectorAll('[data-bf-search]').forEach((input) => {
        input.oninput = () => {
          const next = String(input.value || '');
          /* Sync twin search fields without stealing focus */
          body.querySelectorAll('[data-bf-search]').forEach((el) => {
            if (el !== input && el.value !== next) el.value = next;
          });
          setBfQuery(next);
        };
      });
      const openGeneral = () => openNewGeneralSheet();
      body.querySelector('#opsAddGeneral')?.addEventListener('click', openGeneral);
      body.querySelector('#opsAddGeneralEmpty')?.addEventListener('click', openGeneral);
    }

    let sheetCloseAbort = null;

    function closeSheet() {
      root.selected = null;
      if (sheetCloseAbort) {
        sheetCloseAbort.abort();
        sheetCloseAbort = null;
      }
      const { sheet, sheetBody } = els();
      const finish = () => {
        if (sheetBody) sheetBody.innerHTML = '';
        window.clearOpsIgSheetFooter?.();
        document.body.classList.remove('ops-sheet-open');
      };
      if (closeSheetUi) closeSheetUi(sheet, finish);
      else {
        sheet?.classList.add('hidden');
        if (sheet) {
          sheet.hidden = true;
          sheet.setAttribute('aria-hidden', 'true');
        }
        finish();
      }
    }

    function openSheet(title, html) {
      const { sheet, sheetBody, sheetTitle } = els();
      if (!sheet || !sheetBody) return;
      if (sheetCloseAbort) {
        sheetCloseAbort.abort();
        sheetCloseAbort = null;
      }
      if (sheetTitle) sheetTitle.textContent = title || 'Operazioni';
      sheetBody.innerHTML = html;
      window.hoistOpsIgSheetFooter?.();
      document.body.classList.add('ops-sheet-open');
      if (openSheetUi) openSheetUi(sheet);
      else {
        sheet.hidden = false;
        sheet.setAttribute('aria-hidden', 'false');
        sheet.classList.remove('hidden');
      }
      sheetCloseAbort = new AbortController();
      const { signal } = sheetCloseAbort;
      const bindClose = (el) => el?.addEventListener('click', closeSheet, { signal });
      bindClose(sheet.querySelector('[data-ops-close]'));
      bindClose(document.getElementById('opsIgSheetClose'));
      bindClose(document.getElementById('opsIgSheetCloseBg'));
    }

    function openRoomSheet(sectionId, roomId) {
      const st = root.rooms[roomKey(sectionId, roomId)] || {};
      const sec = root.sections.find((s) => s.id === sectionId);
      const problem = receptionProblem(st);
      const tone = st.blocked ? 'blocked' : st.status === 'clean' ? 'clean' : 'dirty';
      const statusText =
        tone === 'clean' ? 'Pronta' : tone === 'blocked' ? 'Bloccata' : 'Da rifare';
      const guestBits = [sectionLabel(sec), statusText];
      if (st.blocked && st.blockReason) guestBits.push(st.blockReason);
      root.selected = { type: 'room', sectionId, roomId };

      const bfChoice =
        st.breakfast === 'yes' || st.breakfast === 'no' ? st.breakfast : '';
      const bfGuests =
        st.breakfastGuests != null && Number(st.breakfastGuests) >= 1
          ? String(st.breakfastGuests)
          : '';
      const isColazioni = root.view === 'colazioni';
      const title = isColazioni
        ? `Colazione · ${roomLabel(sectionId, roomId)}`
        : `Camera ${roomLabel(sectionId, roomId)}`;

      const colazioneBlock = isColazioni
        ? `<section class="ops-bf-sheet-card" aria-label="Colazione">
            <p class="ops-bf-sheet-card__lead">Ha la colazione?</p>
            <div class="ops-bf-choice" id="opsBfSeg" role="group" aria-label="Ha la colazione?">
              <button type="button" class="ops-bf-choice__btn${bfChoice === 'yes' ? ' is-on' : ''}" data-bf-choice="yes">Sì</button>
              <button type="button" class="ops-bf-choice__btn${bfChoice === 'no' ? ' is-on' : ''}" data-bf-choice="no">No</button>
            </div>
            <div class="ops-bf-guests-slot${bfChoice === 'yes' ? '' : ' is-off'}" data-bf-guests-wrap aria-hidden="${bfChoice === 'yes' ? 'false' : 'true'}">
              <label class="sheet-field sheet-field--compact">
                <span class="sheet-label" id="lbl-ops-bf-guests" for="opsBfGuests">Nº ospiti</span>
                <input id="opsBfGuests" class="field field--compact" type="number" min="1" max="20" inputmode="numeric" value="${esc(bfGuests)}" placeholder="es. 2" autocomplete="off" ${bfChoice === 'yes' ? '' : 'disabled tabindex="-1"'}>
              </label>
            </div>
          </section>
          <section class="ops-bf-sheet-card ops-bf-sheet-card--muted" aria-label="Dettaglio">
            <label class="sheet-field sheet-field--compact">
              <span class="sheet-label" for="opsBfDetail">Nota <em>opzionale</em></span>
              <textarea id="opsBfDetail" class="field field--textarea field--compact" rows="2" placeholder="Allergie, orario, tavolo…">${esc(st.breakfastDetail || '')}</textarea>
            </label>
          </section>`
        : '';

      openSheet(title, `
        <form class="sheet-form sheet-form--flat sheet-form--ops-room${isColazioni ? ' is-bf' : ''}" id="opsRoomForm" onsubmit="return false;">
          <p class="ops-room-statusline">${esc(guestBits.filter(Boolean).join(' · '))}</p>

          ${colazioneBlock}

          ${
            isColazioni || roomsOnly
              ? ''
              : `<section class="sheet-section ops-room-block" aria-label="Nota camera">
            <div class="ops-room-block__head">
              <h3 class="sheet-section-head">Nota camera</h3>
              <label class="ops-check ops-check--inline">
                <input type="checkbox" id="opsProblemUrgent" ${problem?.urgent ? 'checked' : ''} />
                Urgente
              </label>
            </div>
            <div class="sheet-field">
              <label class="visually-hidden" id="lbl-ops-problem" for="opsProblemText">Nota sulla camera</label>
              <textarea id="opsProblemText" class="field field--textarea" rows="3" placeholder="Scrivi una nota sulla camera…">${esc(problem?.isOpen ? problem.text : '')}</textarea>
            </div>
            ${
              problem?.isOpen
                ? '<button type="button" class="ops-room-clear-note" id="opsClearProblem">Rimuovi nota</button>'
                : ''
            }
          </section>`
          }

          ${
            !isColazioni &&
            !roomsOnly &&
            (String(st.hkNote || '').trim() || String(st.managerNote || '').trim())
              ? `<section class="sheet-section ops-room-block ops-room-block--notes" aria-label="Note team">
                  ${
                    String(st.hkNote || '').trim()
                      ? `<div class="ops-room-note"><span class="ops-room-note__k">HK</span><p>${esc(st.hkNote)}</p></div>`
                      : ''
                  }
                  ${
                    String(st.managerNote || '').trim()
                      ? `<div class="ops-room-note"><span class="ops-room-note__k">Mgr</span><p>${esc(st.managerNote)}</p></div>`
                      : ''
                  }
                </section>`
              : ''
          }

          ${
            roomsOnly
              ? ''
              : `<div class="sheet-foot sheet-foot--minimal ops-room-foot">
            <button type="button" class="btn-primary" id="opsSaveRoom">Salva</button>
          </div>`
          }
        </form>
      `);

      const body = els().sheetBody;
      if (!body) return;

      const guestsWrap = body.querySelector('[data-bf-guests-wrap]');
      const guestsInput = body.querySelector('#opsBfGuests');
      const seg = body.querySelector('#opsBfSeg');
      const panel = body.closest('.sheet-panel');

      const shakePanel = () => {
        panel?.classList.add('ios-shake');
        window.setTimeout(() => panel?.classList.remove('ios-shake'), 420);
      };

      const clearBfErrors = () => {
        seg?.classList.remove('is-invalid');
        guestsInput?.classList.remove('is-invalid');
        body.querySelector('#lbl-ops-bf-guests')?.classList.remove('label-error-state');
      };

      const syncBfChoiceUi = (choice) => {
        clearBfErrors();
        body.querySelectorAll('[data-bf-choice]').forEach((btn) => {
          btn.classList.toggle('is-on', btn.getAttribute('data-bf-choice') === choice);
        });
        const on = choice === 'yes';
        if (guestsWrap) {
          guestsWrap.classList.toggle('is-off', !on);
          guestsWrap.setAttribute('aria-hidden', on ? 'false' : 'true');
        }
        if (guestsInput) {
          guestsInput.disabled = !on;
          if (on) guestsInput.removeAttribute('tabindex');
          else guestsInput.setAttribute('tabindex', '-1');
        }
      };

      body.querySelectorAll('[data-bf-choice]').forEach((btn) => {
        btn.addEventListener('click', () => {
          syncBfChoiceUi(btn.getAttribute('data-bf-choice'));
        });
      });

      const saveAll = async () => {
        const onBtn = body.querySelector('[data-bf-choice].is-on');
        const choice = onBtn?.getAttribute('data-bf-choice') || '';
        const patch = {};

        if (choice === 'yes' || choice === 'no') {
          patch.breakfast = choice;
          if (choice === 'yes') {
            const n = Number(guestsInput?.value);
            if (!Number.isInteger(n) || n < 1 || n > 20) {
              guestsInput?.classList.add('is-invalid');
              body.querySelector('#lbl-ops-bf-guests')?.classList.add('label-error-state');
              shakePanel();
              return;
            }
            patch.breakfastGuests = n;
          } else {
            patch.breakfastGuests = null;
          }
          patch.breakfastFirstDayOnly = false;
          patch.breakfastDetail = body.querySelector('#opsBfDetail')?.value || '';
        } else if (isColazioni) {
          seg?.classList.add('is-invalid');
          shakePanel();
          return;
        }

        if (!isColazioni && !roomsOnly) {
          patch.receptionProblem = body.querySelector('#opsProblemText')?.value || '';
          patch.receptionProblemUrgent = Boolean(body.querySelector('#opsProblemUrgent')?.checked);
        }

        if (roomsOnly && !isColazioni && !Object.keys(patch).length) {
          closeSheet();
          return;
        }

        await saveRoomPatch(sectionId, roomId, patch);
      };

      body.querySelector('#opsSaveRoom')?.addEventListener('click', saveAll);
      if (!roomsOnly) {
        body.querySelector('#opsClearProblem')?.addEventListener('click', async () => {
          await saveRoomPatch(sectionId, roomId, { receptionProblem: '' });
        });
      }
      guestsInput?.addEventListener('input', clearBfErrors);
    }

    function openNewGeneralSheet() {
      root.selected = { type: 'general-new' };
      openSheet('Nuova nota generale', `
        <form class="sheet-form sheet-form--flat" onsubmit="return false;">
          <div class="sheet-field">
            <label class="sheet-label" id="lbl-ops-gen" for="opsGenText">Nota *</label>
            <textarea id="opsGenText" class="field field--textarea" rows="4" placeholder="Nota per tutto il team…"></textarea>
          </div>
          <label class="ops-check"><input type="checkbox" id="opsGenUrgent" /> Urgente</label>
          <p class="settings-lead">Pubblicata a nome di chi è collegato.</p>
          <div class="sheet-foot sheet-foot--minimal">
            <button type="button" class="btn-primary" id="opsSaveGen">Pubblica</button>
          </div>
        </form>
      `);
      const body = els().sheetBody;
      const clearGenError = () => {
        body?.querySelector('#opsGenText')?.classList.remove('is-invalid');
        body?.querySelector('#lbl-ops-gen')?.classList.remove('label-error-state');
      };
      body?.querySelector('#opsGenText')?.addEventListener('input', clearGenError);
      body?.querySelector('#opsSaveGen')?.addEventListener('click', async () => {
        const textEl = body.querySelector('#opsGenText');
        const text = String(textEl?.value || '').trim();
        if (!text) {
          textEl?.classList.add('is-invalid');
          body.querySelector('#lbl-ops-gen')?.classList.add('label-error-state');
          body.closest('.sheet-panel')?.classList.add('ios-shake');
          window.setTimeout(() => body.closest('.sheet-panel')?.classList.remove('ios-shake'), 420);
          return;
        }
        try {
          await api('/api/staff/ops/general-notes', {
            method: 'POST',
            body: {
              text,
              urgent: Boolean(body.querySelector('#opsGenUrgent')?.checked),
            },
          });
          closeSheet();
          await refresh({ silent: true });
        } catch (err) {
          showToast?.(err.message || 'Salvataggio non riuscito.', true);
        }
      });
    }

    function openGeneralSheet(id) {
      const note = (root.generalNotes || []).find((n) => String(n.id) === String(id));
      if (!note) return;
      root.selected = { type: 'general', id };
      openSheet('Nota generale', `
        <div class="sheet-form sheet-form--flat">
          <p class="sheet-guest-line">${esc(note.author || 'Team')}${note.urgent ? ' · Urgente' : ''}</p>
          <p class="ops-sheet__readonly">${esc(note.text)}</p>
          <div class="sheet-foot sheet-foot--minimal">
            <button type="button" class="btn-action" id="opsDeleteGen">Elimina nota</button>
          </div>
        </div>
      `);
      els().sheetBody?.querySelector('#opsDeleteGen')?.addEventListener('click', async () => {
        try {
          await api(`/api/staff/ops/general-notes/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: { delete: true },
          });
          closeSheet();
          await refresh({ silent: true });
        } catch (err) {
          showToast?.(err.message || 'Eliminazione non riuscita.', true);
        }
      });
    }

    async function saveRoomPatch(sectionId, roomId, patch, opts = {}) {
      const key = roomKey(sectionId, roomId);
      try {
        const data = await api(
          `${roomPatchPath}/${encodeURIComponent(sectionId)}/${encodeURIComponent(roomId)}`,
          { method: 'PATCH', body: patch },
        );
        if (data.room) {
          root.rooms[key] = data.room;
        }
        if (data.version != null) root.version = data.version;
        if (!opts.keepOpen) closeSheet();
        if (root.view === 'rooms' && paintRoomCard(sectionId, roomId)) {
          softUpdateHkToolbar();
        } else if (root.view === 'colazioni' && paintBreakfastRow(key)) {
          refreshBreakfastToolbarFromState();
        } else if (root.view === 'problems') {
          paint();
        } else {
          paint();
        }
      } catch (err) {
        showToast?.(err.message || 'Salvataggio non riuscito.', true);
      }
    }

    async function toggleRoomStatus(sectionId, roomId) {
      const key = roomKey(sectionId, roomId);
      const st = root.rooms[key] || {};
      if (st.blocked) return;
      const next = st.status === 'clean' ? 'dirty' : 'clean';
      const prev = { ...st };
      root.rooms[key] = { ...st, status: next };
      if (root.view === 'rooms') {
        paintRoomCard(sectionId, roomId);
        softUpdateHkToolbar();
        flashRoomToggle(sectionId, roomId, next === 'clean');
      }
      try {
        const data = await api(
          `${roomPatchPath}/${encodeURIComponent(sectionId)}/${encodeURIComponent(roomId)}`,
          { method: 'PATCH', body: { status: next } },
        );
        if (data.room) root.rooms[key] = data.room;
        if (data.version != null) root.version = data.version;
        if (root.view === 'rooms') {
          paintRoomCard(sectionId, roomId);
          softUpdateHkToolbar();
        } else {
          paint();
        }
      } catch (err) {
        root.rooms[key] = prev;
        if (root.view === 'rooms') {
          paintRoomCard(sectionId, roomId);
          softUpdateHkToolbar();
        }
        showToast?.(err.message || 'Salvataggio non riuscito.', true);
      }
    }

    function flashRoomToggle(sectionId, roomId, becameClean) {
      if (!roomsOnly) return;
      const { body } = els();
      const el = body?.querySelector(`[data-ops-room="${CSS.escape(roomKey(sectionId, roomId))}"]`);
      if (!el) return;
      el.classList.remove('is-hk-flash');
      void el.offsetWidth;
      el.classList.add('is-hk-flash');
      el.setAttribute('data-hk-flash', becameClean ? 'clean' : 'dirty');
      clearTimeout(el._hkFlashTm);
      el._hkFlashTm = setTimeout(() => {
        el.classList.remove('is-hk-flash');
        el.removeAttribute('data-hk-flash');
      }, 340);
    }

    function setNotesQuery(q) {
      const next = String(q || '');
      if (root.notesQuery === next) return;
      root.notesQuery = next;
      if (root.view === 'problems') paint();
    }

    function setBfQuery(q) {
      const next = String(q || '');
      if (root.bfQuery === next) return;
      root.bfQuery = next;
      if (root.view !== 'colazioni') return;
      const active = document.activeElement;
      const isSearch = Boolean(active?.matches?.('[data-bf-search]'));
      const whichBar = active?.closest?.('.bf-command-bar--bottom')
        ? 'bottom'
        : 'top';
      const selStart = isSearch ? active.selectionStart : null;
      const selEnd = isSearch ? active.selectionEnd : null;
      paint();
      if (!isSearch) return;
      requestAnimationFrame(() => {
        const { body } = els();
        const sel =
          whichBar === 'bottom'
            ? body?.querySelector('.bf-command-bar--bottom [data-bf-search]')
            : body?.querySelector('.bf-command-bar--top [data-bf-search]');
        if (!sel) return;
        sel.focus();
        try {
          if (selStart != null) sel.setSelectionRange(selStart, selEnd ?? selStart);
        } catch (_) { /* ignore */ }
      });
    }

    return {
      load,
      refresh,
      prefetch,
      setView,
      deactivate,
      resumePoll: startPoll,
      ensureHkToolbar,
      showEmpty,
      closeSheet,
      setNotesQuery,
      setBfQuery,
      hasData() {
        return Array.isArray(root.sections) && root.sections.length > 0;
      },
      get view() {
        return root.view;
      },
      getSections() {
        return Array.isArray(root.sections) ? root.sections.slice() : [];
      },
      getActiveSectionId() {
        return root.activeSection || root.sections?.[0]?.id || null;
      },
    };
  }

  window.StaffOps = { create: createOpsUi };
})();
