const cleanText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const feedbackKey = (row) => `${row?.company_id || ''}::${row?.run_id || ''}`;

const getCreatedAtTime = (row) => {
  const value = row?.created_at;
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const normalizeNote = (note) => ({
  ...note,
  note_text: cleanText(note?.note_text)
});

export const getFeedbackRunIdChunks = (feedbackRows = [], chunkSize = 200) => {
  const runIds = [
    ...new Set(
      feedbackRows
        .map((row) => cleanText(row?.run_id))
        .filter(Boolean)
    )
  ];
  const chunks = [];

  for (let index = 0; index < runIds.length; index += chunkSize) {
    chunks.push(runIds.slice(index, index + chunkSize));
  }

  return chunks;
};

export const buildNotesByFeedbackKey = (notesRows = []) => {
  const notesByKey = new Map();

  notesRows
    .map(normalizeNote)
    .filter((note) => note.company_id && note.run_id && note.note_text)
    .forEach((note) => {
      const key = feedbackKey(note);
      const notes = notesByKey.get(key) || [];
      notes.push(note);
      notesByKey.set(key, notes);
    });

  notesByKey.forEach((notes, key) => {
    notesByKey.set(
      key,
      [...notes].sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a))
    );
  });

  return notesByKey;
};

export const mergeFeedbackRowsWithNotes = (feedbackRows = [], notesRows = []) => {
  const notesByKey = buildNotesByFeedbackKey(notesRows);

  return feedbackRows.map((row) => {
    const historyNotes = notesByKey.get(feedbackKey(row)) || [];
    const historyNoteTexts = historyNotes.map((note) => note.note_text).filter(Boolean);
    const legacyNote = cleanText(row.notes);
    const noteTexts = historyNoteTexts.length > 0
      ? historyNoteTexts
      : (legacyNote ? [legacyNote] : []);
    const notes = noteTexts.join('\n\n');

    return {
      ...row,
      latest_note: noteTexts[0] || '',
      notes,
      notes_count: historyNoteTexts.length,
      notes_search_text: notes
    };
  });
};
