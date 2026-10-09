// Extra sample exercises written for the mock API, in the same format as data/exercises/*.json.
import { q, type RawExercise } from './raw'

const TFNG = ['TRUE', 'FALSE', 'NOT GIVEN']
const tf = (answer: 'TRUE' | 'FALSE' | 'NOT GIVEN') =>
  TFNG.map((o) => (o === answer ? ([o, true] as [string, true]) : o))

export const quizLinking: RawExercise = {
  title: 'Linking words & paraphrase',
  instruction: 'Chọn 1 đáp án đúng cho mỗi câu.',
  audioUrl: null,
  content: null,
  exerciseType: 'LESSON',
  skillType: 'READING',
  timeLimit: null,
  maxAttempts: 99,
  questionGroups: [
    {
      groupTitle: 'Chọn 1 đáp án đúng',
      groupInstruction: null,
      questionType: 'MULTIPLE_CHOICE',
      questionRange: '1-5',
      questions: [
        q(
          1,
          'MULTIPLE_CHOICE',
          'The new railway line has reduced travel times. ______, it has created thousands of jobs.',
          ['However', ['In addition', true], 'Therefore', 'Otherwise'],
          '"In addition" thêm một lợi ích nữa của tuyến đường sắt, cùng chiều với câu trước.',
        ),
        q(
          2,
          'MULTIPLE_CHOICE',
          "Which phrase best paraphrases 'a sharp rise in prices'?",
          [
            'a gradual fall in costs',
            ['a dramatic increase in costs', true],
            'a slight change in value',
            'a steady price',
          ],
          '"sharp" ≈ "dramatic", "rise" ≈ "increase", "prices" ≈ "costs".',
        ),
        q(
          3,
          'MULTIPLE_CHOICE',
          'Many people prefer cycling to work ______ it is cheaper and healthier.',
          [['because', true], 'although', 'unless', 'despite'],
          'Vế sau là lý do của vế trước → dùng "because".',
        ),
        q(
          4,
          'MULTIPLE_CHOICE',
          "Typewriters became obsolete once personal computers were widely available. In this sentence, 'obsolete' most likely means:",
          ['popular', 'expensive', ['no longer used', true], 'carefully designed'],
          'Máy đánh chữ không còn được dùng khi máy tính phổ biến → "obsolete" = lỗi thời.',
        ),
        q(
          5,
          'MULTIPLE_CHOICE',
          'The museum was crowded; ______, we managed to see every exhibition.',
          [['nevertheless', true], 'as a result', 'for example', 'similarly'],
          'Hai vế đối lập (đông nhưng vẫn xem hết) → "nevertheless".',
        ),
      ],
    },
  ],
}

export const quizTfng: RawExercise = {
  title: 'Làm quen True / False / Not Given',
  instruction: 'Đọc trích đoạn và chọn TRUE, FALSE hoặc NOT GIVEN.',
  audioUrl: null,
  content: null,
  exerciseType: 'LESSON',
  skillType: 'READING',
  timeLimit: null,
  maxAttempts: 99,
  questionGroups: [
    {
      groupTitle: 'Chọn TRUE, FALSE hoặc NOT GIVEN',
      groupInstruction: null,
      questionType: 'TRUE_FALSE',
      questionRange: '1-4',
      questions: [
        q(
          1,
          'TRUE_FALSE',
          "Text: 'The bridge was completed in 1932, two years later than planned.'\nStatement: The bridge opened on schedule.",
          tf('FALSE'),
          'Cây cầu hoàn thành muộn hai năm so với kế hoạch → trái với "on schedule".',
        ),
        q(
          2,
          'TRUE_FALSE',
          "Text: 'Most visitors to the island arrive by ferry, although a small airport opened last year.'\nStatement: It is possible to reach the island by air.",
          tf('TRUE'),
          'Đảo có sân bay nhỏ → có thể đến bằng đường hàng không.',
        ),
        q(
          3,
          'TRUE_FALSE',
          "Text: 'The author's first novel sold poorly, but her second became a bestseller.'\nStatement: The author's second novel was made into a film.",
          tf('NOT GIVEN'),
          'Đoạn văn không nhắc tới việc chuyển thể thành phim.',
        ),
        q(
          4,
          'TRUE_FALSE',
          "Text: 'Bees are attracted mainly by the colour of flowers rather than their scent.'\nStatement: Scent is the main factor that attracts bees to flowers.",
          tf('FALSE'),
          'Màu sắc mới là yếu tố chính, không phải mùi hương.',
        ),
      ],
    },
  ],
}

