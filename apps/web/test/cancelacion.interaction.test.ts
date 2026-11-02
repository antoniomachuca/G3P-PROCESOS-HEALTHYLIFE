import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { BotonCancelarInscripcion, type BotonCancelarInscripcionProps } from '../src/components/BotonCancelarInscripcion';
import { ModalConfirmacionCancelacion } from '../src/components/ModalConfirmacionCancelacion';
import { eventoYaIniciado } from '../src/cancelacion';

/**
 * Lightweight React Hook dispatcher test harness to inspect functional component lifecycle
 * and state transitions deterministically without external test runner bloat.
 */
function createComponentHarness<P>(
  Component: (props: P) => React.ReactElement,
  initialProps: P
) {
  let stateStore: any[] = [];
  let stateIndex = 0;
  let effectCleanups: (() => void)[] = [];

  const dispatcher = {
    useState: <T>(initialValue: T | (() => T)): [T, (action: T | ((prev: T) => T)) => void] => {
      const currentIndex = stateIndex++;
      if (currentIndex >= stateStore.length) {
        stateStore.push(typeof initialValue === 'function' ? (initialValue as any)() : initialValue);
      }
      const setState = (action: T | ((prev: T) => T)) => {
        stateStore[currentIndex] = typeof action === 'function' ? (action as any)(stateStore[currentIndex]) : action;
      };
      return [stateStore[currentIndex], setState];
    },
    useEffect: (effect: () => void | (() => void), deps?: React.DependencyList) => {
      const cleanup = effect();
      if (typeof cleanup === 'function') {
        effectCleanups.push(cleanup);
      }
    },
    useMemo: <T>(factory: () => T) => factory(),
    useCallback: <T extends (...args: any[]) => any>(callback: T) => callback,
    useRef: <T>(initial: T) => ({ current: initial }),
  };

  let currentProps = initialProps;

  function render(nextProps?: P) {
    if (nextProps) currentProps = nextProps;
    stateIndex = 0;
    const cleanupsToRun = effectCleanups;
    effectCleanups = [];
    cleanupsToRun.forEach((c) => c());

    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;
    return Component(currentProps);
  }

  function unmount() {
    effectCleanups.forEach((c) => c());
    effectCleanups = [];
  }

  return {
    render,
    unmount,
    getState: (index = 0) => stateStore[index],
  };
}

