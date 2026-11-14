# Offline evaluation design: baseline vs graph method (W7)

Written before running the comparison. Results are in `Evidence/W07/`.

## 1. Question

After a learner has done some graded attempts, **which SubSkills are they weakest at?** A recommender is only useful
if it points at the right SubSkills, so we measure how well each method finds the learner's truly weakest SubSkills.

We do not measure whether learners improve by following the recommendations: that needs real learners over weeks.

## 2. Data (synthetic only)

There are no real interaction logs yet, so the evaluation uses the 60 synthetic learners of W6
(`data/learner_sim/`, see its README). Each learner has a **hidden true mastery** per SubSkill (`true_mastery.csv`),
which is the ground truth here and is never shown to the methods.

Added for W7 by `data/learner_sim/derive_bands.py` (the W6 files are not changed):

| File | Content |
|---|---|
| `attempt_bands.csv` | The band of each criterion of each Writing or Speaking attempt, as the AI grader would give it: `round(3.5 + 5 x mean true mastery of the criterion's SubSkills + noise)`, integer 1-9, noise N(0, 0.5) |
| `attempt_bands_noise1.csv` | Same with noise N(0, 1.0), for the sensitivity check |
| `targets.csv` | Target band of each learner for Writing and Speaking: true band at week 0 + 0.5, 1.0 or 1.5 (at random), at most 9.0 |

The methods see only what the system sees: the ERROR/CLEAN/DRILL events, the criterion bands and the target band.

## 3. Methods compared

All methods return a full ranking of the 25 SubSkills, weakest first. Ties are broken at random (fixed seed).

| Method | Rule | Uses |
|---|---|---|
| **B1 Latest attempt** | SubSkills with an ERROR in the learner's latest attempt first (the W5 recommendation rule) | errors of one attempt |
| **B2 Error count** | Most ERROR events so far first | errors of all attempts |
| **G Graph method** | `priority = 0.5 (1 - mastery) + 0.3 recent error rate + 0.2 min(gap, 2) / 2`; mastery from the learner profile (`SkillStateUpdater`), recent rate over the SubSkill's last 3 observations, gap = target band - current band of the SubSkill's Criterion (via `HAS_SUBSKILL` in the KG) | profile, errors, criterion bands, target, KG |

Ablations of G (to see what each part adds): **G-mastery** (mastery only), **G-no-gap** (mastery + recent rate).

The learner profile is replayed with the rules in the code (`application.yaml`: drills count, CLEAN weight 0.3).
A variant with the rules planned for W8 (drills do not count, CLEAN weight 0.5) is reported as a sensitivity check.

## 4. Metrics

At the end of each week k = 1..8, for each learner (the week-k snapshot holds the events and bands before
`2026-09-07T00:00Z + 7k days`):

| Metric | Definition |
|---|---|
| **Precision@3** (main) | Share of the method's top 3 that are among the 3 SubSkills with the lowest true mastery |
| Hit@1 | 1 if the method's first SubSkill is among the true 3 weakest |
| Spearman rho | Rank correlation between the method's ranking and the true ranking (lowest mastery first) |
| Precision@3 below target | Share of the top 3 whose true mastery is below the target level `(target - 3.5) / 5` |

Each metric is averaged over the 60 learners. Precision@3 of a random ranking is 3/25 = 0.12.

## 5. Comparison rule

- Main comparison: G vs B2 (the stronger baseline), Precision@3 at weeks 2, 4 and 8.
- Paired difference per learner (G minus B2), mean with a 95% bootstrap interval (2,000 resamples of learners, fixed seed).
- G is **better** only if the interval is above 0; **no clear difference** if it contains 0; worse if below 0.
- All other numbers are reported as they come, including the weeks or metrics where G is not better.

## 6. Sensitivity checks

- Band noise 1.0 instead of 0.5 (a less reliable AI grader).
- Profile rules planned for W8 (no drill events, CLEAN weight 0.5).

## 7. Limits (stated in the results)

- Synthetic learners only, made by the team: the result shows the methods behave as designed on this model, not that
  they help real learners.
- The generator has no prerequisite effect (a weak prerequisite does not make other SubSkills weaker), so the
  `PREREQUISITE_OF` suggestion of the graph method cannot be evaluated here.
- The criterion bands are derived from the true mastery with an assumed noise, so the gap term may look better than
  with a real AI grader (which under-scores high bands).
- Ranking accuracy is not learning gain.
