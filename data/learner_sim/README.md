# Synthetic learners (W6)

Simulated interaction logs used to test the learner profile (`docs/learner-profile-rules.md`).

Regenerate (the same seed gives the same files):

```
python data/learner_sim/generate_logs.py --learners 60 --weeks 8 --seed 20261101
```

| File | Content |
|---|---|
| `generate_logs.py` | The generator (Python standard library only). Reads the SubSkills and drills from `kg/data/` |
| `interaction_logs.csv` | The events: `user_id, time, subskill_id, event_type, outcome, source_id` (17,760 rows: 4,949 `ERROR`, 11,371 `CLEAN`, 1,440 `DRILL`) |
| `true_mastery.csv` | The hidden truth: `user_id, week, subskill_id, true_mastery` for week 0 (start) to week 8, to compare with the estimate |

How the data is made (the generator does not use the update formula of the profile):
- 60 learners with a hidden true mastery per SubSkill (average 0.5, differs between learners). It grows slightly after each drill.
- Per week: 2 Writing or Speaking attempts (60% Writing) and 3 drills, drills mostly on weaker SubSkills.
- Attempt: a true error happens with probability `0.8 * (1 - true mastery)`. The AI finds it with probability 0.7 and reports a false error with probability 0.05.
- Drill: score = `Binomial(6, 0.25 + 0.7 * true mastery) / 6`.

Limits: a simple model, not measured on real learners. Real logs would show other patterns (forgetting, skipped weeks, copied answers).
