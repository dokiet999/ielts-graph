-- ============================================================
-- V17: Seed 4 FINAL_TEST exercises (1 per skill course) & default unlock grants
-- ============================================================

INSERT INTO exercises (id, lesson_id, title, instruction, audio_url, content, exercise_type, skill_type, time_limit, max_attempts, passing_score, ordering)
VALUES
    -- 1. Reading Final Test (Course 1, Section 20000000-0000-0000-0000-000000000011)
    ('40000000-0000-0000-0000-000000006001',
     '30000000-0000-0000-0000-000000000112',
     'Reading Final Test - Alexander Henderson (1831-1913)',
     'You should spend about 20 minutes on Questions 1-8, which are based on the Reading Passage below.',
     NULL,
     '{"passageTitle": "Alexander Henderson (1831-1913)", "subtitle": "Born in Scotland, Henderson emigrated to Canada in 1855 and became one of the country''s most celebrated landscape photographers.", "paragraphs": [{"label": "A", "text": "Alexander Henderson was born in Scotland in 1831 and was the son of a successful merchant. His grandfather, also called Alexander, had founded the family business, and later became the first chairman of the National Bank of Scotland. The family had extensive landholdings in Scotland. Besides its residence in Edinburgh, it owned Press Estate, 650 acres of farmland about 35 miles southeast of the city."}, {"label": "B", "text": "Even as a boy, Henderson loved photography and spent much of his spare time experimenting with early camera equipment. However, his family expected him to enter the accounting profession, so he trained as an accountant in Edinburgh before deciding to emigrate to Montreal, Canada, in 1855."}, {"label": "C", "text": "In 1865, Henderson published his first major collection, Canadian Views and Studies, which established his reputation as a master of outdoor photography. Unlike studio portraitists of the era, Henderson travelled by canoe and snowshoe to capture wilderness rivers, winter forests, and railway bridges across Quebec and Ontario."}]}'::jsonb,
     'FINAL_TEST',
     'READING',
     1200,
     3,
     6.00,
     20),

    -- 2. Listening Final Test (Course 2, Section 20000000-0000-0000-0000-000000000021)
    ('40000000-0000-0000-0000-000000006002',
     '30000000-0000-0000-0000-000000000211',
     'Listening Final Test - City Museum Volunteer Programme',
     'Listen to the conversation between a museum coordinator and an applicant and answer Questions 1-6.',
     '/static/audio/listening-01.wav',
     '{"sectionTitle": "Section 1 — City Museum Volunteer Programme", "transcript": [{"speaker": "Coordinator", "text": "Good morning, City Museum volunteer office. How can I help you?"}, {"speaker": "Applicant", "text": "Hello, I would like to apply for the weekend volunteer programme. My surname is Barton, B-A-R-T-O-N."}, {"speaker": "Coordinator", "text": "Thank you. What is your preferred gallery area? We have openings in the Ancient History gallery and the Science wing."}, {"speaker": "Applicant", "text": "I studied archaeology, so the history gallery would be ideal. I currently live on Park Avenue, postcode SW14."}, {"speaker": "Coordinator", "text": "Wonderful. Training starts on the 15th of November and volunteers receive a free museum pass and lunch voucher."}]}'::jsonb,
     'FINAL_TEST',
     'LISTENING',
     900,
     3,
     6.00,
     20),

    -- 3. Writing Final Test (Course 9, Section 20000000-0000-0000-0000-000000000091)
    ('40000000-0000-0000-0000-000000006003',
     '30000000-0000-0000-0000-000000000911',
     'Writing Final Test - Environmental Responsibility (Task 2)',
     'You should spend about 40 minutes on this task. Write about the following topic: Some people think that environmental problems are too big for individuals to solve, while others believe that governments cannot solve them without individual action. Discuss both views and give your own opinion. Write at least 250 words.',
     NULL,
     '{"task": "QT_W2_DISCUSSION", "minWords": 250}'::jsonb,
     'FINAL_TEST',
     'WRITING',
     2400,
     3,
     6.00,
     30),

    -- 4. Speaking Final Test (Course 10, Section 20000000-0000-0000-0000-000000000101)
    ('40000000-0000-0000-0000-000000006004',
     '30000000-0000-0000-0000-000000001011',
     'Speaking Final Test - Describe a Skill You Learned Outside School',
     'Describe a practical skill you learned outside school or university. You should say: what the skill is, who taught you or how you learned it, how long it took to learn, and explain why this skill is useful in your life.',
     NULL,
     '{"part": "QT_S_PART2", "prepSeconds": 60, "speakSeconds": 120}'::jsonb,
     'FINAL_TEST',
     'SPEAKING',
     180,
     3,
     6.00,
     30)
ON CONFLICT (id) DO NOTHING;

