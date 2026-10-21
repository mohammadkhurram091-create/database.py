INSERT INTO sources (source_name, author_name, reference_details, source_url, authenticity_grade)
VALUES
    ('Hisn al-Muslim', 'Said bin Ali bin Wahf al-Qahtani', 'Fortress of the Muslim - Dua 78', 'https://sunnah.com/hisn:78', 'Sahih'),
    ('Hisn al-Muslim', 'Said bin Ali bin Wahf al-Qahtani', 'Fortress of the Muslim - Dua 86', 'https://sunnah.com/hisn:86', 'Sahih'),
    ('Riyad as-Salihin', 'Imam an-Nawawi', 'Riyad as-Salihin - Hadith 1451', 'https://sunnah.com/riyadussalihin/15/44', 'Sahih');

INSERT INTO categories (category_name, description)
VALUES
    ('Morning', 'Adhkar recited in the morning'),
    ('Evening', 'Adhkar recited in the evening');

INSERT INTO adhkar (title, arabic_text, translation, transliteration, recommended_count, source_id)
VALUES
    (
        'Morning and Evening Dua',
        'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
        'O Allah, by You we enter the morning and evening, by You we live and die, and to You is the resurrection.',
        NULL,
        1,
        (SELECT source_id FROM sources WHERE source_url = 'https://sunnah.com/hisn:78')
    ),
    (
        'Protection through Allahs Name',
        'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        'In the name of Allah, with whose name nothing can cause harm on earth or in heaven. He is the All-Hearing, the All-Knowing.',
        NULL,
        3,
        (SELECT source_id FROM sources WHERE source_url = 'https://sunnah.com/hisn:86')
    ),
    (
        'Remembering Allah',
        'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        'Glory be to Allah and praise be to Him.',
        NULL,
        100,
        (SELECT source_id FROM sources WHERE source_url = 'https://sunnah.com/riyadussalihin/15/44')
    );

INSERT INTO adhkar_categories (adhkar_id, category_id)
SELECT a.adhkar_id, c.category_id
FROM adhkar a
CROSS JOIN categories c
WHERE c.category_name IN ('Morning', 'Evening');