import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChainBreakConfirmationDialog, type ChainBreakPayload } from '../client/src/components/chain-break-confirmation-dialog';

const SALAH_TO_HAALAND: ChainBreakPayload = {
  transferIndex: 0,
  gwId: 30,
  transferName: 'Salah → Haaland',
  dependentTransfers: ['GW30: Trippier → Alexander-Arnold'],
  dependentPlayerPairs: [{ outPlayerId: 2, inPlayerId: 3, depGwId: 30 }],
  crossGwDependents: [],
};

const CROSS_GW_PAYLOAD: ChainBreakPayload = {
  transferIndex: 0,
  gwId: 30,
  transferName: 'Salah → Haaland',
  dependentTransfers: ['GW31: Trippier → Alexander-Arnold', 'GW32: Son → Palmer'],
  dependentPlayerPairs: [
    { outPlayerId: 2, inPlayerId: 3, depGwId: 31 },
    { outPlayerId: 4, inPlayerId: 5, depGwId: 32 },
  ],
  crossGwDependents: [
    { gwId: 31, transferIndex: 0 },
    { gwId: 32, transferIndex: 1 },
  ],
};

function renderDialog(
  confirmation: ChainBreakPayload | null,
  overrides?: {
    onCancel?: () => void;
    onUndoWithDependents?: (transferIndex: number, gwId: number, crossGwDependents: Array<{ gwId: number; transferIndex: number }>) => void;
  }
) {
  const onCancel = overrides?.onCancel ?? vi.fn();
  const onUndoWithDependents = overrides?.onUndoWithDependents ?? vi.fn();
  const handleUndoSingle = vi.fn();
  const setBrokenTransfers = vi.fn();
  const toast = vi.fn();

  const result = render(
    <ChainBreakConfirmationDialog
      confirmation={confirmation}
      onCancel={onCancel}
      onUndoWithDependents={onUndoWithDependents}
      onUndoAnywayHandlers={{ handleUndoSingle, setBrokenTransfers, toast }}
    />
  );
  return { ...result, onCancel, onUndoWithDependents, handleUndoSingle, setBrokenTransfers, toast };
}

