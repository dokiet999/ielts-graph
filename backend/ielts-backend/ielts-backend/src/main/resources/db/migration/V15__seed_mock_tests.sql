-- ============================================================
-- IELTS Graph - Seed Mock Test exercises for all 4 skills
-- Migration: V15__seed_mock_tests.sql
-- ============================================================

INSERT INTO exercises (id, lesson_id, title, instruction, audio_url, content, exercise_type, skill_type, time_limit, max_attempts, passing_score, ordering)
VALUES
    -- 1. Reading Mock Test
    ('40000000-0000-0000-0000-000000005001', '30000000-0000-0000-0000-000000000112',
     'Reading Mock Test 1 - The Hidden Work of Sleep',
     'You should spend about 20 minutes on Questions 1-13, which are based on Reading Passage 2 below.',
     NULL,
     '{"passageTitle":"The Hidden Work of Sleep","paragraphs":[{"label":"A","text":"For most of history, sleep was regarded as a passive state, a simple pause in which the body and brain switched off to recover from the day. Researchers in the twentieth century overturned this view. By attaching sensors to sleeping volunteers, they showed that the brain remains highly active through the night, passing through a repeating cycle of stages that each last roughly ninety minutes."},{"label":"B","text":"The stages fall into two main types. During deep sleep, brain activity slows and the body repairs muscles and tissue. In the other type, known as REM sleep, the eyes move rapidly beneath the eyelids and most vivid dreaming occurs. An adult usually completes four or five cycles a night. The proportion of deep sleep is greater in the first half of the night, while REM periods become longer towards morning."},{"label":"C","text":"One of the most important discoveries concerns memory. In a well-known experiment, students were taught a list of word pairs and then divided into two groups. One group slept for eight hours, while the other stayed awake for the same period. When both groups were tested, those who had slept recalled significantly more pairs. Scientists believe that during deep sleep the brain replays the day''s experiences, transferring important information from a temporary store to long-term memory."},{"label":"D","text":"Sleep also affects mood and judgement. Volunteers who were kept awake for a single night showed stronger emotional reactions to unpleasant images than those who had rested, and they were less able to concentrate on simple tasks. Over a longer period, a lack of sleep has been linked to weight gain and a weaker defence against infection, although researchers caution that these links do not prove that poor sleep is the only cause."},{"label":"E","text":"Despite this evidence, many people sleep less than they need. Surveys suggest that adults in busy cities average well under the seven to nine hours recommended by doctors, partly because of long working hours and the habit of looking at bright screens late in the evening. The light from these devices is thought to delay the release of a hormone that signals to the body that it is time to rest. Some schools have responded by starting lessons later, and early studies report improved attendance among teenage students."},{"label":"F","text":"Not everyone agrees on how much sleep is enough. A few people appear to function well on far less than average, and scientists are investigating whether a rare gene explains this. For the majority, however, the advice is simple: regular sleeping times, a dark and quiet bedroom, and a break from screens before bed."}]}'::jsonb,
     'MOCK_TEST', 'READING', 1200, 5, 0, 10),

    -- 2. Listening Mock Test
    ('40000000-0000-0000-0000-000000005002', '30000000-0000-0000-0000-000000000211',
     'Listening Mock Test 1 - Library Membership Enquiry',
     'You will hear a telephone conversation between a woman and a librarian about joining a public library. Answer Questions 1-10.',
     'https://drive.google.com/uc?export=download&id=1AXghlgwAGHhtYlwIS8_tMxKCgTzJHs2D',
     '{"sectionTitle":"Section 1","transcript":[{"speaker":"Sam","text":"Good afternoon, Eastfield Public Library, Sam speaking."},{"speaker":"Hannah","text":"Hello. I''ve just moved to the area and I''d like to join the library."},{"speaker":"Sam","text":"Welcome to Eastfield. I can take some details over the phone, and you can collect your card later. Could I have your surname, please?"},{"speaker":"Hannah","text":"It''s Pryce."},{"speaker":"Sam","text":"Is that P-R-I-C-E?"},{"speaker":"Hannah","text":"No, it''s P-R-Y-C-E."},{"speaker":"Sam","text":"Thank you. And a mobile number?"},{"speaker":"Hannah","text":"07700 900415."},{"speaker":"Sam","text":"07700 900415. And your address?"},{"speaker":"Hannah","text":"Twenty-seven Willow Road. That''s W-I-L-L-O-W."},{"speaker":"Sam","text":"Got it. We have three kinds of membership: standard, senior and student. Which would suit you?"},{"speaker":"Hannah","text":"I''m studying part-time at the college, so I think student membership."},{"speaker":"Sam","text":"Then you''ll need to show your student card when you collect your card. Student membership is normally eight pounds a year, but there''s an offer this month, so it''s only five pounds."},{"speaker":"Hannah","text":"That''s very good. Do I need to bring anything else?"},{"speaker":"Sam","text":"Yes, proof of your address. A passport won''t do, because it doesn''t show where you live, and we can''t accept letters from the college either. A recent bank statement or a utility bill is fine."},{"speaker":"Hannah","text":"I have a bank statement from last month."},{"speaker":"Sam","text":"Perfect. Your card will be ready on Thursday. We''re closed on Wednesdays, so please don''t come then."},{"speaker":"Hannah","text":"Thursday, okay. How many books can I borrow?"},{"speaker":"Sam","text":"It used to be eight, but members can now borrow up to ten books at a time."},{"speaker":"Hannah","text":"Lovely. And can I reserve a study room? I have some exams coming up."},{"speaker":"Sam","text":"Yes, but only online. The desk no longer takes bookings, and we don''t accept them by phone either."},{"speaker":"Hannah","text":"That''s fine. Is the library open in the evenings?"},{"speaker":"Sam","text":"Most days we close at six, but on Tuesdays we stay open until eight."},{"speaker":"Hannah","text":"Great. Thank you so much for your help."},{"speaker":"Sam","text":"You''re welcome. See you on Thursday."}]}'::jsonb,
     'MOCK_TEST', 'LISTENING', 600, 5, 0, 10),

    -- 3. Writing Mock Tests
    ('40000000-0000-0000-0000-000000005003', '30000000-0000-0000-0000-000000000911',
     'Writing Mock Test 1 - Task 2: Remote Work & Urban Life',
     'You should spend about 40 minutes on this task. Write about the following topic: Many companies now allow employees to work from home instead of commuting to offices in big cities. Some people think this trend improves quality of life, while others believe it harms teamwork and urban economies. Discuss both views and give your own opinion. Write at least 250 words.',
     NULL,
     '{"task": "QT_W2_DISCUSSION"}'::jsonb,
     'MOCK_TEST', 'WRITING', 2400, 5, 0, 50),

    ('40000000-0000-0000-0000-000000005004', '30000000-0000-0000-0000-000000000911',
     'Writing Mock Test 2 - Task 2: AI in Modern Education',
     'You should spend about 40 minutes on this task. Write about the following topic: Artificial intelligence tools are increasingly used by students to complete schoolwork and university assignments. To what extent do the advantages of this development outweigh the disadvantages? Write at least 250 words.',
     NULL,
     '{"task": "QT_W2_ADV_DISADV"}'::jsonb,
     'MOCK_TEST', 'WRITING', 2400, 5, 0, 51),

    -- 4. Speaking Mock Tests
    ('40000000-0000-0000-0000-000000005005', '30000000-0000-0000-0000-000000001011',
     'Speaking Mock Test 1 - Part 2: An Important Decision',
     'Describe an important decision you made that had a positive result. You should say: what the decision was, when you had to make it, who helped you make it, and explain why it turned out to be a good decision.',
     NULL,
     '{"part": "QT_S_PART2", "prompt": "Describe an important decision you made that had a positive result. You should say: what the decision was, when you had to make it, who helped you make it, and explain why it turned out to be a good decision."}'::jsonb,
     'MOCK_TEST', 'SPEAKING', 180, 5, 0, 10),

    ('40000000-0000-0000-0000-000000005006', '30000000-0000-0000-0000-000000001011',
     'Speaking Mock Test 2 - Part 3: Technology & Human Connection',
     'Answer the following Part 3 discussion question in 45 to 90 seconds: Has modern communication technology brought people closer together, or has it made genuine relationships more difficult to maintain?',
     NULL,
     '{"part": "QT_S_PART3", "prompt": "Has modern communication technology brought people closer together, or has it made genuine relationships more difficult to maintain?"}'::jsonb,
     'MOCK_TEST', 'SPEAKING', 180, 5, 0, 11)
