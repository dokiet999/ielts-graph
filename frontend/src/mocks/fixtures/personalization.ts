import type {
  CriterionProfile,
  KgNodeRef,
  Personalization,
  ProfileSkill,
  SkillProfile,
  Weakness,
} from '@/lib/types'

// Mock of GET /api/personalization, close to what the backend returns for the V16 demo learner.

const n = (id: string, nameVi: string, nameEn: string): KgNodeRef => ({ id, nameVi, nameEn })

const GRA = n('CRIT_W_GRA', 'Phạm vi và độ chính xác ngữ pháp', 'Grammatical Range & Accuracy')
const LR = n('CRIT_W_LR', 'Nguồn từ vựng', 'Lexical Resource')
const TR = n('CRIT_W_TR', 'Đáp ứng đề bài', 'Task Response')
const CC = n('CRIT_W_CC', 'Mạch lạc và liên kết', 'Coherence & Cohesion')
const S_FC = n('CRIT_S_FC', 'Độ trôi chảy và mạch lạc', 'Fluency & Coherence')
const S_GRA = n('CRIT_S_GRA', 'Phạm vi và độ chính xác ngữ pháp', 'Grammatical Range & Accuracy')

const DATES = [
  '2026-09-14',
  '2026-09-21',
  '2026-09-28',
  '2026-10-05',
  '2026-10-12',
  '2026-10-19',
  '2026-10-26',
  '2026-11-02',
]
const W_BANDS = [5.5, 6, 6, 6, 6.5, 6.5, 7, 6.5]

const weakness = (
  w: Partial<Weakness> & Pick<Weakness, 'errorType' | 'subSkill' | 'criterion' | 'status'>,
): Weakness => ({
  occurrences: 1,
  recentOccurrences: 0,
  recentWindow: 3,
  cleanStreak: 0,
  lastSeenAt: '2026-11-02T20:00:00',
  mastery: 0.5,
  criterionBand: 6,
  targetBand: null,
  priority: 0.4,
  prerequisite: null,
  prerequisiteMastery: null,
  resources: [],
  ...w,
})

function criterion(
  c: KgNodeRef,
  band: number | null,
  subs: [string, string, number | null][],
): CriterionProfile {
  return {
    criterion: c,
    currentBand: band,
    gap: null,
    history: [],
    subSkills: subs.map(([id, name, mastery]) => ({
      subSkill: n(id, name, name),
      mastery,
      evidence: mastery === null ? null : 6,
    })),
  }
}

function writing(): SkillProfile {
  return {
    skill: 'WRITING',
    kgSkill: 'SKILL_W',
    targetBand: null,
    currentBand: 6.67,
    attemptCount: 8,
    bandHistory: DATES.map((d, i) => ({
      submissionId: `91000000-0000-0000-0000-00000000000${i + 1}`,
      gradedAt: `${d}T20:00:00`,
      band: W_BANDS[i],
    })),
    criteria: [
      criterion(TR, 6.67, [
        ['SUB_TASK_ADDRESS', 'Trả lời đủ đề', 0.81],
        ['SUB_POSITION', 'Nêu quan điểm', 0.81],
        ['SUB_IDEA_DEV', 'Phát triển ý', 0.36],
      ]),
      criterion(CC, 6.67, [
        ['SUB_LINKING', 'Từ nối', 0.55],
        ['SUB_PARAGRAPHING', 'Chia đoạn', 0.81],
        ['SUB_REFERENCING', 'Tham chiếu', 0.81],
      ]),
      criterion(LR, 6, [
        ['SUB_WORD_CHOICE', 'Chọn từ', 0.68],
        ['SUB_COLLOCATION', 'Kết hợp từ (collocation)', 0.41],
        ['SUB_PARAPHRASE', 'Diễn đạt lại (paraphrase)', 0.77],
      ]),
      criterion(GRA, 6.67, [
        ['SUB_ARTICLE', 'Mạo từ', 0.53],
        ['SUB_VERB_TENSE', 'Thì động từ', 0.26],
        ['SUB_AGREEMENT', 'Hòa hợp chủ - vị, số ít/số nhiều', 0.42],
        ['SUB_COMPLEX_SENTENCE', 'Câu phức', 0.68],
      ]),
    ],
    weaknesses: [
      weakness({
        errorType: n('ERR_COLLOCATION', 'Kết hợp từ không tự nhiên', 'Unnatural collocation'),
        subSkill: n('SUB_COLLOCATION', 'Kết hợp từ (collocation)', 'Collocation'),
        criterion: LR,
        status: 'WEAK',
        occurrences: 6,
        recentOccurrences: 2,
        mastery: 0.405,
        criterionBand: 6,
        priority: 0.497,
        resources: [
          {
            resourceId: 'RES_L_COLLOCATION_01',
            nameVi: 'Bài tập kết hợp từ (collocation)',
            nameEn: 'Collocation exercise',
            exerciseId: '60000000-0000-0000-0000-000000000008',
            fixesError: true,
            bands: [6],
            practicedCount: 0,
          },
        ],
      }),
      weakness({
        errorType: n('ERR_UNDERDEVELOPED', 'Ý chưa được phát triển', 'Underdeveloped ideas'),
        subSkill: n('SUB_IDEA_DEV', 'Phát triển ý', 'Idea development'),
        criterion: TR,
        status: 'WEAK',
        occurrences: 4,
        recentOccurrences: 2,
        mastery: 0.36,
        criterionBand: 6.67,
        priority: 0.52,
        resources: [
          {
            resourceId: 'RES_W2_IDEA_DEV_01',
            nameVi: 'Luyện phát triển ý và dẫn chứng',
            nameEn: 'Idea development',
            exerciseId: '60000000-0000-0000-0000-000000000017',
            fixesError: true,
            bands: [6],
            practicedCount: 0,
          },
        ],
      }),
      weakness({
        errorType: n('ERR_SENT_STRUCTURE', 'Lỗi cấu trúc câu phức', 'Sentence structure error'),
        subSkill: n('SUB_COMPLEX_SENTENCE', 'Câu phức', 'Complex sentences'),
        criterion: GRA,
        status: 'WEAK',
        occurrences: 2,
        recentOccurrences: 1,
        mastery: 0.682,
        criterionBand: 6.67,
        priority: 0.26,
        prerequisite: n('SUB_VERB_TENSE', 'Thì động từ', 'Verb tense'),
        prerequisiteMastery: 0.256,
        resources: [
          {
            resourceId: 'RES_G_COMPLEX_01',
            nameVi: 'Bài tập câu phức',
            nameEn: 'Complex sentences',
            exerciseId: '60000000-0000-0000-0000-000000000005',
            fixesError: true,
            bands: [6],
            practicedCount: 1,
          },
        ],
      }),
      weakness({
        errorType: n('ERR_VERB_TENSE', 'Lỗi thì động từ', 'Verb tense error'),
        subSkill: n('SUB_VERB_TENSE', 'Thì động từ', 'Verb tense'),
        criterion: GRA,
        status: 'IMPROVING',
        occurrences: 5,
        recentOccurrences: 1,
        cleanStreak: 1,
        lastSeenAt: '2026-10-26T20:00:00',
        mastery: 0.256,
        criterionBand: 6.67,
        priority: 0.47,
        resources: [
          {
            resourceId: 'RES_G_VERB_TENSE_01',
            nameVi: 'Bài tập thì động từ',
            nameEn: 'Verb tense exercise',
            exerciseId: '60000000-0000-0000-0000-000000000002',
            fixesError: true,
            bands: [5],
            practicedCount: 0,
          },
        ],
      }),
      weakness({
        errorType: n('ERR_ARTICLE', 'Lỗi mạo từ', 'Article error'),
        subSkill: n('SUB_ARTICLE', 'Mạo từ', 'Articles'),
        criterion: GRA,
        status: 'RESOLVED',
        occurrences: 4,
        cleanStreak: 4,
        lastSeenAt: '2026-10-05T20:00:00',
        mastery: 0.534,
        criterionBand: 6.67,
        priority: 0.27,
      }),
    ],
    gaps: [],
  }
}

