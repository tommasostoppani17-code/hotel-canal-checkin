/**
 * Riva OS — navigazione tastiera stile Excel
 * 1) Cassa / importi: focus + select su .riva-field-input[data-row][data-col]
 * 2) Planning mese: .is-focused-day su .rack-day-slot
 */
(function () {
  'use strict';

  const CASSA_SEL = 'input.riva-field-input[data-row][data-col]';
  const SLOT_SEL = '.rack-day-slot[data-row][data-col]';
  const DBL_FOCUS = 'is-focused-day';

  function parseCoord(el, name) {
    const n = Number.parseInt(el?.getAttribute?.(name) || '', 10);
    return Number.isFinite(n) ? n : NaN;
  }

  function tagCassaFields(root) {
    const scope = root || document;
    scope.querySelectorAll('.cassa-inputs-group').forEach((group) => {
      const inputs = [...group.querySelectorAll('input.field, input.riva-field-input')].filter(
        (el) => el.type !== 'hidden' && el.type !== 'checkbox' && el.type !== 'radio' && !el.disabled,
      );
      if (!inputs.length) return;
      inputs.forEach((input) => input.classList.add('riva-field-input'));

      /* Riga orizzontale (Totale | Tassa): stessa data-row, col 0..n */
      if (
        group.classList.contains('mc-row') ||
        group.classList.contains('mc-row--2') ||
        group.classList.contains('sheet-row-2')
      ) {
        inputs.forEach((input, c) => {
          input.setAttribute('data-row', '0');
          input.setAttribute('data-col', String(c));
        });
        return;
      }

      /* Stack verticale: una colonna */
      inputs.forEach((input, r) => {
        input.setAttribute('data-row', String(r));
        input.setAttribute('data-col', '0');
      });
    });
  }

  function focusCassaInput(input) {
    if (!input || input.disabled || input.readOnly) return false;
    input.focus();
    try {
      input.select();
    } catch (_) {
      /* ignore */
    }
    return true;
  }

  /** Dopo apertura sheet / chiusura turno: ritagga coordinate e prepara focus Excel. */
  function refreshCassaAfterOpen(root) {
    tagCassaFields(root || document);
  }

  function initCassaExcelMovement() {
    if (document.documentElement.dataset.cassaExcelBound === '1') {
      tagCassaFields(document);
      return;
    }
    document.documentElement.dataset.cassaExcelBound = '1';
    tagCassaFields(document);

    document.addEventListener(
      'keydown',
      (event) => {
        const activeInput = document.activeElement;
        if (!activeInput || !activeInput.classList?.contains('riva-field-input')) return;
        if (!activeInput.hasAttribute('data-row')) return;

        const row = parseCoord(activeInput, 'data-row');
        const col = parseCoord(activeInput, 'data-col');
        if (Number.isNaN(row) || Number.isNaN(col)) return;

        let targetRow = row;
        let targetCol = col;
        let handleMovement = false;

        switch (event.key) {
          case 'ArrowUp':
            targetRow = row - 1;
            handleMovement = true;
            event.preventDefault();
            break;
          case 'ArrowDown':
          case 'Enter':
            targetRow = row + 1;
            handleMovement = true;
            event.preventDefault();
            break;
          case 'Tab':
            targetCol = event.shiftKey ? col - 1 : col + 1;
            handleMovement = true;
            event.preventDefault();
            break;
          case 'ArrowLeft':
            if (activeInput.selectionStart === 0) {
              targetCol = col - 1;
              handleMovement = true;
              event.preventDefault();
            }
            break;
          case 'ArrowRight': {
            const len = String(activeInput.value || '').length;
            if (activeInput.selectionEnd === len) {
              targetCol = col + 1;
              handleMovement = true;
              event.preventDefault();
            }
            break;
          }
          default:
            return;
        }

        if (!handleMovement) return;
        const nextCell = document.querySelector(
          `${CASSA_SEL}[data-row="${targetRow}"][data-col="${targetCol}"]`,
        );
        if (!nextCell || nextCell.disabled || nextCell.readOnly) return;
        focusCassaInput(nextCell);
      },
      true,
    );

    /* Retag + select-all stile Excel al focus su cella cassa */
    document.addEventListener(
      'focusin',
      (e) => {
        const t = e.target;
        if (!(t instanceof HTMLInputElement)) return;
        const group = t.closest('.cassa-inputs-group');
        if (!group) return;
        tagCassaFields(group.parentElement || document);
        if (!t.classList.contains('riva-field-input') || !t.hasAttribute('data-row')) return;
        requestAnimationFrame(() => {
          if (document.activeElement === t) {
            try {
              t.select();
            } catch (_) {
              /* ignore */
            }
          }
        });
      },
      true,
    );
  }

  function clearFocusedDay(root) {
    (root || document).querySelectorAll(`.${DBL_FOCUS}`).forEach((el) => {
      el.classList.remove(DBL_FOCUS);
      el.removeAttribute('aria-selected');
    });
  }

  function focusDaySlot(slot) {
    if (!slot) return;
    const frame = slot.closest('.rack-frame') || document.getElementById('rackFrame');
    clearFocusedDay(frame);
    slot.classList.add(DBL_FOCUS);
    slot.setAttribute('aria-selected', 'true');
    try {
      slot.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    } catch (_) {
      /* ignore */
    }
  }

  function activateDaySlot(slot) {
    if (!slot) return;
    const track = slot.closest('.rack-row-track');
    const row = slot.closest('.rack-row[data-room-key]');
    const ymd = slot.getAttribute('data-ymd') || '';
    const roomKey = row?.getAttribute('data-room-key') || slot.getAttribute('data-room-key') || '';
    if (typeof window.openRackContextMenu === 'function' && track) {
      const rect = slot.getBoundingClientRect();
      window.openRackContextMenu(
        track,
        { ymd, roomKey },
        { clickMode: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 },
      );
      return;
    }
    slot.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }

  function initPlanningMatrixMovement() {
    const frame = document.getElementById('rackFrame');
    const scroll = document.getElementById('rackScroll');
    if (!frame || !scroll) return;
    if (frame.dataset.matrixNavBound === '1') return;
    frame.dataset.matrixNavBound = '1';
    frame.setAttribute('tabindex', '0');
    frame.style.outline = 'none';
    frame.setAttribute('role', 'grid');

    frame.addEventListener('focusin', () => {
      if (!frame.querySelector(`.${DBL_FOCUS}`)) {
        const first = frame.querySelector(SLOT_SEL);
        if (first) focusDaySlot(first);
      }
    });

    /* Click su slot → focus cella (senza aprire menu: lo fa già il context/long-press) */
    frame.addEventListener(
      'pointerdown',
      (e) => {
        const slot = e.target?.closest?.(SLOT_SEL);
        if (!slot || !frame.contains(slot)) return;
        focusDaySlot(slot);
      },
      true,
    );

    window.addEventListener(
      'keydown',
      (event) => {
        const holdsOn = typeof window.activeView === 'string'
          ? window.activeView === 'holds'
          : Boolean(document.querySelector('.workspace.is-holds'));
        if (!holdsOn) return;

        const typing = event.target?.closest?.('input, textarea, select, [contenteditable="true"]');
        if (typing) return;
        if (document.querySelector('.sheet.sheet--ig:not([hidden])')) return;

        let current = frame.querySelector(`.${DBL_FOCUS}`);
        if (!current) {
          if (
            event.key !== 'ArrowUp' &&
            event.key !== 'ArrowDown' &&
            event.key !== 'ArrowLeft' &&
            event.key !== 'ArrowRight' &&
            event.key !== 'Enter'
          ) {
            return;
          }
          current = frame.querySelector(SLOT_SEL);
          if (current) {
            focusDaySlot(current);
            event.preventDefault();
            event.stopPropagation();
          }
          return;
        }

        const row = parseCoord(current, 'data-row');
        const col = parseCoord(current, 'data-col');
        if (Number.isNaN(row) || Number.isNaN(col)) return;

        let targetRow = row;
        let targetCol = col;
        let triggerAction = false;
        let isNavKey = true;

        switch (event.key) {
          case 'ArrowUp':
            targetRow = row - 1;
            event.preventDefault();
            event.stopPropagation();
            break;
          case 'ArrowDown':
            targetRow = row + 1;
            event.preventDefault();
            event.stopPropagation();
            break;
          case 'ArrowLeft':
            targetCol = col - 1;
            event.preventDefault();
            event.stopPropagation();
            break;
          case 'ArrowRight':
            targetCol = col + 1;
            event.preventDefault();
            event.stopPropagation();
            break;
          case 'Enter':
            triggerAction = true;
            event.preventDefault();
            event.stopPropagation();
            break;
          default:
            isNavKey = false;
            return;
        }

        if (isNavKey && !triggerAction) {
          const next = frame.querySelector(
            `${SLOT_SEL}[data-row="${targetRow}"][data-col="${targetCol}"]`,
          );
          if (next) {
            focusDaySlot(next);
            try {
              frame.focus({ preventScroll: true });
            } catch (_) {
              frame.focus();
            }
          }
          return;
        }

        if (triggerAction) activateDaySlot(current);
      },
      true,
    );
  }

  /** Chiamato dopo ogni renderHolds per ri-agganciar e focus. */
  function refreshPlanningMatrixAfterRender() {
    const frame = document.getElementById('rackFrame');
    if (!frame) return;
    initPlanningMatrixMovement();
    const prev = frame.querySelector(`.${DBL_FOCUS}`);
    if (prev && !prev.isConnected) clearFocusedDay(frame);
  }

  window.RivaExcelNav = {
    initCassaExcelMovement,
    initPlanningMatrixMovement,
    tagCassaFields,
    refreshCassaAfterOpen,
    refreshPlanningMatrixAfterRender,
    focusCassaInput,
    focusDaySlot,
    clearFocusedDay,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initCassaExcelMovement();
      initPlanningMatrixMovement();
    });
  } else {
    initCassaExcelMovement();
    initPlanningMatrixMovement();
  }
})();