export const quizListeningTraps: RawExercise = {
  title: 'Bẫy thường gặp trong Listening',
  instruction: 'Đọc lời người nói và chọn đáp án đúng.',
  audioUrl: null,
  content: null,
  exerciseType: 'LESSON',
  skillType: 'LISTENING',
  timeLimit: null,
  maxAttempts: 99,
  questionGroups: [
    {
      groupTitle: 'Chọn 1 đáp án đúng',
      groupInstruction: null,
      questionType: 'MULTIPLE_CHOICE',
      questionRange: '1-4',
      questions: [
        q(
          1,
          'MULTIPLE_CHOICE',
          "Speaker: 'The meeting was on Tuesday, but it's been moved to Thursday.'\nWhen is the meeting?",
          ['Tuesday', 'Wednesday', ['Thursday', true]],
          'Thông tin bị thay đổi ("moved to") — đáp án là thông tin sau cùng.',
        ),
        q(
          2,
          'MULTIPLE_CHOICE',
          "Speaker: 'It's usually forty pounds, but students get a ten-pound discount.'\nHow much does a student pay?",
          ['£10', ['£30', true], '£40'],
          '£40 trừ £10 giảm giá = £30.',
        ),
        q(
          3,
          'MULTIPLE_CHOICE',
          "Speaker: 'My surname is Fraser — F-R-A-S-E-R.'\nWhat is the surname?",
          ['Frazer', ['Fraser', true], 'Frasier'],
          'Luôn ghi theo phần đánh vần.',
        ),
        q(
          4,
          'MULTIPLE_CHOICE',
          "Speaker: 'I thought about the train, but in the end I took the coach because it was cheaper.'\nHow did the speaker travel?",
          ['by train', ['by coach', true], 'by car'],
          '"in the end" báo hiệu lựa chọn cuối cùng.',
        ),
      ],
    },
  ],
}

const HEADINGS = [
  'i. A deliberate choice of colour',
  'ii. The problems with early writing tools',
  'iii. A local discovery with wider uses',
  'iv. Why pencils became expensive',
  'v. A solution born of necessity',
  'vi. The decline of the pencil industry',
]
const heading = (correct: string) =>
  HEADINGS.map((h) => (h.startsWith(`${correct}.`) ? ([h, true] as [string, true]) : h))