-- Question Groups for Reading & Listening Final Tests
INSERT INTO question_groups (id, exercise_id, group_title, group_instruction, question_type, question_range, ordering)
VALUES
    ('60000000-0000-0000-0000-000000006011', '40000000-0000-0000-0000-000000006001',
     'Questions 1–4', 'Do the following statements agree with the information given in the Reading Passage? Choose TRUE, FALSE or NOT GIVEN.',
     'TRUE_FALSE', '1-4', 1),
    ('60000000-0000-0000-0000-000000006012', '40000000-0000-0000-0000-000000006001',
     'Questions 5–8', 'Complete the notes below. Write ONE WORD OR A NUMBER from the passage for each answer.',
     'FILL_BLANK', '5-8', 2),

    ('60000000-0000-0000-0000-000000006021', '40000000-0000-0000-0000-000000006002',
     'Questions 1–4', 'Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.',
     'FILL_BLANK', '1-4', 1),
    ('60000000-0000-0000-0000-000000006022', '40000000-0000-0000-0000-000000006002',
     'Questions 5–6', 'Choose the correct letter, A, B or C.',
     'MULTIPLE_CHOICE', '5-6', 2)
ON CONFLICT (id) DO NOTHING;

-- Questions for Reading, Listening, Writing, Speaking Final Tests
INSERT INTO questions (id, exercise_id, question_group_id, question_text, question_type, explanation, points, ordering)
VALUES
    -- Reading Final Test Q1-8
    ('50000000-0000-0000-0000-000000006101', '40000000-0000-0000-0000-000000006001', '60000000-0000-0000-0000-000000006011',
     'Henderson''s grandfather was the first chairman of the National Bank of Scotland.', 'TRUE_FALSE',
     'Paragraph A states his grandfather became the first chairman of the National Bank of Scotland.', 1, 1),
    ('50000000-0000-0000-0000-000000006102', '40000000-0000-0000-0000-000000006001', '60000000-0000-0000-0000-000000006011',
     'Henderson''s family encouraged him to become a full-time photographer.', 'TRUE_FALSE',
     'Paragraph B states his family expected him to enter the accounting profession.', 1, 2),
    ('50000000-0000-0000-0000-000000006103', '40000000-0000-0000-0000-000000006001', '60000000-0000-0000-0000-000000006011',
     'Henderson sold Press Estate before moving to Canada.', 'TRUE_FALSE',
     'The passage does not mention whether Press Estate was sold.', 1, 3),
    ('50000000-0000-0000-0000-000000006104', '40000000-0000-0000-0000-000000006001', '60000000-0000-0000-0000-000000006011',
     'Henderson travelled into the Canadian wilderness to take landscape photographs.', 'TRUE_FALSE',
     'Paragraph C states he travelled by canoe and snowshoe to capture wilderness rivers and winter forests.', 1, 4),
    ('50000000-0000-0000-0000-000000006105', '40000000-0000-0000-0000-000000006001', '60000000-0000-0000-0000-000000006012',
     'Press Estate consisted of 650 acres of ______ southeast of Edinburgh.', 'FILL_BLANK',
     'Paragraph A: 650 acres of farmland.', 1, 5),
    ('50000000-0000-0000-0000-000000006106', '40000000-0000-0000-0000-000000006001', '60000000-0000-0000-0000-000000006012',
     'Henderson trained as an ______ in Edinburgh.', 'FILL_BLANK',
     'Paragraph B: trained as an accountant.', 1, 6),
    ('50000000-0000-0000-0000-000000006107', '40000000-0000-0000-0000-000000006001', '60000000-0000-0000-0000-000000006012',
     'He emigrated to Montreal in the year ______.', 'FILL_BLANK',
     'Paragraph B: emigrate to Montreal, Canada, in 1855.', 1, 7),
    ('50000000-0000-0000-0000-000000006108', '40000000-0000-0000-0000-000000006001', '60000000-0000-0000-0000-000000006012',
     'He travelled by ______ and snowshoe to photograph rivers and forests.', 'FILL_BLANK',
     'Paragraph C: travelled by canoe and snowshoe.', 1, 8),

    -- Listening Final Test Q1-6
    ('50000000-0000-0000-0000-000000006201', '40000000-0000-0000-0000-000000006002', '60000000-0000-0000-0000-000000006021',
     'Applicant surname: ______', 'FILL_BLANK', 'My surname is Barton.', 1, 1),
    ('50000000-0000-0000-0000-000000006202', '40000000-0000-0000-0000-000000006002', '60000000-0000-0000-0000-000000006021',
     'Preferred gallery: Ancient ______ gallery', 'FILL_BLANK', 'Ancient History gallery.', 1, 2),
    ('50000000-0000-0000-0000-000000006203', '40000000-0000-0000-0000-000000006002', '60000000-0000-0000-0000-000000006021',
     'Street address: ______ Avenue', 'FILL_BLANK', 'Park Avenue.', 1, 3),
    ('50000000-0000-0000-0000-000000006204', '40000000-0000-0000-0000-000000006002', '60000000-0000-0000-0000-000000006021',
     'Training starts on: ______ November', 'FILL_BLANK', '15th of November.', 1, 4),
    ('50000000-0000-0000-0000-000000006205', '40000000-0000-0000-0000-000000006002', '60000000-0000-0000-0000-000000006022',
     'What did the applicant study at university?', 'MULTIPLE_CHOICE', 'I studied archaeology.', 1, 5),
    ('50000000-0000-0000-0000-000000006206', '40000000-0000-0000-0000-000000006002', '60000000-0000-0000-0000-000000006022',
     'What benefit do volunteers receive?', 'MULTIPLE_CHOICE', 'A free museum pass and lunch voucher.', 1, 6),

    -- Writing & Speaking Final Test prompts
    ('50000000-0000-0000-0000-000000006301', '40000000-0000-0000-0000-000000006003', NULL,
     'Some people think that environmental problems are too big for individuals to solve, while others believe that governments cannot solve them without individual action. Discuss both views and give your own opinion.',
     'ESSAY', NULL, 9, 1),
    ('50000000-0000-0000-0000-000000006401', '40000000-0000-0000-0000-000000006004', NULL,
     'Describe a practical skill you learned outside school or university. You should say: what the skill is, who taught you or how you learned it, how long it took to learn, and explain why this skill is useful in your life.',
     'SPEAKING', NULL, 9, 1)
