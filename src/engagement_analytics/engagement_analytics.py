from dataclasses import dataclass
from typing import List, Dict, Optional


class DataError(Exception):
    """Exception per MIS 14."""
    pass


@dataclass
class QuestionnaireItem:
    """Questionnaire response per MIS 14."""
    participant_id: str
    slide_id: str
    question_id: str
    pre_score: Optional[float]
    post_score: Optional[float]
    timestamp: float


@dataclass
class SlideScore:
    """Per-slide learning metrics."""
    slide_id: str
    learning_gain: float
    pre_score_avg: float
    post_score_avg: float
    question_count: int
    participant_count: int


@dataclass
class ParticipantScore:
    """Per-participant learning scores."""
    participant_id: str
    slide_scores: Dict[str, float]
    overall_gain: float


@dataclass
class LearningScores:
    """Output per MIS 14."""
    session_id: str
    slide_scores: Dict[str, SlideScore]
    participant_scores: Dict[str, ParticipantScore]
    overall_learning_gain: float
    total_questions: int
    total_participants: int


class EngagementAnalyticsModule:
    """Engagement Analytics Module (M11) - Per MIS 14."""
    
    def __init__(self):
        """Initialize with no state variables per MIS 14."""
        pass
    # check: computeLearningScores()
    '''
    • transition: Computes pre/post learning gains per slide using questionnaire data linked
    to slide identifiers. Aggregates multiple questions associated with the same slide.
    • output: learningScores
    • exception: Raises DataError for missing, malformed, or improperly mapped question
    naire items
    '''
    def computeLearningScores(
        self,
        anonymizedQuestionnaireData: List[QuestionnaireItem],
        slideMap: Dict[str, str]
    ) -> LearningScores:
        if not anonymizedQuestionnaireData:
            raise DataError("anonymizedQuestionnaireData is empty")
        
        for idx, item in enumerate(anonymizedQuestionnaireData):
            if not isinstance(item, QuestionnaireItem):
                raise DataError(f"Item {idx} is not QuestionnaireItem")
            if not item.participant_id:
                raise DataError(f"Missing participant_id at index {idx}")
            if not item.question_id:
                raise DataError(f"Missing question_id at index {idx}")
            
            if not item.slide_id:
                if slideMap and item.question_id in slideMap:
                    item.slide_id = slideMap[item.question_id]
                else:
                    raise DataError(
                        f"Missing slide_id for question {item.question_id} "
                        f"and no slideMap entry"
                    )
            
            if item.pre_score is None and item.post_score is None:
                raise DataError(
                    f"Both scores None for participant {item.participant_id}, "
                    f"question {item.question_id}"
                )
            
            if item.pre_score is not None and not (0.0 <= item.pre_score <= 1.0):
                raise DataError(f"pre_score {item.pre_score} out of range")
            if item.post_score is not None and not (0.0 <= item.post_score <= 1.0):
                raise DataError(f"post_score {item.post_score} out of range")
        
        session_id = self._extractSessionId(anonymizedQuestionnaireData)
        slide_scores = self._aggregateSlideScores(anonymizedQuestionnaireData)
        participant_scores = self._computeParticipantScores(anonymizedQuestionnaireData)
        
        if slide_scores:
            overall_gain = sum(s.learning_gain for s in slide_scores.values()) / len(slide_scores)
        else:
            overall_gain = 0.0
        
        unique_participants = len(set(item.participant_id for item in anonymizedQuestionnaireData))
        unique_questions = len(set(item.question_id for item in anonymizedQuestionnaireData))
        
        return LearningScores(
            session_id=session_id,
            slide_scores=slide_scores,
            participant_scores=participant_scores,
            overall_learning_gain=overall_gain,
            total_questions=unique_questions,
            total_participants=unique_participants
        )
    # check: computeLearningDelta()
    def _computeLearningDelta(
        self,
        pre_score: Optional[float],
        post_score: Optional[float]
    ) -> float:
        """Local function per MIS 14: computeLearningDelta()"""
        if pre_score is None and post_score is None:
            return 0.0
        if pre_score is None:
            return post_score if post_score is not None else 0.0
        if post_score is None:
            return 0.0
        if pre_score >= 1.0:
            return 0.0
        return (post_score - pre_score) / (1.0 - pre_score)
    
    # check: aggregateSlideScores()
    def _aggregateSlideScores(
        self,
        questionnaire_data: List[QuestionnaireItem]
    ) -> Dict[str, SlideScore]:
        """Local function per MIS 14: aggregateSlideScores()"""
        slide_groups: Dict[str, List[QuestionnaireItem]] = {}
        for item in questionnaire_data:
            if item.slide_id not in slide_groups:
                slide_groups[item.slide_id] = []
            slide_groups[item.slide_id].append(item)
        
        slide_scores = {}
        for slide_id, items in slide_groups.items():
            pre_scores = [i.pre_score for i in items if i.pre_score is not None]
            post_scores = [i.post_score for i in items if i.post_score is not None]
            
            pre_avg = sum(pre_scores) / len(pre_scores) if pre_scores else 0.0
            post_avg = sum(post_scores) / len(post_scores) if post_scores else 0.0
            
            learning_gain = self._computeLearningDelta(pre_avg, post_avg)
            unique_participants = len(set(i.participant_id for i in items))
            
            slide_scores[slide_id] = SlideScore(
                slide_id=slide_id,
                learning_gain=learning_gain,
                pre_score_avg=pre_avg,
                post_score_avg=post_avg,
                question_count=len(items),
                participant_count=unique_participants
            )
        
        return slide_scores
    
    def _computeParticipantScores(
        self,
        questionnaire_data: List[QuestionnaireItem]
    ) -> Dict[str, ParticipantScore]:
        """Helper: Per-participant scores."""
        participant_groups: Dict[str, List[QuestionnaireItem]] = {}
        for item in questionnaire_data:
            if item.participant_id not in participant_groups:
                participant_groups[item.participant_id] = []
            participant_groups[item.participant_id].append(item)
        
        participant_scores = {}
        for participant_id, items in participant_groups.items():
            slide_items: Dict[str, List[QuestionnaireItem]] = {}
            for item in items:
                if item.slide_id not in slide_items:
                    slide_items[item.slide_id] = []
                slide_items[item.slide_id].append(item)
            
            slide_gains = {}
            for slide_id, slide_list in slide_items.items():
                pre = [i.pre_score for i in slide_list if i.pre_score is not None]
                post = [i.post_score for i in slide_list if i.post_score is not None]
                pre_avg = sum(pre) / len(pre) if pre else None
                post_avg = sum(post) / len(post) if post else None
                slide_gains[slide_id] = self._computeLearningDelta(pre_avg, post_avg)
            
            overall = sum(slide_gains.values()) / len(slide_gains) if slide_gains else 0.0
            participant_scores[participant_id] = ParticipantScore(
                participant_id=participant_id,
                slide_scores=slide_gains,
                overall_gain=overall
            )
        
        return participant_scores
    
    def _extractSessionId(self, data: List[QuestionnaireItem]) -> str:
        """Helper: Generate session ID."""
        if not data:
            return "session_unknown"
        timestamps = [item.timestamp for item in data]
        min_time = int(min(timestamps))
        participant_count = len(set(item.participant_id for item in data))
        return f"session_{min_time}_{participant_count}p"