export const readingPencil: RawExercise = {
  title: 'Reading Passage - The Story of the Pencil',
  instruction:
    'You should spend about 12 minutes on Questions 1-8, which are based on the passage below.',
  audioUrl: null,
  content: {
    passageTitle: 'The Story of the Pencil',
    subtitle: 'How a lucky find and a wartime shortage shaped one of the simplest tools we use',
    paragraphs: [
      {
        label: 'A',
        text: 'For most of history, people wrote with whatever was at hand: reeds dipped in ink, sticks of charcoal, or lumps of lead wrapped in string. None of these were satisfactory. Ink spilled, charcoal smudged, and lead left only a faint grey line while slowly poisoning those who used it every day.',
      },
      {
        label: 'B',
        text: 'The modern pencil began with an accident of geology. In the 1560s, a storm in the north of England is said to have uprooted a tree and exposed a deposit of unusually pure graphite. Local shepherds found that it marked their sheep clearly, and before long it was being cut into sticks and sold in London. Because it was so valuable, the mine was guarded and flooded between extractions to stop theft.',
      },
      {
        label: 'C',
        text: 'The English deposit was unique, and other countries had to find ways to make poor-quality graphite usable. In 1795, a French engineer, working at a time when war had cut France off from English supplies, discovered that powdered graphite mixed with clay and baked in a kiln produced a strong, smooth core. By changing the proportion of clay, he could make the core harder or softer – the origin of the grading system still printed on pencils today.',
      },
      {
        label: 'D',
        text: 'Manufacturing then moved from workshops to factories. In the nineteenth century, machines were developed to cut grooves in wooden slats, lay cores inside them and glue a second slat on top, so that thousands of identical pencils could be produced each day. The yellow paint that became standard in North America was originally a marketing decision: it was meant to suggest that the graphite came from China, where yellow was associated with royalty.',
      },
    ],
  },
  exerciseType: 'PRACTICE',
  skillType: 'READING',
  timeLimit: 720,
  maxAttempts: 99,
  questionGroups: [
    {
      groupTitle: 'Questions 1-4',
      groupInstruction:
        'The passage has four paragraphs, A-D. Choose the correct heading for each paragraph from the list of headings.',
      questionType: 'DROPLIST',
      questionRange: '1-4',
      questions: [
        q(
          1,
          'DROPLIST',
          'Paragraph A',
          heading('ii'),
          'Paragraph A mô tả các vấn đề của mực, than và chì.',
        ),
        q(
          2,
          'DROPLIST',
          'Paragraph B',
          heading('iii'),
          'Mỏ graphite ở Anh được phát hiện tình cờ và nhanh chóng được dùng rộng rãi.',
        ),
        q(
          3,
          'DROPLIST',
          'Paragraph C',
          heading('v'),
          'Chiến tranh cắt nguồn cung buộc Pháp tìm ra cách trộn graphite với đất sét.',
        ),
        q(
          4,
          'DROPLIST',
          'Paragraph D',
          heading('i'),
          'Màu vàng là một quyết định marketing có chủ đích.',
        ),
      ],
    },
    {
      groupTitle: 'Question 5',
      groupInstruction: 'Choose TWO letters, A-E.',
      questionType: 'MULTIPLE_CHOICE',
      questionRange: '5',
      questions: [
        q(
          5,
          'MULTIPLE_CHOICE',
          'Which TWO statements about the English graphite mine are mentioned in the passage?',
          [
            ['A. It was protected to prevent theft.', true],
            'B. It was discovered by miners searching for lead.',
            ['C. Its graphite was first used by shepherds.', true],
            'D. It produced graphite for more than three centuries.',
            'E. It was owned by the government.',
          ],
          'Paragraph B: mỏ được canh gác và làm ngập nước để chống trộm; người chăn cừu dùng graphite để đánh dấu cừu.',
        ),
      ],
    },
    {
      groupTitle: 'Questions 6-8',
      groupInstruction:
        'Do the following statements agree with the information given in the passage? Choose TRUE, FALSE or NOT GIVEN.',
      questionType: 'TRUE_FALSE',
      questionRange: '6-8',
      questions: [
        q(
          6,
          'TRUE_FALSE',
          'Lead was harmful to people who used it regularly.',
          tf('TRUE'),
          'Paragraph A: lead was "slowly poisoning those who used it every day".',
        ),
        q(
          7,
          'TRUE_FALSE',
          'The French engineer was the first person to use clay in writing materials.',
          tf('NOT GIVEN'),
          'Paragraph C chỉ nói ông trộn graphite với đất sét, không nói ông là người đầu tiên dùng đất sét.',
        ),
        q(
          8,
          'TRUE_FALSE',
          'The yellow colour of North American pencils was chosen for practical reasons.',
          tf('FALSE'),
          'Paragraph D: đó là quyết định marketing, không phải lý do thực tế.',
        ),
      ],
    },
  ],
}

