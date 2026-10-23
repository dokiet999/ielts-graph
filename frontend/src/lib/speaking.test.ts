import { describe, expect, it } from 'vitest'
import {
  isRetryableSpeakingError,
  isSupportedAudioFilename,
  SPEAKING_CRITERIA,
  SPEAKING_CRITERIA_LABELS,
  speakingErrorLabel,
  speakingEvidenceHighlights,
  speakingPartInfo,
  speakingSubmitMessage,
} from './speaking'

describe('speaking criteria & error labels', () => {
  it('defines all 4 IELTS Speaking criteria', () => {
    expect(SPEAKING_CRITERIA).toEqual(['CRIT_S_FC', 'CRIT_S_LR', 'CRIT_S_GRA', 'CRIT_S_P'])
    for (const id of SPEAKING_CRITERIA) {
      expect(SPEAKING_CRITERIA_LABELS[id].name).toBeTruthy()
      expect(SPEAKING_CRITERIA_LABELS[id].hint).toBeTruthy()
    }
  })

  it('translates known speaking error codes and preserves unknown codes', () => {
    expect(speakingErrorLabel('ERR_LONG_PAUSE')).toBe('Ngập ngừng / ngừng lâu')
    expect(speakingErrorLabel('ERR_WORD_STRESS')).toBe('Sai trọng âm từ')
    expect(speakingErrorLabel('ERR_UNKNOWN')).toBe('ERR_UNKNOWN')
  })

  it('returns part info with fallback to Part 2', () => {
    expect(speakingPartInfo('QT_S_PART1').name).toBe('Speaking Part 1')
    expect(speakingPartInfo('QT_S_PART3').name).toBe('Speaking Part 3')
    expect(speakingPartInfo(null).name).toBe('Speaking Part 2')
  })
})

describe('audio validation & submit error helpers', () => {
  it('checks supported audio extensions case-insensitively', () => {
    expect(isSupportedAudioFilename('recording.webm')).toBe(true)
    expect(isSupportedAudioFilename('clip.MP3')).toBe(true)
    expect(isSupportedAudioFilename('voice.m4a')).toBe(true)
    expect(isSupportedAudioFilename('notes.txt')).toBe(false)
    expect(isSupportedAudioFilename('noext')).toBe(false)
  })

  it('maps backend error codes to Vietnamese messages', () => {
    expect(speakingSubmitMessage('UNSUPPORTED_AUDIO', 400)).toMatch(/Định dạng file/)
    expect(speakingSubmitMessage('AUDIO_TOO_SHORT', 400)).toMatch(/quá ngắn/)
    expect(speakingSubmitMessage('ASR_UNAVAILABLE', 503)).toMatch(/nhận diện giọng nói/)
    expect(speakingSubmitMessage('MAX_ATTEMPTS_REACHED', 409)).toMatch(/hết số lần/)
  })

  it('marks ASR and LLM errors as retryable and rule errors as non-retryable', () => {
    expect(isRetryableSpeakingError('ASR_TIMEOUT', 502)).toBe(true)
    expect(isRetryableSpeakingError('ASR_UNAVAILABLE', 503)).toBe(true)
    expect(isRetryableSpeakingError('LLM_UNAVAILABLE', 503)).toBe(true)
    expect(isRetryableSpeakingError('MAX_ATTEMPTS_REACHED', 409)).toBe(false)
    expect(isRetryableSpeakingError('UNSUPPORTED_AUDIO', 400)).toBe(false)
  })

  it('highlights evidence quotes inside transcript', () => {
    const transcript = 'Um, I want to talk about a city I visit last year.'
    const highlights = speakingEvidenceHighlights(transcript, [
      { quote: 'a city I visit last year', errorType: 'ERR_VERB_TENSE', suggestion: '' },
    ])
    expect(highlights).toHaveLength(1)
    expect(transcript.slice(highlights[0].start, highlights[0].end)).toBe(
      'a city I visit last year',
    )
  })
})
