# W7 evidence: baseline vs graph method, offline evaluation (#38)

This folder compares how well each recommendation method finds the **truly weakest SubSkills** of the 60 synthetic
learners of W6, week by week. The design (data, metrics, comparison rule) was written before the run:
[docs/offline-evaluation-design.md](../../docs/offline-evaluation-design.md).

| Method | Rule |
|---|---|
| B1 latest attempt | Errors of the latest graded attempt only (the W5 recommendation rule) |
| B2 error count | Most ERROR events so far |
| **G graph method** | `0.5 (1 - mastery) + 0.3 recent error rate + 0.2 min(gap to target, 2) / 2`, gap through `HAS_SUBSKILL` in the KG |
| G mastery only, G without gap | Ablations of G |

Code: [`service/recommendation/`](../../backend/ielts-backend/ielts-backend/src/main/java/com/ielts/backend/service/recommendation/)
(`BaselineRankers`, `GraphMethodRanker`) and the evaluation
[RecommendationOfflineEvaluationTest.java](../../backend/ielts-backend/ielts-backend/src/test/java/com/ielts/backend/service/recommendation/RecommendationOfflineEvaluationTest.java).
Data added for W7 (criterion bands, target bands): [data/learner_sim/derive_bands.py](../../data/learner_sim/derive_bands.py).

## Reproduce

```bash
bash Evidence/W07/run.sh
```

It regenerates the band and target files (same seed), runs the evaluation with `-Dsim.write=true`
(`metrics.csv`, `comparison.csv`), the unit tests (`test-results.txt`), `make_figures.py` and `make_manifest.py`.
It needs Java 21+ and Python with matplotlib; no database and no Neo4j (the KG is read from `kg/data/*.csv`).

## Results (main scenario)

Precision@3 = share of the method's top 3 that are among the 3 truly weakest SubSkills (random ranking: 0.12).
Spearman = rank correlation with the true order (random: 0).

| Week | B1 | B2 | **G** | G mastery only | G without gap |
|---|---|---|---|---|---|
| 1 | 0.17 / 0.08 | 0.17 / 0.15 | **0.22 / 0.23** | 0.17 / 0.21 | 0.18 / 0.20 |
| 2 | 0.18 / 0.16 | 0.19 / 0.21 | **0.26 / 0.34** | 0.26 / 0.30 | 0.23 / 0.28 |
| 4 | 0.21 / 0.14 | 0.22 / 0.29 | **0.24 / 0.44** | 0.23 / 0.41 | 0.23 / 0.38 |
| 8 | 0.14 / 0.10 | 0.21 / 0.40 | **0.31 / 0.50** | 0.36 / 0.54 | 0.28 / 0.45 |

(each cell: Precision@3 / Spearman; all weeks in [metrics.csv](metrics.csv),
[figures/precision_by_week.png](figures/precision_by_week.png), [figures/spearman_by_week.png](figures/spearman_by_week.png))

**G vs B2**, paired difference per learner, 95% bootstrap interval ([comparison.csv](comparison.csv)):

| Week | Precision@3 | Spearman |
|---|---|---|
| 2 | +0.067 [0.011, 0.128] better | +0.125 [0.091, 0.157] better |
| 4 | +0.028 [-0.028, 0.083] no clear difference | +0.148 [0.111, 0.185] better |
| 8 | +0.100 [0.044, 0.156] better | +0.102 [0.065, 0.138] better |

## Findings

1. **The graph method finds the weak SubSkills better than counting errors**: Precision@3 is higher at weeks 2 and 8
   (not clearly at week 4), and the whole ranking (Spearman) is better at every compared week.
2. **The W5 rule (B1) is close to random** (0.14-0.21 vs 0.12): one attempt is not enough evidence.
3. **The weights of G are not the best ones**: in the main scenario, mastery alone is better at week 8 (0.36 vs 0.31).
   The recent error rate adds noise once there is enough history; the gap to the target helps (G 0.31 vs G without gap
   0.28). With the rules planned for W8 (drills do not count), G is slightly ahead of mastery alone (0.294 vs 0.289).
   The weights were fixed before the run and are **not tuned on this data** (tuning and reporting on the same data
   would overstate the result).
4. **A less reliable grader (band noise 1.0) does not change the conclusion**: G vs B2 at week 8 is +0.117 [0.056, 0.178]
   ([figures/week8_by_scenario.png](figures/week8_by_scenario.png)).
5. **"Precision below target" does not separate the methods** (0.92-0.99 for all): with targets 0.5-1.5 band above the
   current level, almost every SubSkill is below the target. It is kept in `metrics.csv` but not used to compare.
6. The absolute values stay low (about 0.3 at week 8): 25 SubSkills, a few noisy errors per attempt and a small
   spread of the true mastery make the exact top 3 hard to find for any method.

## Limits

- **Synthetic learners only**, made by the team; no real interaction logs yet. The result shows the methods behave as
  designed on this model, not that they help real learners.
- The criterion bands are derived from the true mastery with an assumed noise; a real AI grader is biased (it
  under-scores high bands), so the gap term may look better here than it would be.
- The generator has no prerequisite effect, so the `PREREQUISITE_OF` suggestion cannot be evaluated.
- Ranking accuracy is not learning gain.

## Files

| File | Content |
|---|---|
| `metrics.csv` | `scenario, method, week, precision_at_3, hit_at_1, spearman, precision_below_target`, weeks 1-8 |
| `comparison.csv` | G minus B2 with the 95% bootstrap interval and the verdict, weeks 2, 4, 8 |
| `figures/*.png` | Precision@3 and Spearman by week, week 8 by scenario |
| `test-results.txt` | Summary of the ranker unit tests and the evaluation test |
| `manifest.json` | sha256 of every file here and of the input data, git commit, settings, date |
| `run.sh`, `make_figures.py`, `make_manifest.py` | Scripts that produce the files above |