export const listeningLibrary: RawExercise = {
  title: 'Listening Section 2 - Westfield Library Tour',
  instruction:
    'You will hear a guide talking to a group of new members at a library. Answer Questions 1-7.',
  audioUrl: null,
  content: {
    sectionTitle: 'Section 2',
    transcript: [
      {
        speaker: 'Guide',
        text: "Good morning, everyone, and welcome to Westfield Library. I'm Sarah and I'll be showing you around today.",
      },
      {
        speaker: 'Guide',
        text: 'First, some practical information. During the week we open at half past eight in the morning, which is earlier than most libraries in the area, and we close at eight in the evening. At weekends we open at ten.',
      },
      {
        speaker: 'Guide',
        text: "Once you've joined, you can borrow up to twelve books at a time. We used to allow fifteen, but so many items weren't coming back that we had to reduce the number.",
      },
      {
        speaker: 'Guide',
        text: "If you return something late, you'll pay twenty pence for each day it's overdue. It used to be ten pence, but the price went up this year.",
      },
      {
        speaker: 'Guide',
        text: "Now, the building itself. Here on the ground floor you'll find the information desk and, just behind me, our new café, which is very popular with students.",
      },
      {
        speaker: 'Guide',
        text: "If you're looking for children's books, they're downstairs in the basement, where there's plenty of space for story sessions.",
      },
      {
        speaker: 'Guide',
        text: 'The computers are on the first floor, along with the printers. The second floor holds our reference collection.',
      },
      {
        speaker: 'Guide',
        text: 'And finally, if you need complete silence, the quiet study room is right at the top of the building, on the third floor.',
      },
    ],
  },
  exerciseType: 'PRACTICE',
  skillType: 'LISTENING',
  timeLimit: 480,
  maxAttempts: 99,
  questionGroups: [
    {
      groupTitle: 'Questions 1-4',
      groupInstruction: 'Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.',
      questionType: 'FILL_BLANK',
      questionRange: '1-4',
      questions: [
        q(
          1,
          'FILL_BLANK',
          'Weekday opening time: ______ a.m.',
          [
            ['8.30', true],
            ['8:30', true],
            ['half past eight', true],
          ],
          '"we open at half past eight in the morning".',
        ),
        q(
          2,
          'FILL_BLANK',
          'Members can borrow up to ______ books at a time.',
          [
            ['12', true],
            ['twelve', true],
          ],
          '"up to twelve books" — 15 là con số cũ.',
        ),
        q(
          3,
          'FILL_BLANK',
          'Late returns cost ______ pence per day.',
          [
            ['20', true],
            ['twenty', true],
          ],
          '"twenty pence for each day" — 10 pence là mức cũ.',
        ),
        q(
          4,
          'FILL_BLANK',
          'The quiet study room is on the ______ floor.',
          [
            ['third', true],
            ['3rd', true],
          ],
          '"right at the top of the building, on the third floor".',
        ),
      ],
    },
    {
      groupTitle: 'Questions 5-7',
      groupInstruction:
        'Where can visitors find the following? Choose the correct letter, A-D.\nA  ground floor\nB  first floor\nC  second floor\nD  basement',
      questionType: 'MATCHING',
      questionRange: '5-7',
      questions: [
        q(
          5,
          'MATCHING',
          "children's books",
          ['A', 'B', 'C', ['D', true]],
          '"downstairs in the basement".',
        ),
        q(
          6,
          'MATCHING',
          'computers',
          ['A', ['B', true], 'C', 'D'],
          '"The computers are on the first floor".',
        ),
        q(
          7,
          'MATCHING',
          'café',
          [['A', true], 'B', 'C', 'D'],
          '"Here on the ground floor ... our new café".',
        ),
      ],
    },
  ],
}