ON CONFLICT (id) DO NOTHING;

-- Question Groups for Reading & Listening Mock Tests
INSERT INTO question_groups (id, exercise_id, group_title, group_instruction, passage_reference, image_url, question_type, question_range, correct_answer_count, ordering)
VALUES
    ('60000000-0000-0000-0000-000000005011', '40000000-0000-0000-0000-000000005001', 'Questions 1-5',
     'Do the following statements agree with the information given in Reading Passage 2? Choose TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.',
     NULL, NULL, 'TRUE_FALSE', '1-5', 5, 1),
    ('60000000-0000-0000-0000-000000005012', '40000000-0000-0000-0000-000000005001', 'Questions 6-9',
     'Complete the sentences below. Choose ONE WORD ONLY from the passage for each answer.',
     NULL, NULL, 'FILL_BLANK', '6-9', 4, 2),
    ('60000000-0000-0000-0000-000000005013', '40000000-0000-0000-0000-000000005001', 'Questions 10-11',
     'Choose the correct letter, A, B, C or D.',
     NULL, NULL, 'MULTIPLE_CHOICE', '10-11', 2, 3),
    ('60000000-0000-0000-0000-000000005014', '40000000-0000-0000-0000-000000005001', 'Questions 12-13',
     'Reading Passage 2 has six paragraphs, A-F. Which paragraph contains the following information? Choose the correct letter, A-F.',
     NULL, NULL, 'MATCHING', '12-13', 2, 4),
    ('60000000-0000-0000-0000-000000005021', '40000000-0000-0000-0000-000000005002', 'Questions 1-6',
     'Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.',
     NULL, NULL, 'FILL_BLANK', '1-6', 6, 1),
    ('60000000-0000-0000-0000-000000005022', '40000000-0000-0000-0000-000000005002', 'Questions 7-10',
     'Choose the correct letter, A, B or C.',
     NULL, NULL, 'MULTIPLE_CHOICE', '7-10', 4, 2)