describe('CHALLENGER 2 SUITE: UI Interaction, State Isolation & Component Lifecycle', () => {
  const FECHA_REF = new Date('2026-10-31T12:00:00.000Z');

  describe('1. Repeated clicks on disabled button: modal must NEVER open', () => {
    it('under 100 rapid click events on past event, modal state remains strictly false', () => {
      const pastProps: BotonCancelarInscripcionProps = {
        eventoId: 'evt_past_999',
        inicioIso: '2026-10-30T10:00:00.000Z',
        tituloEvento: 'Evento Pasado',
        fechaReferencia: FECHA_REF,
      };

      const harness = createComponentHarness(BotonCancelarInscripcion, pastProps);
      let vdom = harness.render();

      const buttonElement = vdom.props.children[0];
      assert.equal(buttonElement.props.disabled, true, 'HTML button must have disabled=true');
      assert.equal(buttonElement.props['aria-disabled'], true, 'HTML button must have aria-disabled=true');

      // Attempt 100 rapid sequential clicks
      for (let i = 0; i < 100; i++) {
        buttonElement.props.onClick();
        assert.equal(harness.getState(0), false, `Modal state must stay false after click #${i + 1}`);
      }

      // Re-render and verify modal element props
      vdom = harness.render();
      const modalElement = vdom.props.children[2];
      assert.equal(modalElement.props.abierto, false, 'Modal isOpen prop must remain false');
    });

    it('under 100 rapid click events on an event that coincides with current time, modal never opens', () => {
      const exactProps: BotonCancelarInscripcionProps = {
        eventoId: 'evt_exact_001',
        inicioIso: FECHA_REF.toISOString(),
        tituloEvento: 'Evento En Punto',
        fechaReferencia: FECHA_REF,
      };

      const harness = createComponentHarness(BotonCancelarInscripcion, exactProps);
      const vdom = harness.render();
      const button = vdom.props.children[0];

      for (let i = 0; i < 100; i++) {
        button.props.onClick();
        assert.equal(harness.getState(0), false, 'Modal must never open when event starts right now');
      }
    });
  });

  describe('2. Repeated opens and discards: modal opens, closes, and cleans up state properly', () => {
    it('cycles through 25 repeated open-discard sequences cleanly without state drift or memory leakage', () => {
      let cancelConfirmCalls = 0;
      const futureProps: BotonCancelarInscripcionProps = {
        eventoId: 'evt_future_001',
        inicioIso: '2026-11-15T10:00:00.000Z',
        tituloEvento: 'Pádel Avanzado',
        fechaReferencia: FECHA_REF,
        onConfirmarCancelacion: () => {
          cancelConfirmCalls++;
        },
      };

      const harness = createComponentHarness(BotonCancelarInscripcion, futureProps);

      for (let cycle = 1; cycle <= 25; cycle++) {
        // Initial state before click
        let vdom = harness.render();
        assert.equal(harness.getState(0), false, `Cycle ${cycle}: initial modal state must be closed`);

        // Click button to open modal
        const button = vdom.props.children[0];
        button.props.onClick();
        assert.equal(harness.getState(0), true, `Cycle ${cycle}: modal must be open after button click`);

        // Re-render to propagate open state
        vdom = harness.render();
        const modal = vdom.props.children[2];
        assert.equal(modal.props.abierto, true, `Cycle ${cycle}: modal element abierto prop must be true`);

        // Click discard
        modal.props.onDescartar();
        assert.equal(harness.getState(0), false, `Cycle ${cycle}: modal must close after discard`);

        // Re-render to propagate closed state
        vdom = harness.render();
        const modalClosed = vdom.props.children[2];
        assert.equal(modalClosed.props.abierto, false, `Cycle ${cycle}: modal element abierto prop must be false`);

        // Confirm callback was NEVER called during discards
        assert.equal(cancelConfirmCalls, 0, `Cycle ${cycle}: discard must never trigger onConfirmarCancelacion`);
      }
    });
  });

  describe('3. Confirming cancellation: calls onConfirmarCancelacion with correct eventoId and closes modal', () => {
    it('invokes callback with exact eventoId and transitions modal back to closed', () => {
      const receivedIds: string[] = [];
      const props: BotonCancelarInscripcionProps = {
        eventoId: 'evt_stress_777',
        inicioIso: '2026-12-01T12:00:00.000Z',
        tituloEvento: 'Fútbol Sala Torneo',
        fechaReferencia: FECHA_REF,
        onConfirmarCancelacion: (id) => receivedIds.push(id),
      };

      const harness = createComponentHarness(BotonCancelarInscripcion, props);
      let vdom = harness.render();

      // Open modal
      vdom.props.children[0].props.onClick();
      assert.equal(harness.getState(0), true);

      // Re-render
      vdom = harness.render();
      const modal = vdom.props.children[2];

      // Confirm
      modal.props.onConfirmar();
      assert.equal(harness.getState(0), false, 'Modal state must transition to false upon confirmation');
      assert.deepEqual(receivedIds, ['evt_stress_777'], 'Must have passed exact eventoId to callback');

      // Subsequent clicks should be able to open again if needed
      vdom = harness.render();
      vdom.props.children[0].props.onClick();
      assert.equal(harness.getState(0), true);
    });
  });

  describe('4. Props optionality and graceful fallback when callbacks are omitted', () => {
    it('does not throw when onConfirmarCancelacion is undefined and confirm is clicked', () => {
      const minimalProps: BotonCancelarInscripcionProps = {
        eventoId: 'evt_no_callback',
        inicioIso: '2026-11-20T10:00:00.000Z',
        tituloEvento: 'Natación Libre',
        fechaReferencia: FECHA_REF,
      };

      const harness = createComponentHarness(BotonCancelarInscripcion, minimalProps);
      let vdom = harness.render();

      // Open
      vdom.props.children[0].props.onClick();
      assert.equal(harness.getState(0), true);

      // Re-render and confirm with no callback
      vdom = harness.render();
      const modal = vdom.props.children[2];

      assert.doesNotThrow(() => {
        modal.props.onConfirmar();
      }, 'Clicking confirm with undefined callback must not crash');

      assert.equal(harness.getState(0), false, 'Modal should still close normally');
    });

    it('defaults optional props sensibly (textoBoton, className)', () => {
      const minimalProps: BotonCancelarInscripcionProps = {
        eventoId: 'evt_defaults',
        inicioIso: '2026-11-20T10:00:00.000Z',
        tituloEvento: 'Natación Libre',
        fechaReferencia: FECHA_REF,
      };

      const harness = createComponentHarness(BotonCancelarInscripcion, minimalProps);
      const vdom = harness.render();
      const button = vdom.props.children[0];

      assert.equal(button.props.children, 'Cancelar inscripción');
      assert.equal(button.props.className, 'boton boton--cancelar');
    });

    it('applies custom className and custom textoBoton when provided', () => {
      const customProps: BotonCancelarInscripcionProps = {
        eventoId: 'evt_custom',
        inicioIso: '2026-11-20T10:00:00.000Z',
        tituloEvento: 'Natación Libre',
        textoBoton: 'Darme de baja',
        className: 'extra-custom-class',
        fechaReferencia: FECHA_REF,
      };

      const harness = createComponentHarness(BotonCancelarInscripcion, customProps);
      const vdom = harness.render();
      const button = vdom.props.children[0];

      assert.equal(button.props.children, 'Darme de baja');
      assert.equal(button.props.className, 'boton boton--cancelar extra-custom-class');
    });
  });

  describe('5. ModalConfirmacionCancelacion Lifecycle and Keyboard/Backdrop Event Isolation', () => {
    it('manages keydown event listeners on window cleanly when open and cleans up on unmount or close', () => {
      const windowListeners: Record<string, ((e: any) => void)[]> = {};

      const mockWindow = {
        addEventListener: (event: string, fn: (e: any) => void) => {
          if (!windowListeners[event]) windowListeners[event] = [];
          windowListeners[event].push(fn);
        },
        removeEventListener: (event: string, fn: (e: any) => void) => {
          if (!windowListeners[event]) return;
          windowListeners[event] = windowListeners[event].filter((cb) => cb !== fn);
        },
      };

      // Set global window mock
      (globalThis as any).window = mockWindow;

      try {
        let discardCalled = 0;
        let confirmCalled = 0;

        // When abierto is false:
        const harnessClosed = createComponentHarness(ModalConfirmacionCancelacion, {
          abierto: false,
          tituloEvento: 'Evento Test',
          onDescartar: () => discardCalled++,
          onConfirmar: () => confirmCalled++,
        });

        const vdomClosed = harnessClosed.render();
        assert.equal(vdomClosed, null, 'Modal must return null when abierto=false');
        assert.equal(windowListeners['keydown']?.length || 0, 0, 'No keydown listener registered when modal is closed');

        // When abierto is true:
        const harnessOpen = createComponentHarness(ModalConfirmacionCancelacion, {
          abierto: true,
          tituloEvento: 'Evento Test',
          onDescartar: () => discardCalled++,
          onConfirmar: () => confirmCalled++,
        });

        const vdomOpen = harnessOpen.render();
        assert.ok(vdomOpen !== null, 'Modal must return element when abierto=true');
        assert.equal(windowListeners['keydown']?.length, 1, 'Exactly one keydown listener registered when open');

        // Press Non-Escape key (e.g. Enter or Tab)
        windowListeners['keydown'][0]({ key: 'Enter' });
        assert.equal(discardCalled, 0, 'Non-Escape key must not trigger discard');

        // Press Escape key
        windowListeners['keydown'][0]({ key: 'Escape' });
        assert.equal(discardCalled, 1, 'Escape key must trigger onDescartar');

        // Backdrop click
        const backdrop = vdomOpen;
        assert.equal(backdrop.props.className, 'modal-telon');
        backdrop.props.onClick();
        assert.equal(discardCalled, 2, 'Backdrop click must trigger onDescartar');

        // Dialog stopPropagation
        const dialog = backdrop.props.children;
        let propagationStopped = false;
        dialog.props.onClick({
          stopPropagation: () => {
            propagationStopped = true;
          },
        });
        assert.equal(propagationStopped, true, 'Clicking inside modal dialog must stop propagation');

        // Action buttons inside modal
        const actionsContainer = dialog.props.children[3];
        const discardBtn = actionsContainer.props.children[0];
        const confirmBtn = actionsContainer.props.children[1];

        discardBtn.props.onClick();
        assert.equal(discardCalled, 3, 'Discard button click must trigger onDescartar');

        confirmBtn.props.onClick();
        assert.equal(confirmCalled, 1, 'Confirm button click must trigger onConfirmar');

        // Unmount / cleanup verification
        harnessOpen.unmount();
        assert.equal(
          windowListeners['keydown']?.length,
          0,
          'Listener must be completely removed from window after unmount'
        );
      } finally {
        delete (globalThis as any).window;
      }
    });
  });

  describe('6. Edge-Case Date Boundary Stress Tests', () => {
    it('blocks exactly at boundary t = 0 ms', () => {
      const now = new Date('2026-10-31T12:00:00.000Z');
      assert.equal(eventoYaIniciado('2026-10-31T12:00:00.000Z', now), true);
    });

    it('allows when start is +1 ms in future', () => {
      const now = new Date('2026-10-31T12:00:00.000Z');
      assert.equal(eventoYaIniciado('2026-10-31T12:00:00.001Z', now), false);
    });

    it('blocks when start is -1 ms in past', () => {
      const now = new Date('2026-10-31T12:00:00.000Z');
      assert.equal(eventoYaIniciado('2026-10-31T11:59:59.999Z', now), true);
    });

    it('defensively treats corrupt or unexpected strings as already started to prevent illegal cancellations', () => {
      assert.equal(eventoYaIniciado(null as any), true);
      assert.equal(eventoYaIniciado(undefined as any), true);
      assert.equal(eventoYaIniciado('undefined'), true);
      assert.equal(eventoYaIniciado('2026-99-99T99:99:99Z'), true);
    });
  });
});
