-- Seed Sahih al-Bukhari source + 2 hadith (verified, from script.js).

INSERT INTO sources (source_name, author_name, reference_details, source_url, authenticity_grade)
VALUES
    ('Sahih al-Bukhari', 'Imam Muhammad al-Bukhari',
     'Sahih al-Bukhari — Collection of authentic hadith',
     'https://sunnah.com/bukhari', 'Sahih');

INSERT INTO hadith_references
    (source_id, collection_name, book_name, hadith_number, reference_url,
     grading, title, topic, narrator, hadith_text_arabic, hadith_text_english)
VALUES
    (
        (SELECT source_id FROM sources WHERE source_name = 'Sahih al-Bukhari' LIMIT 1),
        'Sahih al-Bukhari', 'Book of Revelation', '1',
        'https://sunnah.com/bukhari/1/1', 'Sahih',
        'Actions are judged by intentions',
        'Intentions',
        'Umar ibn Al-Khattab (RA)',
        'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
        'The reward of deeds depends upon the intentions, and every person will get the reward according to what they intended.'
    );

INSERT INTO hadith_references
    (source_id, collection_name, book_name, hadith_number, reference_url,
     grading, title, topic, narrator, hadith_text_arabic, hadith_text_english)
VALUES
    (
        (SELECT source_id FROM sources WHERE source_name = 'Sahih al-Bukhari' LIMIT 1),
        'Sahih al-Bukhari', 'Book of Faith', '13',
        'https://sunnah.com/bukhari/2/6', 'Sahih',
        'Wish good for others',
        'Faith',
        'Anas (RA)',
        'لا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
        'None of you will have faith till he wishes for his brother what he likes for himself.'
    );

    