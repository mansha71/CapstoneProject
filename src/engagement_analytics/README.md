# Engagement Analytics (M11)

Python implementation of the Engagement Analytics Module defined in MIS §14. It exposes a single public API `computeLearningScores(anonymizedQuestionnaireData, slideMap)` that returns learning gains per slide and per participant.

## Interface
- **Entry point:** `EngagementAnalyticsModule.computeLearningScores(anonymizedQuestionnaireData, slideMap)`
- **Input:**
	- `anonymizedQuestionnaireData`: list of `QuestionnaireItem` (participant_id, slide_id, question_id, pre_score, post_score, timestamp)
	- `slideMap`: optional dict mapping question_id -> slide_id when slide_id is missing
- **Output:** `LearningScores` (session_id, slide_scores, participant_scores, overall_learning_gain, total_questions, total_participants)
- **Exceptions:** raises `DataError` for malformed inputs (missing IDs, both scores None, score out of [0,1], missing slide mapping)

## Run instructions
1) Ensure Python 3.10+ is available (stdlib only; no external deps).
2) From this folder, run the demo:
	 ```bash
	 python demo.py
	 ```
	 This prints slide-level and participant-level learning gains using sample questionnaire data.

## Minimal usage example
```python
from engagement_analytics.engagement_analytics import (
		EngagementAnalyticsModule,
		QuestionnaireItem,
)

data = [
		QuestionnaireItem("P001", "S1", "Q1", 0.20, 0.80, 1_700_000_000.0),
		QuestionnaireItem("P001", "S1", "Q2", 0.10, 0.70, 1_700_000_001.0),
]

scores = EngagementAnalyticsModule().computeLearningScores(data, slideMap={})
print(scores.overall_learning_gain)
print(scores.slide_scores["S1"].learning_gain)
```

## Assumptions (per MIS §14)
- Questionnaire data has been collected, anonymized, and preprocessed.
- Each questionnaire item must map to a slide (directly via slide_id or through slideMap).
- Pre/post scores are within [0, 1], with at least one non-null.
- The module holds no internal state; each call is a pure computation.
- Collected data follow `QuestionnaireItem` schema: participant_id, slide_id (or slideMap-backed), question_id, pre_score, post_score, timestamp (float seconds).

## Validation notes
- Core formula: Hake normalized learning gain `g = (post - pre) / (1 - pre)` with guardrails for None and pre_score >= 1.0.
- Per-participant gain is the mean of their slide gains; overall gain is the mean of all slide gains.