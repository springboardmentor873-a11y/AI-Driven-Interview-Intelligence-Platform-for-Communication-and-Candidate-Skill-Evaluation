import re
import json
from typing import Dict, Any, List, Tuple


COMMON_FILLER_WORDS = [
    "um", "uh", "like", "you know", "actually", "basically",
    "literally", "sort of", "kind of", "i mean", "right", "so yeah"
]

STAR_KEYWORDS = {
    "situation": ["situation", "context", "background", "when", "at my previous", "working on", "facing", "challenge", "problem", "project"],
    "task": ["task", "responsibility", "goal", "objective", "needed to", "required to", "assigned", "deliverable"],
    "action": ["action", "implemented", "developed", "led", "designed", "created", "refactored", "built", "collaborated", "solved", "optimized", "decided"],
    "result": ["result", "outcome", "increased", "reduced", "delivered", "successfully", "impact", "metric", "improved", "saved", "achieved", "grew"]
}

TECHNICAL_KEYWORDS = [
    "architecture", "scalability", "api", "database", "latency", "throughput", "cache", "redis",
    "postgresql", "sql", "concurrency", "docker", "microservices", "async", "testing", "security",
    "state", "component", "hook", "rendering", "pipeline", "ci/cd", "observability", "metrics"
]


class InterviewService:
    @staticmethod
    def analyze_answer(transcript: str, duration_seconds: int = 60, category: str = "Behavioral") -> Dict[str, Any]:
        """
        Analyzes a candidate's transcribed spoken or written response.
        Calculates:
        1. Word count & Speaking Cadence (WPM)
        2. Filler words frequency and detection
        3. STAR rubric evaluation (Situation, Task, Action, Result)
        4. Technical depth and vocabulary
        5. Composite question score (0-100) and actionable AI coaching feedback
        """
        text = transcript.strip()
        words = re.findall(r"\b[A-Za-z0-9'-]+\b", text)
        word_count = len(words)
        effective_duration = max(duration_seconds, 10)

        # 1. Words Per Minute (WPM)
        wpm = round((word_count / effective_duration) * 60, 1)

        # 2. Filler words analysis
        text_lower = text.lower()
        detected_fillers: List[str] = []
        filler_count = 0

        for filler in COMMON_FILLER_WORDS:
            pattern = r"\b" + re.escape(filler) + r"\b"
            matches = re.findall(pattern, text_lower)
            if matches:
                filler_count += len(matches)
                detected_fillers.extend([filler] * len(matches))

        filler_ratio = (filler_count / max(word_count, 1)) * 100

        # 3. STAR Framework Rubric Analysis
        star_scores = {"situation": 0, "task": 0, "action": 0, "result": 0}
        for pillar, keywords in STAR_KEYWORDS.items():
            matches = [kw for kw in keywords if kw in text_lower]
            if matches:
                star_scores[pillar] = min(25, len(matches) * 12 + 10)
            else:
                # If answer has sufficient length, give partial credit
                star_scores[pillar] = 12 if word_count > 60 else 5

        total_star_score = sum(star_scores.values())  # Out of 100

        # 4. Cadence & Pace score
        # Optimal speaking rate is 120-155 WPM
        if 115 <= wpm <= 165:
            cadence_score = 95
            cadence_feedback = "Optimal speaking pace. Your delivery is measured, authoritative, and easy to follow."
        elif 90 <= wpm < 115:
            cadence_score = 80
            cadence_feedback = "Pacing is slightly deliberative. Consider infusing slightly higher cadence to convey executive energy."
        elif 165 < wpm <= 195:
            cadence_score = 75
            cadence_feedback = "Slightly hurried cadence. Remember to introduce tactical pauses after articulating your key achievements."
        elif wpm < 90:
            cadence_score = 65
            cadence_feedback = "Speaking rate is notably slow. Practice concise narrative transitions."
        else:
            cadence_score = 60
            cadence_feedback = "Rapid speech delivery detected. Slow down to ensure your interviewer fully absorbs your technical decisions."

        # 5. Technical Depth bonus
        tech_matches = [tk for tk in TECHNICAL_KEYWORDS if tk in text_lower]
        tech_bonus = min(15, len(tech_matches) * 4)

        # 6. Overall Question Score Calculation
        base_score = 60.0
        if word_count < 20:
            base_score = 35.0
        elif word_count < 50:
            base_score = 55.0
        else:
            base_score = 70.0 + (total_star_score * 0.15) + tech_bonus

        # Apply filler penalty
        if filler_ratio > 8:
            base_score -= 15
        elif filler_ratio > 4:
            base_score -= 7

        # Normalize score between 40 and 98
        final_score = max(35.0, min(97.0, round(base_score, 1)))

        # 7. Construct Actionable AI Feedback
        feedback_points = []
        if total_star_score >= 70:
            feedback_points.append("Excellent structured narrative adhering clearly to the STAR model.")
        elif star_scores["result"] < 15:
            feedback_points.append("Quantify the 'Result' pillar more sharply: cite concrete business metrics, % speedups, or dollar efficiencies.")

        if filler_count > 3:
            feedback_points.append(f"Noticed {filler_count} vocal fillers ({', '.join(set(detected_fillers))}). Replace filler words with purposeful one-second pauses.")

        if tech_matches:
            feedback_points.append(f"Strong technical vocabulary: demonstrated mastery in {', '.join(tech_matches[:3])}.")

        feedback_points.append(cadence_feedback)
        ai_feedback = " ".join(feedback_points)

        return {
            "wpm": wpm,
            "word_count": word_count,
            "filler_count": filler_count,
            "filler_words": detected_fillers,
            "star_breakdown": star_scores,
            "star_total": total_star_score,
            "score": final_score,
            "ai_feedback": ai_feedback,
        }

    @staticmethod
    def generate_session_summary(answers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Aggregates multiple question responses in an interview session into a comprehensive report.
        """
        if not answers:
            return {
                "overall_score": 0.0,
                "cadence_wpm": 0.0,
                "clarity_score": 0.0,
                "star_score": 0.0,
                "filler_words_count": 0,
                "strengths": ["Completed session initialization."],
                "improvements": ["Answer questions to generate feedback."],
                "recommendations": ["Practice speaking consistently with the microphone."]
            }

        avg_score = round(sum(a["score"] for a in answers) / len(answers), 1)
        avg_wpm = round(sum(a["wpm"] for a in answers) / len(answers), 1)
        total_fillers = sum(a["filler_count"] for a in answers)
        avg_star = round(sum(a.get("star_total", 70) for a in answers) / len(answers), 1)

        clarity_score = max(50.0, min(98.0, round(100 - (total_fillers * 3.5), 1)))

        # Strengths
        strengths = []
        if avg_wpm >= 115 and avg_wpm <= 165:
            strengths.append(f"Exceptional speaking cadence averaging {avg_wpm} words per minute.")
        if avg_star >= 65:
            strengths.append("High adherence to the STAR methodology with explicit Action and Context descriptions.")
        if avg_score >= 80:
            strengths.append("Demonstrated senior-level clarity, domain proficiency, and problem-solving depth.")
        if total_fillers <= 2:
            strengths.append("Crisp vocal economy with virtually zero distracting vocal fillers.")
        if not strengths:
            strengths.append("Good baseline articulation and willingness to tackle complex prompts.")

        # Areas for Improvement
        improvements = []
        if total_fillers > 3:
            improvements.append(f"Detected {total_fillers} filler words across responses. Emphasize breathing pauses.")
        if avg_wpm < 110:
            improvements.append("Increase pacing to stay within the recommended 120-150 WPM interview sweet spot.")
        elif avg_wpm > 170:
            improvements.append("Slow down slightly during complex architecture explanations to ensure comprehension.")
        if avg_star < 60:
            improvements.append("Reinforce the 'Result' phase of your stories with quantifiable percentage gains.")
        if not improvements:
            improvements.append("Continue refining edge-case considerations during system design discussions.")

        # Recommendations
        recommendations = [
            "Use the 'Situation-Task-Action-Result' framework as your automatic mental checklist.",
            "Record 2 more mock sessions focusing on speaking without vocal fillers.",
            "Highlight cross-functional collaboration and business ROI in your architectural decisions."
        ]

        return {
            "overall_score": avg_score,
            "cadence_wpm": avg_wpm,
            "clarity_score": clarity_score,
            "star_score": avg_star,
            "filler_words_count": total_fillers,
            "strengths": strengths,
            "improvements": improvements,
            "recommendations": recommendations,
        }
