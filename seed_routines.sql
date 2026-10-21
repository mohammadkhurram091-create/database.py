-- Seed the default daily worship routine.
-- Matches the three routine items hardcoded in index.html:
--   Morning Adhkar  → links to adhkar_id 1 (Morning and Evening Dua)
--   Read Quran      → verse-only placeholder (verse_id NULL until Quran imported)
--   Evening Adhkar  → links to adhkar_id 1

INSERT INTO routines (routine_name, description, is_active)
VALUES
    ('Daily Worship Routine',
     'Morning Adhkar, Quran reading, and Evening Adhkar — the three core habits.',
     TRUE);

-- Items link to the routine by name (avoids hardcoded routine_id)
INSERT INTO routine_items (routine_id, display_order, item_type, adhkar_id, verse_id, target_count)
VALUES
    ((SELECT routine_id FROM routines WHERE routine_name = 'Daily Worship Routine' LIMIT 1),
     1, 'adhkar',
     (SELECT adhkar_id FROM adhkar WHERE title = 'Morning and Evening Dua' LIMIT 1),
     NULL, 1),

    ((SELECT routine_id FROM routines WHERE routine_name = 'Daily Worship Routine' LIMIT 1),
     2, 'verse',
     NULL, NULL, 1),

    ((SELECT routine_id FROM routines WHERE routine_name = 'Daily Worship Routine' LIMIT 1),
     3, 'adhkar',
     (SELECT adhkar_id FROM adhkar WHERE title = 'Remembering Allah' LIMIT 1),
     NULL, 100);