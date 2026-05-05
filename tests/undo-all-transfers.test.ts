import { describe, it, expect, vi } from 'vitest';
import {
  executeUndoAllCheck,
  type CompletedTransfer,
  type UndoAllPayload,
} from '../client/src/lib/transfer-cascade';

const t = (out: number, inp: number): CompletedTransfer => ({
  outPlayerId: out,
  inPlayerId: inp,
  outPlayerName: `Player${out}`,
  inPlayerName: `Player${inp}`,
});

// ---------------------------------------------------------------------------
// Helper that simulates the full undo-all flow end-to-end:
//   1. executeUndoAllCheck decides whether to open the dialog or skip.
//   2. If the dialog opens, the helper optionally calls the undo function to
//      simulate "Confirm" (userConfirms=true) or does nothing for "Cancel"
//      (userConfirms=false).
//   3. Returns observable state so tests can assert on it.
// ---------------------------------------------------------------------------
function simulateUndoAllFlow(
  completed: CompletedTransfer[],
  gwId: number,
  userConfirms: boolean
): {
  dialogShown: boolean;
  payload: UndoAllPayload | null;
  undoCalled: boolean;
} {
  const performUndo = vi.fn();
  let dialogShown = false;
  let capturedPayload: UndoAllPayload | null = null;

  executeUndoAllCheck(
    completed,
    gwId,
    (payload) => {
      dialogShown = true;
      capturedPayload = payload;
      if (userConfirms) {
        performUndo();
      }
    },
    performUndo,
  );

  return {
    dialogShown,
    payload: capturedPayload,
    undoCalled: performUndo.mock.calls.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Core branch decision — dialog shown vs skipped
// ---------------------------------------------------------------------------

describe('executeUndoAllCheck — dialog is shown when transfers exist', () => {
  it('calls onShowDialog (not onDirectUndo) when there is one transfer', () => {
    const onShowDialog = vi.fn<[UndoAllPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoAllCheck([t(1, 2)], 10, onShowDialog, onDirectUndo);

    expect(onShowDialog).toHaveBeenCalledOnce();
    expect(onDirectUndo).not.toHaveBeenCalled();
  });

  it('calls onShowDialog (not onDirectUndo) when there are multiple transfers', () => {
    const onShowDialog = vi.fn<[UndoAllPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoAllCheck([t(1, 2), t(3, 4), t(5, 6)], 22, onShowDialog, onDirectUndo);

    expect(onShowDialog).toHaveBeenCalledOnce();
    expect(onDirectUndo).not.toHaveBeenCalled();
  });
});

describe('executeUndoAllCheck — no dialog when transfer list is empty', () => {
  it('calls onDirectUndo (not onShowDialog) when the completed list is empty', () => {
    const onShowDialog = vi.fn<[UndoAllPayload], void>();
    const onDirectUndo = vi.fn();

    executeUndoAllCheck([], 10, onShowDialog, onDirectUndo);

    expect(onShowDialog).not.toHaveBeenCalled();
    expect(onDirectUndo).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Correct transfer count is passed to the dialog
// ---------------------------------------------------------------------------

describe('executeUndoAllCheck — correct transfer count is included in the payload', () => {
  it('sets transferCount to 1 when there is exactly one transfer', () => {
    const onShowDialog = vi.fn<[UndoAllPayload], void>();

    executeUndoAllCheck([t(1, 2)], 10, onShowDialog, vi.fn());

    const payload = onShowDialog.mock.calls[0][0];
    expect(payload.transferCount).toBe(1);
  });

  it('sets transferCount to 2 when there are two transfers', () => {
    const onShowDialog = vi.fn<[UndoAllPayload], void>();

    executeUndoAllCheck([t(1, 2), t(3, 4)], 10, onShowDialog, vi.fn());

    const payload = onShowDialog.mock.calls[0][0];
    expect(payload.transferCount).toBe(2);
  });

  it('sets transferCount to match the full length of the completed array', () => {
    const completed = [t(1, 2), t(3, 4), t(5, 6), t(7, 8), t(9, 10)];
    const onShowDialog = vi.fn<[UndoAllPayload], void>();

    executeUndoAllCheck(completed, 10, onShowDialog, vi.fn());

    const payload = onShowDialog.mock.calls[0][0];
    expect(payload.transferCount).toBe(completed.length);
  });

  it('passes the correct gwId alongside transferCount', () => {
    const onShowDialog = vi.fn<[UndoAllPayload], void>();

    executeUndoAllCheck([t(1, 2), t(3, 4)], 38, onShowDialog, vi.fn());

    const payload = onShowDialog.mock.calls[0][0];
    expect(payload.gwId).toBe(38);
    expect(payload.transferCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Confirm proceeds with undo
// ---------------------------------------------------------------------------

describe('executeUndoAllCheck — confirm proceeds with undo', () => {
  it('undo is called when the user confirms the dialog', () => {
    const { undoCalled, dialogShown } = simulateUndoAllFlow([t(1, 2), t(3, 4)], 10, true);

    expect(dialogShown).toBe(true);
    expect(undoCalled).toBe(true);
  });

  it('undo is called for a single-transfer gameweek when confirmed', () => {
    const { undoCalled } = simulateUndoAllFlow([t(1, 2)], 15, true);

    expect(undoCalled).toBe(true);
  });

  it('undo is called exactly once after confirmation', () => {
    const performUndo = vi.fn();

    executeUndoAllCheck(
      [t(1, 2), t(3, 4)],
      10,
      (_payload) => {
        performUndo();
      },
      performUndo,
    );

    expect(performUndo).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Cancel does not undo
// ---------------------------------------------------------------------------

describe('executeUndoAllCheck — cancel does not undo', () => {
  it('undo is NOT called when the user cancels the dialog', () => {
    const { undoCalled, dialogShown } = simulateUndoAllFlow([t(1, 2), t(3, 4)], 10, false);

    expect(dialogShown).toBe(true);
    expect(undoCalled).toBe(false);
  });

  it('undo is NOT called for a single-transfer gameweek when cancelled', () => {
    const { undoCalled } = simulateUndoAllFlow([t(5, 6)], 20, false);

    expect(undoCalled).toBe(false);
  });

  it('undo is NOT called for a five-transfer gameweek when cancelled', () => {
    const completed = [t(1, 2), t(3, 4), t(5, 6), t(7, 8), t(9, 10)];
    const { undoCalled } = simulateUndoAllFlow(completed, 30, false);

    expect(undoCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Payload integrity — gwId propagation
// ---------------------------------------------------------------------------

describe('executeUndoAllCheck — gwId is propagated correctly to the payload', () => {
  it('passes gwId 1 to the dialog payload', () => {
    const { payload } = simulateUndoAllFlow([t(1, 2)], 1, false);

    expect(payload?.gwId).toBe(1);
  });

  it('passes gwId 38 (last GW) to the dialog payload', () => {
    const { payload } = simulateUndoAllFlow([t(1, 2), t(3, 4)], 38, false);

    expect(payload?.gwId).toBe(38);
  });

  it('payload is null when no dialog is shown (empty completed list)', () => {
    const { payload, dialogShown } = simulateUndoAllFlow([], 10, false);

    expect(dialogShown).toBe(false);
    expect(payload).toBeNull();
  });
});
