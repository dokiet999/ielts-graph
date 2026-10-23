import type {
  BeSpeakingFeatures,
  BeSpeakingFeedback,
  BeSpeakingPronunciation,
} from '@/lib/backend-types'

export const SAMPLE_SPEAKING_TRANSCRIPT =
  'Um, I want to talk about a city I visit last year, it is Da Nang. I go there with my family, and we stay in a small hotel near the beach. The weather was very good, so we swim every morning. Also, the food is, the food was really delicious, especially the seafood. I think it is a good place, because people is friendly and the sea is very beautiful. I want to go back there next summer.'

export const SAMPLE_SPEAKING_FEATURES: BeSpeakingFeatures = {
  duration_sec: 38.4,
  word_count: 79,
  speech_rate_wpm: 123.4,
  pause_count: 3,
  total_pause_sec: 4.2,
  longest_pause_sec: 1.6,
}

export const SAMPLE_SPEAKING_PRONUNCIATION: BeSpeakingPronunciation = {
  accuracy: 78.5,
  fluency: 72.0,
  completeness: 96.0,
  prosody: 68.0,
}

export function fakeSpeakingFeedback(part = 'QT_S_PART2'): BeSpeakingFeedback {
  return {
    schema_version: '1.0',
    part,
    overall_band: 6.0,
    out_of_calibration_range: false,
    criteria: {
      CRIT_S_FC: {
        band: 6,
        comment:
          'Người nói trả lời liền mạch và đủ thời lượng cho Part 2, nhưng có vài chỗ ngập ngừng ở đầu câu và một lần tự sửa lại.',
        evidence: [
          {
            quote: 'Um, I want to talk',
            error_type: 'ERR_LONG_PAUSE',
            suggestion:
              'Chuẩn bị sẵn câu mở đầu để vào bài ngay, thay vì ngập ngừng ở đầu.',
          },
          {
            quote: 'the food is, the food was',
            error_type: 'ERR_SELF_CORRECTION',
            suggestion: 'Xác định thì quá khứ ngay từ đầu để tránh phải sửa lại giữa câu.',
          },
        ],
      },
      CRIT_S_LR: {
        band: 6,
        comment:
          "Vốn từ đủ để kể về chuyến đi nhưng khá đơn giản và lặp lại từ 'very'; chưa dùng nhiều cụm từ ít phổ biến.",
        evidence: [
          {
            quote: 'the sea is very beautiful',
            error_type: 'ERR_REPETITION',
            suggestion:
              "Thay 'very beautiful' bằng 'stunning' hoặc 'breathtaking' để đa dạng cách diễn đạt.",
          },
        ],
      },
      CRIT_S_GRA: {
        band: 5,
        comment:
          "Có câu ghép và câu có 'because' nhưng lỗi thì động từ và hòa hợp chủ vị lặp lại nhiều lần.",
        evidence: [
          {
            quote: 'a city I visit last year',
            error_type: 'ERR_VERB_TENSE',
            suggestion: "Dùng quá khứ: 'a city I visited last year'.",
          },
          {
            quote: 'people is friendly',
            error_type: 'ERR_SVA',
            suggestion: "'People' là số nhiều nên dùng 'people are friendly'.",
          },
          {
            quote: 'we swim every morning',
            error_type: 'ERR_VERB_TENSE',
            suggestion: "Câu kể về quá khứ nên dùng 'we swam every morning'.",
          },
        ],
      },
      CRIT_S_P: {
        band: 6,
        comment:
          'Phát âm nhìn chung dễ hiểu, theo điểm phát âm đầu vào (accuracy 78.5, prosody 68); một vài từ chưa đúng trọng âm.',
        evidence: [
          {
            quote: 'really delicious',
            error_type: 'ERR_WORD_STRESS',
            suggestion: 'Nhấn trọng âm vào âm tiết thứ hai: de-LI-cious.',
          },
        ],
      },
    },
    summary:
      'Bài nói trôi chảy ở mức khá và kể được trọn vẹn về chuyến đi. Điểm cần cải thiện nhất là dùng đúng thì quá khứ và hòa hợp chủ vị, đồng thời đa dạng từ vựng.',
    improvements: [
      'Luyện kể chuyện trong quá khứ bằng thì quá khứ đơn',
      "Kiểm tra hòa hợp chủ vị với danh từ số nhiều như 'people'",
      "Học thêm từ đồng nghĩa với 'good' và 'beautiful' để tránh lặp từ",
    ],
  }
}
