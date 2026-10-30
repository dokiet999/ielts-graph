import nodesCsv from '../../../kg/data/nodes.csv?raw'
import relationshipsCsv from '../../../kg/data/relationships.csv?raw'
import type { KgNodeRef, KgRecommendation, KgRecommendations, KgSkill } from '@/lib/types'

// In-memory Knowledge Graph built from the same seed CSV files Neo4j loads (kg/data), and the
// rules of KgRecommendationServiceImpl (docs/kg-api-contract.md), so mock mode recommends what
// the real backend would.

/** RFC 4180 CSV: quoted fields may contain commas and "" for a quote. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field || row.length) rows.push([...row, field])
  const [header, ...body] = rows.filter((r) => r.some((f) => f !== ''))
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

const nodes = new Map(parseCsv(nodesCsv).map((n) => [n.id, n]))
const relationships = parseCsv(relationshipsCsv)

const edges = (type: string) =>
  relationships.filter((r) => r.type === type).map((r) => [r.from_id, r.to_id] as const)
const has = (type: string) => {
  const set = new Set(edges(type).map(([a, b]) => `${a}>${b}`))
  return (from: string, to: string) => set.has(`${from}>${to}`)
}

const hasSubSkill = edges('HAS_SUBSKILL')
const affects = edges('AFFECTS')
const practices = edges('PRACTICES')
const fixes = has('FIXES')
const practicesSubSkill = has('PRACTICES')
const suitableFor = edges('SUITABLE_FOR')
const resources = [...nodes.values()].filter((n) => n.label === 'Resource').map((n) => n.id)

const ref = (id: string): KgNodeRef => ({
  id,
  nameVi: nodes.get(id)?.name_vi || null,
  nameEn: nodes.get(id)?.name_en || null,
})

/** Criterion of `skill` that has the SubSkill, smallest id first. */
const criterionOf = (subSkill: string, skill: KgSkill) =>
  hasSubSkill
    .filter(([c, s]) => s === subSkill && nodes.get(c)?.skill === skill)
    .map(([c]) => c)
    .sort()[0]

const bandsOf = (resource: string) =>
  suitableFor.filter(([r]) => r === resource).map(([, b]) => Number(nodes.get(b)?.value))

export class KgRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: unknown = null,
  ) {
    super(message)
  }
}

const invalid = (message: string) => new KgRequestError('KG_INVALID_PARAM', message)

function parseInteger(raw: string, name: string) {
  if (!/^\s*-?\d+\s*$/.test(raw)) throw invalid(`Parameter '${name}' must be an integer`)
  return Number(raw)
}

export function recommend(params: URLSearchParams): KgRecommendations {
  const skill = params.get('skill')
  if (skill !== 'SKILL_W' && skill !== 'SKILL_S') {
    throw invalid("Parameter 'skill' must be SKILL_W or SKILL_S")
  }
  const raw = params.get('errors')
  if (!raw?.trim()) throw invalid("Parameter 'errors' is required")
  const errors = raw.split(',').map((e) => e.trim())
  if (errors.length > 10)
    throw invalid("Parameter 'errors' must contain between 1 and 10 error codes")
  if (errors.some((e) => !e)) throw invalid("Parameter 'errors' must not contain empty error codes")
  if (new Set(errors).size !== errors.length) {
    throw invalid("Parameter 'errors' must not contain duplicate error codes")
  }
  const bandRaw = params.get('band')
  const bandRequested = bandRaw === null ? null : parseInteger(bandRaw, 'band')
  const bandApplied = bandRequested === null ? null : Math.max(4, Math.min(8, bandRequested))
  const limitRaw = params.get('limitPerError')
  const limit = limitRaw === null ? 3 : parseInteger(limitRaw, 'limitPerError')
  if (limit < 1 || limit > 5) throw invalid("Parameter 'limitPerError' must be between 1 and 5")

  const unknown = errors.filter((e) => nodes.get(e)?.label !== 'ErrorType')
  if (unknown.length) {
    throw new KgRequestError(
      'KG_UNKNOWN_ERROR_CODE',
      "Unknown error code(s) in parameter 'errors'",
      unknown,
    )
  }

  // A Resource is eligible only if it practices a SubSkill of a Criterion of `skill`.
  const eligible = resources.filter((r) =>
    practices.some(([from, s]) => from === r && criterionOf(s, skill)),
  )

  const recommendations: KgRecommendation[] = []
  const unmatchedErrors: string[] = []
  for (const error of errors) {
    const subSkills = affects
      .filter(([e, s]) => e === error && criterionOf(s, skill))
      .map(([, s]) => s)
      .sort()
    const candidates = eligible
      .filter((r) => fixes(r, error) || subSkills.some((s) => practicesSubSkill(r, s)))
      .map((r) => {
        // Path: a SubSkill the Resource practices first, then the smallest id.
        const subSkill = subSkills.find((s) => practicesSubSkill(r, s)) ?? subSkills[0]
        const bands = bandsOf(r)
        let bandMatch: KgRecommendation['bandMatch'] = 'any'
        let rank = 0
        let distance = 0
        let nearest = 0
        if (bandApplied !== null && bands.length) {
          if (bands.includes(bandApplied)) {
            bandMatch = 'exact'
            nearest = bandApplied
          } else {
            bandMatch = 'nearest'
            rank = 1
            ;[distance, nearest] = bands
              .map((b) => [Math.abs(b - bandApplied), b] as const)
              .sort((a, b) => a[0] - b[0] || a[1] - b[1])[0]
          }
        }
        return { r, subSkill, bandMatch, fixes: fixes(r, error), rank, distance, nearest }
      })
      .sort(
        (a, b) =>
          Number(b.fixes) - Number(a.fixes) ||
          a.rank - b.rank ||
          a.distance - b.distance ||
          a.nearest - b.nearest ||
          a.r.localeCompare(b.r),
      )
      .slice(0, limit)

    if (!subSkills.length || !candidates.length) {
      unmatchedErrors.push(error)
      continue
    }
    for (const c of candidates) {
      const node = nodes.get(c.r)!
      recommendations.push({
        resourceId: c.r,
        nameVi: node.name_vi || null,
        nameEn: node.name_en || null,
        type: node.resource_type || null,
        sqlRef: node.sql_ref || null,
        bandMatch: c.bandMatch,
        path: {
          errorType: ref(error),
          subSkill: ref(c.subSkill),
          criterion: ref(criterionOf(c.subSkill, skill)),
        },
      })
    }
  }
  return { skill, bandRequested, bandApplied, recommendations, unmatchedErrors }
}
