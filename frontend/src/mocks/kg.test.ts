import { describe, expect, it } from 'vitest'
import sample from '../../../docs/kg-recommendations.sample.json'
import { exercises } from './fixtures/courses'
import { KgRequestError, recommend } from './kg'

const run = (query: string) => recommend(new URLSearchParams(query))

function codeOf(query: string) {
  try {
    run(query)
  } catch (e) {
    return e instanceof KgRequestError ? e.code : 'other'
  }
  return null
}

describe('mock Knowledge Graph', () => {
  it('answers the contract sample request with the contract sample response', () => {
    expect(
      run(
        'skill=SKILL_W&errors=ERR_ARTICLE,ERR_NO_OVERVIEW,ERR_LINKER_OVERUSE,ERR_LONG_PAUSE&band=5',
      ),
    ).toEqual(sample)
  })

  it('never recommends a Speaking-only error for Writing, and keeps the request order', () => {
    const res = run('skill=SKILL_S&errors=ERR_SVA,ERR_NO_OVERVIEW,ERR_LONG_PAUSE')
    expect(res.recommendations.map((r) => r.path.errorType.id)).toEqual(['ERR_SVA'])
    expect(res.recommendations[0].path.criterion.id).toBe('CRIT_S_GRA')
    expect(res.unmatchedErrors).toEqual(['ERR_NO_OVERVIEW', 'ERR_LONG_PAUSE'])
  })

  it('clamps the band and marks nearest matches', () => {
    const res = run('skill=SKILL_W&errors=ERR_ARTICLE&band=9')
    expect(res.bandRequested).toBe(9)
    expect(res.bandApplied).toBe(8)
    expect(res.recommendations.every((r) => r.bandMatch === 'nearest')).toBe(true)
  })

  it('rejects invalid parameters like the backend', () => {
    expect(codeOf('skill=SKILL_R&errors=ERR_ARTICLE')).toBe('KG_INVALID_PARAM')
    expect(codeOf('skill=SKILL_W&errors=')).toBe('KG_INVALID_PARAM')
    expect(codeOf('skill=SKILL_W&errors=ERR_ARTICLE,ERR_ARTICLE')).toBe('KG_INVALID_PARAM')
    expect(codeOf('skill=SKILL_W&errors=ERR_ARTICLE&limitPerError=6')).toBe('KG_INVALID_PARAM')
    expect(codeOf('skill=SKILL_W&errors=ERR_NOPE')).toBe('KG_UNKNOWN_ERROR_CODE')
  })

  it('links every recommended Resource to a drill that exists in the mock', () => {
    const ids = new Set(exercises.map((e) => e.id))
    const all = run(
      'skill=SKILL_W&limitPerError=5&errors=ERR_ARTICLE,ERR_VERB_TENSE,ERR_SVA,ERR_PREP,ERR_PUNCT,ERR_WORD_CHOICE,ERR_COLLOCATION,ERR_SPELLING,ERR_NO_OVERVIEW,ERR_UNDERDEVELOPED',
    )
    expect(all.recommendations.length).toBeGreaterThan(0)
    for (const r of all.recommendations)
      expect(ids.has(r.sqlRef!.replace('exercises:', ''))).toBe(true)
  })
})
