# W8 evidence: Writing/Speaking → KG → recommendation, end-to-end (#42)

Three learner cases run through the real system: submission, AI grading (Gemini; Whisper and pronunciation scores for Speaking),
learner profile update, weaknesses ranked with the KG, and the practice resources recommended. Real requests and real LLM calls, nothing mocked.

Files: [cases.json](cases.json) (cases), [results/](results/) (full trace per case), [summary.csv](summary.csv) (one row per step),
[figures/](figures/), [test-results.txt](test-results.txt), [manifest.json](manifest.json) (sha256, commit, settings).

## Cases

| Case | Learner account | Input | Tests |
|---|---|---|---|
| A | `student_new` | 3 Writing essays (reference band 4.0, 5.5, 6.5) | Weaknesses from recurring errors |
| B | `student_enrolled` | 2 Writing essays (reference 7.0, 8.0), then target band 8.5 | Ranking with few errors and a higher target |
| C | `student_profile` | 2 Speaking answers: hesitant, then fluent | Speaking pipeline and its effect on the profile |

The cases are scenarios, not real users: seed accounts, Writing essays from the public set `data/writing_v1`, Speaking audio made with a
text-to-speech voice (generated locally by `speech/make_speech.ps1`, not stored in Git).

## Results

| Case | Step | AI band | Profile band | Top weakness (priority) → resource |
|---|---|---|---|---|
| A | 1 (ref 4.0) | 6.0 | 6.0 | ERR_SENT_STRUCTURE (0.633) → RES_G_COMPLEX_01 |
| A | 2 (ref 5.5) | 5.0 | 5.5 | ERR_UNDERDEVELOPED (0.675) → RES_W2_IDEA_DEV_01 |
| A | 3 (ref 6.5) | 6.5 | 5.83 | ERR_UNDERDEVELOPED (0.700) → RES_W2_IDEA_DEV_01 |
| B | 1 (ref 7.0) | 7.5 | 7.5 | ERR_SENT_STRUCTURE (0.633) → RES_G_COMPLEX_01 |
| B | 2 (ref 8.0) | 6.5 | 7.0 | ERR_WORD_CHOICE (0.675) → RES_L_WORD_CHOICE_01 |
| B | target 8.5 | – | 7.0 | ERR_WORD_CHOICE (**0.875**) → RES_L_WORD_CHOICE_01 |
| C | 1 hesitant | 5.0 | 5.83 | ERR_VERB_TENSE (0.702) → RES_G_VERB_TENSE_01 |
| C | 2 fluent | 8.0 | 6.5 | ERR_VERB_TENSE (0.616, IMPROVING) → RES_G_VERB_TENSE_01 |

## Findings

1. The chain works end to end: grading, SubSkill mastery update, ranking with the KG, and resources (FIXES first, then PRACTICES).
2. Case A: `ERR_UNDERDEVELOPED` repeats in every essay, so it moves to the top (0.675, then 0.700) and the recommendation changes from a grammar drill to an idea-development drill.
3. Case B: raising the target to 8.5 raises the top priority from 0.675 to 0.875 without a new essay (gap term of the graph method).
4. Case C: pronunciation accuracy 70 → 92 (`source: gemini`), speech rate 115.6 → 185.7 wpm; after a clean answer the weaknesses become IMPROVING.
5. The AI band differs from the reference band by 0.9 on average (5 essays): to be handled in W9 calibration, too few essays to conclude.
6. Tests: backend 261/261, frontend 141/141, no type errors; Flyway V1–V19 runs on an empty database.

## Reproduce

`bash Evidence/W08/run.sh` (needs an empty Postgres, Neo4j with the KG, the ASR service, the backend and `GEMINI_API_KEY` in the environment;
see the header of [run.sh](run.sh)). Bands can differ by about half a band between runs. Case C needs the Speaking audio: `run.sh` creates it on Windows.
