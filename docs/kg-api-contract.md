# KG Recommendations API contract (W5)

Returns practice Resources for the errors found by the AI grader, by walking the Knowledge Graph:
`ErrorType -AFFECTS-> SubSkill <-HAS_SUBSKILL- Criterion`, then `Resource -FIXES-> ErrorType` or `Resource -PRACTICES-> SubSkill`.

Ontology v0 IDs (`ERR_*`, `SUB_*`, `CRIT_*`, `RES_*`, ...) are frozen for W5. Any change needs an ADR.

## Request

`GET /api/kg/recommendations?skill=SKILL_W&errors=ERR_ARTICLE,ERR_NO_OVERVIEW&band=5&limitPerError=3`

| Param | Required | Description |
|---|---|---|
| `skill` | yes | `SKILL_W` or `SKILL_S`. Picks the Criterion when a SubSkill belongs to both (e.g. `SUB_ARTICLE`), and drops errors of the other skill. |
| `errors` | yes | 1-10 distinct `ERR_*` IDs, comma-separated. Order is kept in the response. |
| `band` | no | Integer 4-8; values outside are clamped. Omitted = no band preference. |
| `limitPerError` | no | Default 3, max 5. |

Auth: logged-in user, same as submission results.

## Response 200

See [kg-recommendations.sample.json](kg-recommendations.sample.json).

| Field | Description |
|---|---|
| `skill`, `bandRequested`, `bandApplied` | Echo of the request. `bandApplied` is the clamped value, `null` if no band was given. |
| `recommendations[]` | Flat list, grouped in input error order. |
| `recommendations[].resourceId` | Resource ID in the KG, e.g. `RES_W_ARTICLE_01`. |
| `recommendations[].nameVi`, `nameEn` | Display names. The UI shows `nameVi`. |
| `recommendations[].type` | `exercise` or `lesson`. |
| `recommendations[].sqlRef` | `<table>:<uuid>` where table is `exercises` or `lessons`. Open it with `GET /api/exercises/{uuid}` or `GET /api/lessons/{uuid}`. The row must exist in Postgres (seeded by a Flyway migration). |
| `recommendations[].bandMatch` | `exact` (Resource is `SUITABLE_FOR` the band), `nearest` (closest band, ties go to the lower band), `any` (no band requested, or Resource has no band). |
| `recommendations[].path` | Why it was recommended: `errorType`, `subSkill`, `criterion`, each `{id, nameVi, nameEn}`. |
| `unmatchedErrors[]` | Input errors with no Resource, or not valid for `skill`. Not an error. |

## Rules

- A Resource is only eligible for `skill` if it `PRACTICES` a SubSkill that belongs to a Criterion of that skill
  (so a Speaking drill is never recommended for a Writing error, even if it also `FIXES` the same ErrorType).
- An eligible Resource matches an error if it `FIXES` the error, or `PRACTICES` a SubSkill that the error `AFFECTS`.
- If a Resource matches one error through both, it is returned once, with the `FIXES` path.
- `path.subSkill` is a SubSkill the error `AFFECTS` that has a Criterion of `skill` (prefer one the Resource `PRACTICES`,
  then the smallest `id`); `path.criterion` is that Criterion.
- The same Resource may appear under two different errors.
- Order per error: `FIXES` before `PRACTICES`, then `exact` before `nearest`, then (inside `nearest`) smaller band
  distance first, ties to the lower band, then `resourceId` ascending (deterministic).
- An empty result is `200` with `recommendations: []`.

## Errors

Body is the existing `ErrorResponse` (`code`, `message`, `details`, `timestamp`).

| HTTP | `code` | When |
|---|---|---|
| 400 | `KG_INVALID_PARAM` | Missing/invalid `skill`, `band`, `limitPerError`, or `errors` empty / over 10 / duplicated. |
| 400 | `KG_UNKNOWN_ERROR_CODE` | An ID in `errors` is not an ontology ErrorType. `details` lists the IDs. |
| 503 | `KG_UNAVAILABLE` | Neo4j unreachable. |
