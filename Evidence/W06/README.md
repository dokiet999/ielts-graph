# W6 evidence: skill state on synthetic learners (#36)

This folder shows how close the learner profile (`SkillStateUpdater`, rules in
[docs/learner-profile-rules.md](../../docs/learner-profile-rules.md)) gets to the hidden true mastery of the
60 synthetic learners in [data/learner_sim/](../../data/learner_sim/), week by week, over 8 weeks.

The 17,760 events of `interaction_logs.csv` are replayed through the Java `SkillStateUpdater` itself (no copy of
the formula). At the end of week k (events with time < 2026-09-07T00:00Z + 7k days) the estimate of all
60 x 25 (learner, SubSkill) pairs is compared with `true_mastery.csv`. A pair without events stays at 0.5.

## Reproduce

```bash
bash Evidence/W06/run.sh
```

It runs the simulation test with `-Dsim.write=true` (`SkillStateSimulationTest`, which writes `metrics.csv` and
`sensitivity.csv`), the profile unit tests (`test-results.txt`), `make_figures.py` and `make_manifest.py`.
It needs Java 21+ and Python with matplotlib; no database. A normal `./mvnw test` writes nothing.

## Results (default parameters)

| Week | MAE | Correlation | MAE of "always 0.5" |
|---|---|---|---|
| 0 | 0.1596 | – | 0.1596 |
| 1 | 0.1589 | 0.275 | 0.1590 |
| 2 | 0.1534 | 0.367 | 0.1582 |
| 4 | 0.1418 | 0.503 | 0.1565 |
| 6 | 0.1329 | 0.577 | 0.1552 |
| 8 | **0.1284** | **0.628** | 0.1540 |

All weeks: [metrics.csv](metrics.csv), [figures/mae_by_week.png](figures/mae_by_week.png),
[figures/correlation_by_week.png](figures/correlation_by_week.png).

- **Target of the rules (MAE < 0.15 and correlation > 0.6) is met at week 8, not at week 4** (correlation 0.50).
  The MAE is below 0.15 from week 3, the correlation above 0.6 from week 7.
- The estimate beats the constant baseline from week 1 on, and the gap grows with the number of events.
- More events per pair give a better estimate (week 8, printed by the simulation test):

  | Events of the pair | Pairs | MAE | Correlation |
  |---|---|---|---|
  | 1-4 | 28 | 0.174 | 0.266 |
  | 5-9 | 477 | 0.139 | 0.569 |
  | 10+ | 995 | 0.122 | 0.672 |

  Every pair has at least one event by week 8.

## Sensitivity (one parameter changed, the others at default)

Week 8, MAE / correlation ([sensitivity.csv](sensitivity.csv) also has week 4,
[figures/sensitivity.png](figures/sensitivity.png)):

| Parameter | Values | Week 8 |
|---|---|---|
| `etaMin` | 0.05 / **0.10** / 0.20 | 0.1285 / 0.6285 · **0.1284 / 0.6279** · 0.1329 / 0.6078 |
| `weightClean` | 0.0 / 0.15 / **0.30** / 0.60 | 0.2464 / 0.5080 · 0.1673 / 0.6057 · **0.1284 / 0.6279** · 0.1246 / 0.6278 |
| `offset` | 1 / **3** / 5 / 10 | 0.1555 / 0.6029 · **0.1284 / 0.6279** · 0.1244 / 0.6315 · 0.1254 / 0.6237 |

- `weightClean` matters most: without `CLEAN` events only errors are seen, so the mastery only goes down and the
  MAE almost doubles (0.246).
- `etaMin` 0.05 gives almost the same result as 0.10: in 8 weeks the learning rate rarely reaches the floor.
- `offset` 1 makes the first events move the mastery too much; 5 is slightly better than the default 3.
- This is a sensitivity check, not a tuning: the defaults are kept, because choosing them on this data and
  reporting on the same data would overstate the result.

## Limits

- Synthetic data only. The generator is a simple model with assumptions chosen by the team (the AI finds a true
  error with probability 0.7, false alarm 0.05, no forgetting); real learners will behave differently.
- The parameters are chosen by hand and not fitted to real learners.
- Correlation is the main measure: the true mastery does not spread much, so the "always 0.5" baseline already
  has an MAE of about 0.16.
- The profile is not yet updated by real submissions (`LearnerProfileService.applySubmission` is not called by the
  submission flow); this evidence covers the algorithm only.

## Files

| File | Content |
|---|---|
| `metrics.csv` | `week, mae, correlation, baseline_mae` for weeks 0-8 (week 0 has no correlation: all estimates are 0.5) |
| `sensitivity.csv` | `parameter, value, week, mae, correlation` for weeks 4 and 8 |
| `figures/*.png` | MAE and correlation by week, sensitivity |
| `test-results.txt` | Summary of the learner profile unit tests |
| `manifest.json` | sha256 of every file here and of the two data files, git commit, parameters, date |
| `run.sh`, `make_figures.py`, `make_manifest.py` | Scripts that produce the files above |

The simulation code is
[SkillStateSimulationTest.java](../../backend/ielts-backend/ielts-backend/src/test/java/com/ielts/backend/service/profile/SkillStateSimulationTest.java).