ON CONFLICT (id) DO NOTHING;

-- Questions for Reading Mock Test 1 (13 questions), Listening Mock Test 1 (10 questions), Writing (2), Speaking (2)
INSERT INTO questions (id, exercise_id, question_group_id, question_text, question_type, explanation, points, ordering)
VALUES
    -- Reading Mock Test 1
    ('50000000-0000-0000-0000-000000005101', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005011',
     'Researchers once believed that the brain switches off during sleep.', 'TRUE_FALSE',
     'Paragraph A: sleep was regarded as a passive state in which the body and brain switched off, a view later overturned.', 1, 1),
    ('50000000-0000-0000-0000-000000005102', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005011',
     'An adult has more deep sleep in the second half of the night than in the first half.', 'TRUE_FALSE',
     'Paragraph B: the proportion of deep sleep is greater in the first half of the night.', 1, 2),
    ('50000000-0000-0000-0000-000000005103', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005011',
     'In the memory experiment, both groups of students were tested at the same time of day.', 'TRUE_FALSE',
     'Paragraph C says both groups were tested but gives no information about the time of day.', 1, 3),
    ('50000000-0000-0000-0000-000000005104', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005011',
     'Volunteers who missed a night''s sleep reacted more strongly to unpleasant images.', 'TRUE_FALSE',
     'Paragraph D: volunteers kept awake for a night showed stronger emotional reactions to unpleasant images.', 1, 4),
    ('50000000-0000-0000-0000-000000005105', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005011',
     'Researchers have proved that lack of sleep is the only cause of weight gain.', 'TRUE_FALSE',
     'Paragraph D: researchers caution that the links do not prove that poor sleep is the only cause.', 1, 5),
    ('50000000-0000-0000-0000-000000005106', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005012',
     'Each cycle of sleep stages lasts roughly ______ minutes.', 'FILL_BLANK',
     'Paragraph A: a repeating cycle of stages that each last roughly ninety minutes.', 1, 6),
    ('50000000-0000-0000-0000-000000005107', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005012',
     'Most vivid dreaming occurs during ______ sleep.', 'FILL_BLANK',
     'Paragraph B: in REM sleep the eyes move rapidly and most vivid dreaming occurs.', 1, 7),
    ('50000000-0000-0000-0000-000000005108', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005012',
     'During deep sleep, the brain ______ the day''s experiences.', 'FILL_BLANK',
     'Paragraph C: the brain replays the day''s experiences.', 1, 8),
    ('50000000-0000-0000-0000-000000005109', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005012',
     'The light from screens is thought to delay the release of a ______ that signals that it is time to rest.', 'FILL_BLANK',
     'Paragraph E: it delays the release of a hormone that signals to the body that it is time to rest.', 1, 9),
    ('50000000-0000-0000-0000-000000005110', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005013',
     'According to paragraph C, what do scientists believe happens during deep sleep?', 'MULTIPLE_CHOICE',
     'Paragraph C: during deep sleep the brain replays the day''s experiences, transferring important information to long-term memory.', 1, 10),
    ('50000000-0000-0000-0000-000000005111', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005013',
     'What is the main point made in paragraph F?', 'MULTIPLE_CHOICE',
     'Paragraph F: a few people need less sleep, but for the majority the advice is regular times, a dark quiet room and no screens before bed.', 1, 11),
    ('50000000-0000-0000-0000-000000005112', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005014',
     'a reference to a method used to study sleeping volunteers', 'MATCHING',
     'Paragraph A: researchers attached sensors to sleeping volunteers.', 1, 12),
    ('50000000-0000-0000-0000-000000005113', '40000000-0000-0000-0000-000000005001', '60000000-0000-0000-0000-000000005014',
     'an example of how schools have adapted to research on sleep', 'MATCHING',
     'Paragraph E: some schools have started lessons later.', 1, 13),

    -- Listening Mock Test 1
    ('50000000-0000-0000-0000-000000005201', '40000000-0000-0000-0000-000000005002', '60000000-0000-0000-0000-000000005021',
     'Surname: ______', 'FILL_BLANK',
     'The surname is spelled P-R-Y-C-E, after Sam suggests the wrong spelling.', 1, 1),
    ('50000000-0000-0000-0000-000000005202', '40000000-0000-0000-0000-000000005002', '60000000-0000-0000-0000-000000005021',
     'Mobile number: 07700 ______', 'FILL_BLANK',
     'Hannah gives her number as 07700 900415.', 1, 2),
    ('50000000-0000-0000-0000-000000005203', '40000000-0000-0000-0000-000000005002', '60000000-0000-0000-0000-000000005021',
     'Address: 27 ______ Road', 'FILL_BLANK',
     'Hannah says Twenty-seven Willow Road and spells Willow.', 1, 3),
    ('50000000-0000-0000-0000-000000005204', '40000000-0000-0000-0000-000000005002', '60000000-0000-0000-0000-000000005021',
     'Type of membership: ______', 'FILL_BLANK',
     'She is studying part-time, so she chooses student membership.', 1, 4),
    ('50000000-0000-0000-0000-000000005205', '40000000-0000-0000-0000-000000005002', '60000000-0000-0000-0000-000000005021',
     'Fee this month: £______', 'FILL_BLANK',
     'Student membership is normally eight pounds, but this month''s offer is five pounds.', 1, 5),
    ('50000000-0000-0000-0000-000000005206', '40000000-0000-0000-0000-000000005002', '60000000-0000-0000-0000-000000005021',
     'Card will be ready on: ______', 'FILL_BLANK',
     'Sam says the card will be ready on Thursday; Wednesday is when the library is closed.', 1, 6),
    ('50000000-0000-0000-0000-000000005207', '40000000-0000-0000-0000-000000005002', '60000000-0000-0000-0000-000000005022',
     'Which document should Hannah bring as proof of address?', 'MULTIPLE_CHOICE',
     'A passport does not show the address and college letters are not accepted. A bank statement or utility bill is fine.', 1, 7),
    ('50000000-0000-0000-0000-000000005208', '40000000-0000-0000-0000-000000005002', '60000000-0000-0000-0000-000000005022',
     'How many books can members borrow at one time?', 'MULTIPLE_CHOICE',
     'It used to be eight, but members can now borrow up to ten.', 1, 8),
    ('50000000-0000-0000-0000-000000005209', '40000000-0000-0000-0000-000000005002', '60000000-0000-0000-0000-000000005022',
     'How can Hannah book a study room?', 'MULTIPLE_CHOICE',
     'Study rooms can only be booked online; the desk and phone are not accepted.', 1, 9),
    ('50000000-0000-0000-0000-000000005210', '40000000-0000-0000-0000-000000005002', '60000000-0000-0000-0000-000000005022',
     'On which day does the library stay open late?', 'MULTIPLE_CHOICE',
     'On Tuesdays the library stays open until eight.', 1, 10),

    -- Writing Mock Tests
    ('50000000-0000-0000-0000-000000005301', '40000000-0000-0000-0000-000000005003', NULL,
     'Many companies now allow employees to work from home instead of commuting to offices in big cities. Some people think this trend improves quality of life, while others believe it harms teamwork and urban economies. Discuss both views and give your own opinion.',
     'ESSAY', NULL, 9, 1),
    ('50000000-0000-0000-0000-000000005302', '40000000-0000-0000-0000-000000005004', NULL,
     'Artificial intelligence tools are increasingly used by students to complete schoolwork and university assignments. To what extent do the advantages of this development outweigh the disadvantages?',
     'ESSAY', NULL, 9, 1),

    -- Speaking Mock Tests
    ('50000000-0000-0000-0000-000000005401', '40000000-0000-0000-0000-000000005005', NULL,
     'Describe an important decision you made that had a positive result. You should say: what the decision was, when you had to make it, who helped you make it, and explain why it turned out to be a good decision.',
     'SPEAKING', NULL, 9, 1),
    ('50000000-0000-0000-0000-000000005402', '40000000-0000-0000-0000-000000005006', NULL,
     'Has modern communication technology brought people closer together, or has it made genuine relationships more difficult to maintain?',
     'SPEAKING', NULL, 9, 1)
