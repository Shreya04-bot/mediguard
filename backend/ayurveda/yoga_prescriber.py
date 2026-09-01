"""
MediGuard AI — Ayurveda A4: Yoga & Pranayama Prescription
Generates a personalised weekly yoga + pranayama schedule based on
risk profile, Prakriti, age, and mobility.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

YOGA_LIBRARY = [
    # ── Pranayama ──
    {"id":"anulom_vilom",  "type":"pranayama","name_en":"Anulom-Vilom (Alternate Nostril)","name_hi":"अनुलोम-विलोम",
     "duration_min":10,"level":"beginner","benefits":["Balances nervous system","Reduces BP","Stress relief","Improves oxygen"],
     "for_doshas":["vata","pitta"],"for_diseases":["hypertension","cvd","diabetes"],
     "contraindications":[],"emoji":"🫁"},

    {"id":"kapalbhati",    "type":"pranayama","name_en":"Kapalbhati (Skull Shining)","name_hi":"कपालभाति",
     "duration_min":10,"level":"intermediate","benefits":["Burns abdominal fat","Stimulates pancreas","Lowers blood sugar","Improves digestion"],
     "for_doshas":["kapha"],"for_diseases":["diabetes"],
     "contraindications":["Avoid if BP > 160/100","Avoid in heart disease (consult first)","Not in pregnancy"],"emoji":"💨"},

    {"id":"bhramari",      "type":"pranayama","name_en":"Bhramari (Humming Bee)","name_hi":"भ्रामरी",
     "duration_min":5,"level":"beginner","benefits":["Immediate stress relief","Lowers BP","Reduces anxiety","Calms nervous system"],
     "for_doshas":["vata","pitta"],"for_diseases":["hypertension","cvd"],
     "contraindications":["Avoid lying down"],"emoji":"🐝"},

    {"id":"ujjayi",        "type":"pranayama","name_en":"Ujjayi (Ocean Breath)","name_hi":"उज्जायी",
     "duration_min":5,"level":"beginner","benefits":["Slows heart rate","Reduces blood pressure","Improves focus","Cooling effect"],
     "for_doshas":["pitta","vata"],"for_diseases":["hypertension","cvd"],
     "contraindications":[],"emoji":"🌊"},

    # ── Standing Asanas ──
    {"id":"tadasana",      "type":"asana","name_en":"Tadasana (Mountain Pose)","name_hi":"ताड़ासन",
     "duration_min":2,"level":"beginner","benefits":["Improves posture","Strengthens core","Enhances blood circulation"],
     "for_doshas":["vata","kapha"],"for_diseases":["diabetes","cvd"],
     "contraindications":[],"emoji":"🏔"},

    {"id":"vrukshasana",   "type":"asana","name_en":"Vrukshasana (Tree Pose)","name_hi":"वृक्षासन",
     "duration_min":3,"level":"beginner","benefits":["Balance","Concentration","Leg strength","Stress relief"],
     "for_doshas":["vata"],"for_diseases":["diabetes"],
     "contraindications":["Hold wall for support if balance issues"],"emoji":"🌳"},

    # ── Floor Asanas ──
    {"id":"pawanmuktasana","type":"asana","name_en":"Pawanmuktasana (Wind-Relieving)","name_hi":"पवनमुक्तासन",
     "duration_min":3,"level":"beginner","benefits":["Relieves gas","Massages abdominal organs","Stimulates pancreas","Reduces blood sugar"],
     "for_doshas":["vata","kapha"],"for_diseases":["diabetes"],
     "contraindications":["Avoid if hernia or recent abdominal surgery"],"emoji":"💨"},

    {"id":"shavasana",     "type":"asana","name_en":"Shavasana (Corpse Pose)","name_hi":"शवासन",
     "duration_min":10,"level":"beginner","benefits":["Deep relaxation","Lowers BP","Reduces cortisol","Integrates practice"],
     "for_doshas":["vata","pitta","kapha"],"for_diseases":["hypertension","cvd","diabetes"],
     "contraindications":[],"emoji":"🧘"},

    {"id":"bhujangasana",  "type":"asana","name_en":"Bhujangasana (Cobra Pose)","name_hi":"भुजंगासन",
     "duration_min":3,"level":"beginner","benefits":["Stimulates pancreas","Strengthens back","Improves digestion","Opens chest"],
     "for_doshas":["vata","kapha"],"for_diseases":["diabetes"],
     "contraindications":["Avoid if severe back pain","Not in pregnancy","Recent abdominal surgery"],"emoji":"🐍"},

    {"id":"ardha_matsyendrasana","type":"asana","name_en":"Ardha Matsyendrasana (Seated Twist)","name_hi":"अर्धमत्स्येन्द्रासन",
     "duration_min":4,"level":"intermediate","benefits":["Stimulates liver and pancreas","Improves insulin secretion","Detoxifies","Spinal mobility"],
     "for_doshas":["kapha","pitta"],"for_diseases":["diabetes"],
     "contraindications":["Avoid in severe disc prolapse","Not after abdominal surgery"],"emoji":"🌀"},

    {"id":"viparita_karani","type":"asana","name_en":"Viparita Karani (Legs-Up-The-Wall)","name_hi":"विपरीत करणी",
     "duration_min":5,"level":"beginner","benefits":["Improves circulation","Reduces ankle oedema","Calms nervous system","Lowers BP"],
     "for_doshas":["pitta","vata"],"for_diseases":["cvd","hypertension"],
     "contraindications":["Avoid in glaucoma","Avoid during menstruation","Not if BP is very high"],"emoji":"🦵"},

    # ── Surya Namaskar ──
    {"id":"surya_namaskar","type":"sequence","name_en":"Surya Namaskar (Sun Salutation)","name_hi":"सूर्य नमस्कार",
     "duration_min":15,"level":"intermediate","benefits":["Full-body workout","Burns calories","Improves insulin sensitivity","Cardiovascular benefit","Weight management"],
     "for_doshas":["kapha"],"for_diseases":["diabetes","cvd"],
     "contraindications":["Avoid if BP > 160","Not in severe CVD without medical clearance","Begin with 4 rounds and increase gradually"],"emoji":"☀️"},

    {"id":"meditation",    "type":"meditation","name_en":"Mindfulness Meditation","name_hi":"ध्यान",
     "duration_min":10,"level":"beginner","benefits":["Reduces cortisol 15-20%","Lowers BP","Improves glucose control","Mental clarity"],
     "for_doshas":["vata","pitta","kapha"],"for_diseases":["diabetes","cvd","hypertension"],
     "contraindications":[],"emoji":"🧠"},
]

DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
DAYS_HI = ["सोमवार","मंगलवार","बुधवार","गुरुवार","शुक्रवार","शनिवार","रविवार"]


def prescribe_yoga_plan(
    primary_dosha: str,
    diabetes_risk_level: str,
    cvd_risk_level: str,
    age: int,
    blood_pressure_systolic: Optional[int] = None,
    mobility: str = "normal",   # normal | limited | bedridden
    language: str = "en",
) -> Dict[str, Any]:
    """Generate a 7-day yoga + pranayama plan."""

    target_diseases = set()
    if diabetes_risk_level in ("moderate","high","critical"):
        target_diseases.add("diabetes")
    if cvd_risk_level in ("moderate","high","critical"):
        target_diseases.add("cvd")
    bp_high = (blood_pressure_systolic or 0) >= 160

    # Filter suitable practices
    suitable = []
    for practice in YOGA_LIBRARY:
        # Skip if BP too high and practice is contraindicated
        if bp_high and any("BP" in c for c in practice.get("contraindications", [])):
            continue
        # Skip advanced if age > 60 or mobility limited
        if age > 60 and practice["level"] == "advanced":
            continue
        if mobility == "limited" and practice["id"] == "surya_namaskar":
            continue

        # Score relevance
        score = 0
        if primary_dosha in practice.get("for_doshas", []):
            score += 2
        for d in target_diseases:
            if d in practice.get("for_diseases", []):
                score += 3
        if practice["level"] == "beginner":
            score += 1

        if score > 0 or practice["id"] == "shavasana":
            suitable.append({**practice, "_score": score})

    suitable.sort(key=lambda x: x["_score"], reverse=True)

    # Build 7-day schedule
    # Structure: Mon/Wed/Fri = full session, Tue/Thu = lighter, Sat = extended, Sun = rest+meditation
    schedule = {}
    core = [p for p in suitable if p["type"] in ("pranayama", "sequence", "meditation")]
    asanas = [p for p in suitable if p["type"] == "asana"]

    sessions = {
        0: {"label": "Full Session (Morning)", "duration": 40, "practices": core[:2] + asanas[:3] + [_find(suitable,"shavasana")]},
        1: {"label": "Light Session", "duration": 20, "practices": core[:2] + [_find(suitable,"shavasana")]},
        2: {"label": "Full Session (Morning)", "duration": 40, "practices": core[:2] + asanas[:3] + [_find(suitable,"shavasana")]},
        3: {"label": "Light Session", "duration": 20, "practices": core[:2] + [_find(suitable,"shavasana")]},
        4: {"label": "Full Session (Morning)", "duration": 40, "practices": core[:2] + asanas[:4] + [_find(suitable,"shavasana")]},
        5: {"label": "Extended Practice (Weekend)", "duration": 60, "practices": suitable[:6] + [_find(suitable,"shavasana")]},
        6: {"label": "Rest + Meditation", "duration": 15, "practices": [_find(suitable,"bhramari"), _find(suitable,"shavasana"), _find(suitable,"meditation")]},
    }

    for i, day in enumerate(DAYS):
        session = sessions[i]
        practices = [p for p in session["practices"] if p is not None]
        day_label = DAYS_HI[i] if language == "hi" else day
        schedule[day_label] = {
            "session_type":   session["label"],
            "total_duration": f"{session['duration']} minutes",
            "practices": [
                {
                    "name":   p["name_hi"] if language == "hi" else p["name_en"],
                    "type":   p["type"],
                    "duration": f"{p['duration_min']} min",
                    "emoji":  p["emoji"],
                    "benefits": p["benefits"][:3],
                    "contraindications": p.get("contraindications", []),
                    "difficulty": p["level"],
                }
                for p in practices
            ],
        }

    tips = [
        "Practice on empty stomach — at least 2 hours after meals.",
        "Wear loose, comfortable cotton clothing.",
        "Practice on a yoga mat or folded blanket on the floor.",
        "Breath should flow naturally — never strain.",
        "If any pain or dizziness occurs, stop immediately.",
        f"Best time for {primary_dosha.title()} type: "
        + ("6:00–7:30 AM (sunrise)" if primary_dosha == "kapha" else "7:00–8:30 AM"),
    ]
    tips_hi = [
        "खाली पेट अभ्यास करें — भोजन के कम से कम 2 घंटे बाद।",
        "ढीले, आरामदायक सूती कपड़े पहनें।",
        "योग मैट या तह किए कंबल पर अभ्यास करें।",
        "श्वास स्वाभाविक रूप से बहती रहे — कभी जोर न लगाएं।",
        "यदि कोई दर्द या चक्कर आए, तुरंत रुकें।",
        f"{primary_dosha.title()} प्रकार के लिए सर्वोत्तम समय: प्रातः 6:00–7:30 बजे।",
    ]

    return {
        "dosha": primary_dosha,
        "weekly_schedule": schedule,
        "suitable_practices": len(suitable),
        "tips": tips_hi if language == "hi" else tips,
        "disclaimer": (
            "किसी योग्य योग प्रशिक्षक के मार्गदर्शन में अभ्यास शुरू करें।"
            if language == "hi" else
            "Begin practice under guidance of a certified yoga instructor. Consult your physician if you have severe cardiac or musculoskeletal conditions."
        ),
    }


def _find(lst: List[Dict], id_: str) -> Optional[Dict]:
    for item in lst:
        if item.get("id") == id_:
            return item
    return None