describe('ChainBreakConfirmationDialog', () => {
  describe('when confirmation is null', () => {
    it('renders nothing visible (dialog closed)', () => {
      renderDialog(null);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Dependent Transfer Detected')).not.toBeInTheDocument();
    });
  });

  describe('dialog title', () => {
    it('shows "Dependent Transfer Detected" as the title', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Dependent Transfer Detected')).toBeInTheDocument();
    });
  });

  describe('transfer name in body copy', () => {
    it('displays the transferName in bold within the intro sentence', () => {
      renderDialog(SALAH_TO_HAALAND);
      const dialog = screen.getByRole('alertdialog');
      const bold = within(dialog).getAllByText('Salah → Haaland');
      expect(bold.length).toBeGreaterThanOrEqual(1);
    });

    it('shows the correct total transfer count in the intro sentence', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.getByText(/The following 2 transfers will be removed/i)).toBeInTheDocument();
    });

    it('labels the undone transfer as "(this transfer)"', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.getByText('(this transfer)')).toBeInTheDocument();
    });
  });

  describe('current-GW section header', () => {
    it('shows "GW 30 — transfers to remove" section label', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.getByText(/GW 30 — transfers to remove/i)).toBeInTheDocument();
    });
  });

  describe('same-GW dependent transfer list items', () => {
    it('lists the dependent transfer in the same-GW section', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.getByText('GW30: Trippier → Alexander-Arnold')).toBeInTheDocument();
    });

    it('shows 2 list items in the same-GW list (the transfer + 1 dependent)', () => {
      renderDialog(SALAH_TO_HAALAND);
      const dialog = screen.getByRole('alertdialog');
      const listItems = within(dialog).getAllByRole('listitem');
      expect(listItems.length).toBe(2);
    });
  });

  describe('cross-GW sections', () => {
    it('shows future-GW section headers for each cross-GW gameweek', () => {
      renderDialog(CROSS_GW_PAYLOAD);
      expect(screen.getByText(/GW 31 — future gameweek affected/i)).toBeInTheDocument();
      expect(screen.getByText(/GW 32 — future gameweek affected/i)).toBeInTheDocument();
    });

    it('strips the "GW31: " prefix from cross-GW dependent names', () => {
      renderDialog(CROSS_GW_PAYLOAD);
      expect(screen.getByText('Trippier → Alexander-Arnold')).toBeInTheDocument();
      expect(screen.getByText('Son → Palmer')).toBeInTheDocument();
    });

    it('does NOT show cross-GW section headers when there are none', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.queryByText(/future gameweek affected/i)).not.toBeInTheDocument();
    });
  });

  describe('"Undo This & Dependents" button', () => {
    it('shows the button with the correct count (same-GW payload)', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.getByRole('button', { name: /Undo This & Dependents \(2\)/i })).toBeInTheDocument();
    });

    it('shows the button with correct count for cross-GW payload (3 total)', () => {
      renderDialog(CROSS_GW_PAYLOAD);
      expect(screen.getByRole('button', { name: /Undo This & Dependents \(3\)/i })).toBeInTheDocument();
    });

    it('also shows the total count in the description paragraph', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.getByText(/will remove all 2 transfers listed above/i)).toBeInTheDocument();
    });

    it('calls onUndoWithDependents with correct args when clicked', () => {
      const onUndoWithDependents = vi.fn();
      const onCancel = vi.fn();
      renderDialog(SALAH_TO_HAALAND, { onUndoWithDependents, onCancel });
      fireEvent.click(screen.getByRole('button', { name: /Undo This & Dependents/i }));
      expect(onUndoWithDependents).toHaveBeenCalledWith(0, 30, []);
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('"Undo Anyway" button visibility', () => {
    it('shows "Undo Anyway" when there are NO cross-GW dependents', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.getByRole('button', { name: /Undo Anyway/i })).toBeInTheDocument();
    });

    it('hides "Undo Anyway" when there ARE cross-GW dependents', () => {
      renderDialog(CROSS_GW_PAYLOAD);
      expect(screen.queryByRole('button', { name: /Undo Anyway/i })).not.toBeInTheDocument();
    });

    it('shows the "Undo Anyway" explanation text when no cross-GW dependents', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.getByText(/will remain but may produce unexpected results/i)).toBeInTheDocument();
    });

    it('does NOT show "Undo Anyway" explanation text when cross-GW dependents exist', () => {
      renderDialog(CROSS_GW_PAYLOAD);
      expect(screen.queryByText(/will remain but may produce unexpected results/i)).not.toBeInTheDocument();
    });
  });

  describe('"Undo Anyway" button interaction', () => {
    it('calls handleUndoSingle with transferIndex and gwId', () => {
      const { handleUndoSingle, onCancel } = renderDialog(SALAH_TO_HAALAND);
      fireEvent.click(screen.getByRole('button', { name: /Undo Anyway/i }));
      expect(handleUndoSingle).toHaveBeenCalledWith(0, 30);
      expect(onCancel).toHaveBeenCalled();
    });

    it('calls setBrokenTransfers with the dependent player pairs', () => {
      const { setBrokenTransfers } = renderDialog(SALAH_TO_HAALAND);
      fireEvent.click(screen.getByRole('button', { name: /Undo Anyway/i }));
      expect(setBrokenTransfers).toHaveBeenCalledTimes(1);
      const updater = setBrokenTransfers.mock.calls[0][0] as (prev: unknown[]) => unknown[];
      const result = updater([]);
      expect(result).toEqual([{ gwId: 30, outPlayerId: 2, inPlayerId: 3 }]);
    });

    it('shows a destructive toast warning after "Undo Anyway"', () => {
      const { toast } = renderDialog(SALAH_TO_HAALAND);
      fireEvent.click(screen.getByRole('button', { name: /Undo Anyway/i }));
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Warning: Squad May Be Broken',
          variant: 'destructive',
        })
      );
    });
  });

  describe('Cancel button', () => {
    it('shows a Cancel button', () => {
      renderDialog(SALAH_TO_HAALAND);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onCancel when Cancel is clicked', () => {
      const onCancel = vi.fn();
      renderDialog(SALAH_TO_HAALAND, { onCancel });
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onUndoWithDependents when Cancel is clicked', () => {
      const onCancel = vi.fn();
      const onUndoWithDependents = vi.fn();
      renderDialog(SALAH_TO_HAALAND, { onCancel, onUndoWithDependents });
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onUndoWithDependents).not.toHaveBeenCalled();
    });
  });

  describe('singular vs plural wording', () => {
    const singleDepPayload: ChainBreakPayload = {
      ...SALAH_TO_HAALAND,
      dependentTransfers: ['GW30: Trippier → Alexander-Arnold'],
    };
    const multiDepPayload: ChainBreakPayload = {
      ...SALAH_TO_HAALAND,
      dependentTransfers: ['GW30: Trippier → Alexander-Arnold', 'GW30: Mbappe → Isak'],
      dependentPlayerPairs: [
        { outPlayerId: 2, inPlayerId: 3, depGwId: 30 },
        { outPlayerId: 6, inPlayerId: 7, depGwId: 30 },
      ],
    };

    it('uses singular "transfer" in Undo Anyway text for 1 dependent', () => {
      renderDialog(singleDepPayload);
      expect(screen.getByText(/the dependent transfer will remain/i)).toBeInTheDocument();
    });

    it('uses plural "transfers" in Undo Anyway text for 2+ dependents', () => {
      renderDialog(multiDepPayload);
      expect(screen.getByText(/the dependent transfers will remain/i)).toBeInTheDocument();
    });
  });
});
