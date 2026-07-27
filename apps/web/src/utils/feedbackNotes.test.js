import { describe, expect, it } from 'vitest';
import { buildNotesByFeedbackKey, getFeedbackRunIdChunks, mergeFeedbackRowsWithNotes } from './feedbackNotes.js';

const feedbackRow = (overrides = {}) => ({
  company_id: 'acme',
  run_id: 'run-1',
  notes: '',
  ...overrides
});

describe('feedback note history helpers', () => {
  it('selects the latest note newest-first', () => {
    const rows = mergeFeedbackRowsWithNotes([
      feedbackRow()
    ], [
      {
        company_id: 'acme',
        run_id: 'run-1',
        note_text: 'Older note',
        created_at: '2026-07-20T10:00:00Z'
      },
      {
        company_id: 'acme',
        run_id: 'run-1',
        note_text: 'Latest note',
        created_at: '2026-07-22T10:00:00Z'
      }
    ]);

    expect(rows[0].latest_note).toBe('Latest note');
    expect(rows[0].notes).toBe('Latest note\n\nOlder note');
  });

  it('counts multiple history notes', () => {
    const rows = mergeFeedbackRowsWithNotes([
      feedbackRow()
    ], [
      {
        company_id: 'acme',
        run_id: 'run-1',
        note_text: 'First note',
        created_at: '2026-07-20T10:00:00Z'
      },
      {
        company_id: 'acme',
        run_id: 'run-1',
        note_text: 'Second note',
        created_at: '2026-07-21T10:00:00Z'
      }
    ]);

    expect(rows[0].notes_count).toBe(2);
  });

  it('keeps all note text searchable and exportable', () => {
    const rows = mergeFeedbackRowsWithNotes([
      feedbackRow()
    ], [
      {
        company_id: 'acme',
        run_id: 'run-1',
        note_text: 'Called reception',
        created_at: '2026-07-20T10:00:00Z'
      },
      {
        company_id: 'acme',
        run_id: 'run-1',
        note_text: 'Meeting booked with Sarah',
        created_at: '2026-07-21T10:00:00Z'
      }
    ]);

    expect(rows[0].notes_search_text).toContain('Called reception');
    expect(rows[0].notes_search_text).toContain('Meeting booked with Sarah');
    expect(rows[0].notes).toContain('Called reception');
    expect(rows[0].notes).toContain('Meeting booked with Sarah');
  });

  it('falls back to legacy notes when note history is absent', () => {
    const rows = mergeFeedbackRowsWithNotes([
      feedbackRow({ notes: 'Legacy single note' })
    ], []);

    expect(rows[0].latest_note).toBe('Legacy single note');
    expect(rows[0].notes).toBe('Legacy single note');
    expect(rows[0].notes_count).toBe(0);
  });

  it('exports blank notes cleanly when there are no notes', () => {
    const rows = mergeFeedbackRowsWithNotes([
      feedbackRow()
    ], []);

    expect(rows[0].latest_note).toBe('');
    expect(rows[0].notes).toBe('');
    expect(rows[0].notes_count).toBe(0);
    expect(rows[0].notes_search_text).toBe('');
  });

  it('groups notes by company and run id', () => {
    const notesByKey = buildNotesByFeedbackKey([
      {
        company_id: 'acme',
        run_id: 'run-1',
        note_text: 'Acme note',
        created_at: '2026-07-20T10:00:00Z'
      },
      {
        company_id: 'other',
        run_id: 'run-2',
        note_text: 'Other note',
        created_at: '2026-07-20T10:00:00Z'
      }
    ]);

    expect(notesByKey.get('acme::run-1')).toHaveLength(1);
    expect(notesByKey.get('other::run-2')).toHaveLength(1);
  });

  it('builds unique run id chunks for note-history fetching', () => {
    expect(getFeedbackRunIdChunks([
      feedbackRow({ run_id: 'run-1' }),
      feedbackRow({ run_id: 'run-1' }),
      feedbackRow({ run_id: 'run-2' }),
      feedbackRow({ run_id: '' })
    ], 1)).toEqual([
      ['run-1'],
      ['run-2']
    ]);
  });
});