ON CONFLICT (id) DO NOTHING;

-- Question Options for Reading & Listening Final Tests
INSERT INTO question_options (id, question_id, option_text, is_correct, point, ordering)
VALUES
    ('70000000-0000-0000-0000-000000006101', '50000000-0000-0000-0000-000000006101', 'TRUE', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000006102', '50000000-0000-0000-0000-000000006101', 'FALSE', FALSE, 0, 2),
    ('70000000-0000-0000-0000-000000006103', '50000000-0000-0000-0000-000000006101', 'NOT GIVEN', FALSE, 0, 3),

    ('70000000-0000-0000-0000-000000006104', '50000000-0000-0000-0000-000000006102', 'TRUE', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000006105', '50000000-0000-0000-0000-000000006102', 'FALSE', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000006106', '50000000-0000-0000-0000-000000006102', 'NOT GIVEN', FALSE, 0, 3),

    ('70000000-0000-0000-0000-000000006107', '50000000-0000-0000-0000-000000006103', 'TRUE', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000006108', '50000000-0000-0000-0000-000000006103', 'FALSE', FALSE, 0, 2),
    ('70000000-0000-0000-0000-000000006109', '50000000-0000-0000-0000-000000006103', 'NOT GIVEN', TRUE, 1, 3),

    ('70000000-0000-0000-0000-000000006110', '50000000-0000-0000-0000-000000006104', 'TRUE', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000006111', '50000000-0000-0000-0000-000000006104', 'FALSE', FALSE, 0, 2),
    ('70000000-0000-0000-0000-000000006112', '50000000-0000-0000-0000-000000006104', 'NOT GIVEN', FALSE, 0, 3),

    ('70000000-0000-0000-0000-000000006113', '50000000-0000-0000-0000-000000006105', 'farmland', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000006114', '50000000-0000-0000-0000-000000006106', 'accountant', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000006115', '50000000-0000-0000-0000-000000006107', '1855', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000006116', '50000000-0000-0000-0000-000000006108', 'canoe', TRUE, 1, 1),

    ('70000000-0000-0000-0000-000000006201', '50000000-0000-0000-0000-000000006201', 'Barton', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000006202', '50000000-0000-0000-0000-000000006202', 'History', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000006203', '50000000-0000-0000-0000-000000006203', 'Park', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000006204', '50000000-0000-0000-0000-000000006204', '15th', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000006205', '50000000-0000-0000-0000-000000006204', '15', TRUE, 1, 2),

    ('70000000-0000-0000-0000-000000006206', '50000000-0000-0000-0000-000000006205', 'A. architecture', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000006207', '50000000-0000-0000-0000-000000006205', 'B. archaeology', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000006208', '50000000-0000-0000-0000-000000006205', 'C. art history', FALSE, 0, 3),

    ('70000000-0000-0000-0000-000000006209', '50000000-0000-0000-0000-000000006206', 'A. free parking', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000006210', '50000000-0000-0000-0000-000000006206', 'B. a museum pass and lunch voucher', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000006211', '50000000-0000-0000-0000-000000006206', 'C. bookshop discounts', FALSE, 0, 3)
ON CONFLICT (id) DO NOTHING;

-- Pre-unlock Reading & Listening Final Tests for student_enrolled (7 days deadline)
INSERT INTO final_test_grants (id, user_id, section_id, unlocked_by, deadline_days, unlocked_at, expires_at)
VALUES
    ('80000000-0000-0000-0000-000000006001',
     '00000000-0000-0000-0000-000000000011',
     '20000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000001',
     7,
     NOW(),
     NOW() + INTERVAL '7 days'),
    ('80000000-0000-0000-0000-000000006002',
     '00000000-0000-0000-0000-000000000011',
     '20000000-0000-0000-0000-000000000021',
     '00000000-0000-0000-0000-000000000001',
     7,
     NOW(),
     NOW() + INTERVAL '7 days')
ON CONFLICT (user_id, section_id) DO NOTHING;