function speaking(): SkillProfile {
  return {
    skill: 'SPEAKING',
    kgSkill: 'SKILL_S',
    targetBand: null,
    currentBand: 6.17,
    attemptCount: 6,
    bandHistory: [5.5, 5.5, 6, 6, 6, 6.5].map((band, i) => ({
      submissionId: `92000000-0000-0000-0000-00000000000${i + 1}`,
      gradedAt: `2026-10-0${i + 1}T21:00:00`,
      band,
    })),
    criteria: [
      criterion(S_FC, 6, [
        ['SUB_FLUENCY', 'Độ trôi chảy', 0.13],
        ['SUB_DISCOURSE_MARKER', 'Từ nối khi nói', 0.77],
        ['SUB_ANSWER_EXTEND', 'Mở rộng câu trả lời', 0.37],
      ]),
      criterion(S_GRA, 6, [
        ['SUB_VERB_TENSE', 'Thì động từ', 0.26],
        ['SUB_AGREEMENT', 'Hòa hợp chủ - vị, số ít/số nhiều', 0.42],
      ]),
    ],
    weaknesses: [
      weakness({
        errorType: n('ERR_LONG_PAUSE', 'Ngập ngừng kéo dài', 'Long pause'),
        subSkill: n('SUB_FLUENCY', 'Độ trôi chảy', 'Fluency'),
        criterion: S_FC,
        status: 'WEAK',
        occurrences: 6,
        recentOccurrences: 3,
        lastSeenAt: '2026-11-09T21:00:00',
        mastery: 0.125,
        criterionBand: 6,
        priority: 0.74,
      }),
      weakness({
        errorType: n('ERR_SHORT_ANSWER', 'Câu trả lời quá ngắn', 'Answer too short'),
        subSkill: n('SUB_ANSWER_EXTEND', 'Mở rộng câu trả lời', 'Extending answers'),
        criterion: S_FC,
        status: 'RESOLVED',
        occurrences: 3,
        cleanStreak: 3,
        lastSeenAt: '2026-10-08T21:00:00',
        mastery: 0.371,
      }),
    ],
    gaps: [],
  }
}

/** Fills the gaps from the target the same way the backend does. */
function withTarget(profile: SkillProfile, target: number | null): SkillProfile {
  const criteria = profile.criteria.map((c) => ({
    ...c,
    gap:
      target !== null && c.currentBand !== null
        ? Math.round((target - c.currentBand) * 100) / 100
        : null,
  }))
  const gaps = criteria
    .filter((c) => c.gap !== null && c.gap > 0)
    .map((c) => ({
      criterion: c.criterion,
      currentBand: c.currentBand,
      targetBand: target,
      gap: c.gap as number,
      activeErrorCount: profile.weaknesses.filter(
        (w) => w.status !== 'RESOLVED' && w.criterion.id === c.criterion.id,
      ).length,
    }))
    .sort((a, b) => b.gap - a.gap)
  return {
    ...profile,
    targetBand: target,
    criteria,
    gaps,
    weaknesses: profile.weaknesses.map((w) => ({ ...w, targetBand: target })),
  }
}

export function personalizationFixture(
  targets: Partial<Record<ProfileSkill, number>>,
): Personalization {
  return {
    skills: [
      withTarget(writing(), targets.WRITING ?? null),
      withTarget(speaking(), targets.SPEAKING ?? null),
    ],
  }
}