ON CONFLICT (id) DO NOTHING;

-- Question Options for Reading Mock Test 1 & Listening Mock Test 1
INSERT INTO question_options (id, question_id, option_text, is_correct, point, ordering)
VALUES
    -- Reading Q1-5 (TRUE / FALSE / NOT GIVEN)
    ('70000000-0000-0000-0000-000000005101', '50000000-0000-0000-0000-000000005101', 'TRUE', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005102', '50000000-0000-0000-0000-000000005101', 'FALSE', FALSE, 0, 2),
    ('70000000-0000-0000-0000-000000005103', '50000000-0000-0000-0000-000000005101', 'NOT GIVEN', FALSE, 0, 3),

    ('70000000-0000-0000-0000-000000005104', '50000000-0000-0000-0000-000000005102', 'TRUE', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000005105', '50000000-0000-0000-0000-000000005102', 'FALSE', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000005106', '50000000-0000-0000-0000-000000005102', 'NOT GIVEN', FALSE, 0, 3),

    ('70000000-0000-0000-0000-000000005107', '50000000-0000-0000-0000-000000005103', 'TRUE', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000005108', '50000000-0000-0000-0000-000000005103', 'FALSE', FALSE, 0, 2),
    ('70000000-0000-0000-0000-000000005109', '50000000-0000-0000-0000-000000005103', 'NOT GIVEN', TRUE, 1, 3),

    ('70000000-0000-0000-0000-000000005110', '50000000-0000-0000-0000-000000005104', 'TRUE', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005111', '50000000-0000-0000-0000-000000005104', 'FALSE', FALSE, 0, 2),
    ('70000000-0000-0000-0000-000000005112', '50000000-0000-0000-0000-000000005104', 'NOT GIVEN', FALSE, 0, 3),

    ('70000000-0000-0000-0000-000000005113', '50000000-0000-0000-0000-000000005105', 'TRUE', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000005114', '50000000-0000-0000-0000-000000005105', 'FALSE', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000005115', '50000000-0000-0000-0000-000000005105', 'NOT GIVEN', FALSE, 0, 3),

    -- Reading Q6-9 (FILL_BLANK)
    ('70000000-0000-0000-0000-000000005116', '50000000-0000-0000-0000-000000005106', 'ninety', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005117', '50000000-0000-0000-0000-000000005106', '90', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000005118', '50000000-0000-0000-0000-000000005107', 'REM', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005119', '50000000-0000-0000-0000-000000005107', 'rem', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000005120', '50000000-0000-0000-0000-000000005108', 'replays', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005121', '50000000-0000-0000-0000-000000005109', 'hormone', TRUE, 1, 1),

    -- Reading Q10-11 (MULTIPLE_CHOICE)
    ('70000000-0000-0000-0000-000000005122', '50000000-0000-0000-0000-000000005110', 'A. The brain stores new words in a temporary area.', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000005123', '50000000-0000-0000-0000-000000005110', 'B. The brain replays experiences and moves important information into long-term memory.', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000005124', '50000000-0000-0000-0000-000000005110', 'C. The brain forgets unimportant information completely.', FALSE, 0, 3),
    ('70000000-0000-0000-0000-000000005125', '50000000-0000-0000-0000-000000005110', 'D. The brain prepares itself for vivid dreaming.', FALSE, 0, 4),

    ('70000000-0000-0000-0000-000000005126', '50000000-0000-0000-0000-000000005111', 'A. Most people need far less sleep than doctors recommend.', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000005127', '50000000-0000-0000-0000-000000005111', 'B. A rare gene makes people sleep badly.', FALSE, 0, 2),
    ('70000000-0000-0000-0000-000000005128', '50000000-0000-0000-0000-000000005111', 'C. Sleep needs vary, but good habits help most people.', TRUE, 1, 3),
    ('70000000-0000-0000-0000-000000005129', '50000000-0000-0000-0000-000000005111', 'D. Teenagers should avoid sleeping during the day.', FALSE, 0, 4),

    -- Reading Q12-13 (MATCHING)
    ('70000000-0000-0000-0000-000000005130', '50000000-0000-0000-0000-000000005112', 'A', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005131', '50000000-0000-0000-0000-000000005112', 'B', FALSE, 0, 2),
    ('70000000-0000-0000-0000-000000005132', '50000000-0000-0000-0000-000000005112', 'C', FALSE, 0, 3),
    ('70000000-0000-0000-0000-000000005133', '50000000-0000-0000-0000-000000005112', 'D', FALSE, 0, 4),
    ('70000000-0000-0000-0000-000000005134', '50000000-0000-0000-0000-000000005112', 'E', FALSE, 0, 5),
    ('70000000-0000-0000-0000-000000005135', '50000000-0000-0000-0000-000000005112', 'F', FALSE, 0, 6),

    ('70000000-0000-0000-0000-000000005136', '50000000-0000-0000-0000-000000005113', 'A', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000005137', '50000000-0000-0000-0000-000000005113', 'B', FALSE, 0, 2),
    ('70000000-0000-0000-0000-000000005138', '50000000-0000-0000-0000-000000005113', 'C', FALSE, 0, 3),
    ('70000000-0000-0000-0000-000000005139', '50000000-0000-0000-0000-000000005113', 'D', FALSE, 0, 4),
    ('70000000-0000-0000-0000-000000005140', '50000000-0000-0000-0000-000000005113', 'E', TRUE, 1, 5),
    ('70000000-0000-0000-0000-000000005141', '50000000-0000-0000-0000-000000005113', 'F', FALSE, 0, 6),

    -- Listening Q1-6 (FILL_BLANK)
    ('70000000-0000-0000-0000-000000005201', '50000000-0000-0000-0000-000000005201', 'Pryce', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005202', '50000000-0000-0000-0000-000000005202', '900415', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005203', '50000000-0000-0000-0000-000000005202', '900 415', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000005204', '50000000-0000-0000-0000-000000005203', 'Willow', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005205', '50000000-0000-0000-0000-000000005204', 'student', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005206', '50000000-0000-0000-0000-000000005205', '5', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005207', '50000000-0000-0000-0000-000000005205', 'five', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000005208', '50000000-0000-0000-0000-000000005206', 'Thursday', TRUE, 1, 1),
    ('70000000-0000-0000-0000-000000005209', '50000000-0000-0000-0000-000000005206', 'thursday', TRUE, 1, 2),

    -- Listening Q7-10 (MULTIPLE_CHOICE)
    ('70000000-0000-0000-0000-000000005210', '50000000-0000-0000-0000-000000005207', 'A. her passport', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000005211', '50000000-0000-0000-0000-000000005207', 'B. a recent bank statement', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000005212', '50000000-0000-0000-0000-000000005207', 'C. a letter from her college', FALSE, 0, 3),

    ('70000000-0000-0000-0000-000000005213', '50000000-0000-0000-0000-000000005208', 'A. 6', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000005214', '50000000-0000-0000-0000-000000005208', 'B. 8', FALSE, 0, 2),
    ('70000000-0000-0000-0000-000000005215', '50000000-0000-0000-0000-000000005208', 'C. 10', TRUE, 1, 3),

    ('70000000-0000-0000-0000-000000005216', '50000000-0000-0000-0000-000000005209', 'A. at the desk', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000005217', '50000000-0000-0000-0000-000000005209', 'B. online', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000005218', '50000000-0000-0000-0000-000000005209', 'C. by phone', FALSE, 0, 3),

    ('70000000-0000-0000-0000-000000005219', '50000000-0000-0000-0000-000000005210', 'A. Monday', FALSE, 0, 1),
    ('70000000-0000-0000-0000-000000005220', '50000000-0000-0000-0000-000000005210', 'B. Tuesday', TRUE, 1, 2),
    ('70000000-0000-0000-0000-000000005221', '50000000-0000-0000-0000-000000005210', 'C. Friday', FALSE, 0, 3)
ON CONFLICT (id) DO NOTHING;
