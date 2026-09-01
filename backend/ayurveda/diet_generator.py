"""
MediGuard AI — Ayurveda A1: Personalised Ayurvedic Diet Plan Generator
Generates a day-wise meal plan based on Prakriti + risk profile.
Each meal follows Ayurvedic food combining rules and is adapted for
Indian cuisine. Output is bilingual (Hindi + English).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ── Food Database ────────────────────────────────────────────────────────────
# Categorised by dosha-balance and disease benefit

FOODS = {
    "vata_balancing": {
        "grains":     ["Basmati rice","Oats porridge","Wheat roti","Semolina (suji)"],
        "vegetables": ["Cooked carrots","Beetroot","Sweet potato","Asparagus","Spinach (cooked)"],
        "fruits":     ["Banana","Mango","Papaya","Dates","Figs"],
        "proteins":   ["Mung dal","Masoor dal","Paneer","Eggs (boiled)","Chicken (lightly spiced)"],
        "drinks":     ["Warm milk with turmeric","Ginger tea","Ashwagandha milk","Warm water"],
        "spices":     ["Ginger","Cumin","Coriander","Fennel","Cinnamon"],
        "avoid":      ["Raw salads","Cold drinks","Dry crackers","Popcorn","Carbonated drinks"],
    },
    "pitta_balancing": {
        "grains":     ["Basmati rice","Barley","Wheat","Oats"],
        "vegetables": ["Bitter gourd (karela)","Leafy greens","Cucumber","Zucchini","Bottle gourd"],
        "fruits":     ["Pomegranate","Sweet lime","Grapes","Coconut","Amla"],
        "proteins":   ["Mung dal","Chana dal","Tofu","Fresh paneer","Chicken (mild)"],
        "drinks":     ["Coconut water","Amla juice","Pomegranate juice","Coriander water","Cool (not cold) water"],
        "spices":     ["Coriander","Fennel","Cardamom","Turmeric","Mint"],
        "avoid":      ["Chilli","Vinegar","Sour foods","Alcohol","Fried foods","Onion (raw)","Garlic (excess)"],
    },
    "kapha_balancing": {
        "grains":     ["Millet (bajra)","Barley","Brown rice (small portions)","Ragi"],
        "vegetables": ["Bitter gourd","Drumstick (moringa)","Fenugreek leaves","Radish","Cabbage"],
        "fruits":     ["Pomegranate","Papaya","Apple","Pear","Berries"],
        "proteins":   ["Mung dal","Chana dal","Sprouts","Chicken (grilled)","Fish (steamed)"],
        "drinks":     ["Warm water with honey-ginger","Fenugreek water","Green tea","Tulsi tea"],
        "spices":     ["Black pepper","Dry ginger","Turmeric","Mustard seeds","Fenugreek"],
        "avoid":      ["Dairy excess","Sweet fruits","Deep fried food","Cold food","Refined sugar","White bread","Maida"],
    },
}

# Meal templates (morning/afternoon/evening structure)
MEAL_TEMPLATES = {
    "kapha_diabetic": {
        "early_morning": {
            "en": "Warm water with 1 tsp methi seeds (soaked overnight) + 5 Tulsi leaves",
            "hi": "1 चम्मच मेथी बीज (रात भर भिगोए) के साथ गर्म पानी + 5 तुलसी पत्तियाँ",
        },
        "breakfast": {
            "en": "Ragi (finger millet) porridge with skimmed milk + 1 Apple + Green tea",
            "hi": "स्किम्ड दूध के साथ रागी दलिया + 1 सेब + हरी चाय",
        },
        "mid_morning": {
            "en": "30ml fresh Karela (bitter gourd) juice OR sprout chaat with lemon",
            "hi": "30ml ताज़ा करेले का रस या अंकुरित अनाज का चाट नींबू के साथ",
        },
        "lunch": {
            "en": "2 bajra (millet) rotis + moong dal + bitter gourd sabzi + cucumber raita (low-fat)",
            "hi": "2 बाजरे की रोटी + मूंग दाल + करेले की सब्जी + खीरे का रायता (कम वसा)",
        },
        "evening_snack": {
            "en": "Roasted chana (25g) + 1 cup ginger-tulsi tea (no sugar)",
            "hi": "25g भुना चना + 1 कप अदरक-तुलसी चाय (बिना चीनी)",
        },
        "dinner": {
            "en": "1 multigrain roti + moong dal + sauteed drumstick (moringa) + clear vegetable soup",
            "hi": "1 मल्टीग्रेन रोटी + मूंग दाल + सहजन की सब्जी + सब्जी का सूप",
        },
        "bedtime": {
            "en": "Haldi doodh (turmeric milk) with black pepper — skimmed milk",
            "hi": "काली मिर्च के साथ हल्दी दूध — स्किम्ड दूध",
        },
    },
    "pitta_cvd": {
        "early_morning": {
            "en": "Coconut water (200ml) + 5 Amla berries OR 30ml fresh Amla juice",
            "hi": "नारियल पानी (200ml) + 5 आंवले या 30ml ताज़ा आंवले का रस",
        },
        "breakfast": {
            "en": "Oats with coconut milk + pomegranate seeds + cardamom",
            "hi": "नारियल दूध के साथ ओट्स + अनार के दाने + इलायची",
        },
        "mid_morning": {
            "en": "1 cup coriander-fennel cooling water + handful of soaked almonds",
            "hi": "1 कप धनिया-सौंफ का ठंडा पानी + भीगे हुए बादाम",
        },
        "lunch": {
            "en": "Basmati rice (small) + chana dal + bottle gourd (lauki) sabzi + cucumber salad",
            "hi": "बासमती चावल (थोड़ा) + चना दाल + लौकी की सब्जी + खीरे का सलाद",
        },
        "evening_snack": {
            "en": "Pomegranate juice (fresh, 150ml) or coconut water",
            "hi": "अनार का रस (ताज़ा, 150ml) या नारियल पानी",
        },
        "dinner": {
            "en": "2 wheat rotis + moong dal khichdi + leafy greens sabzi (palak/methi)",
            "hi": "2 गेहूं की रोटी + मूंग दाल खिचड़ी + हरी सब्जी (पालक/मेथी)",
        },
        "bedtime": {
            "en": "Warm (not hot) skimmed milk with cardamom and a pinch of saffron",
            "hi": "इलायची और केसर के साथ गर्म (गर्म नहीं) स्किम्ड दूध",
        },
    },
    "vata_general": {
        "early_morning": {
            "en": "Warm water with 1/2 tsp dry ginger powder + soaked figs (2)",
            "hi": "आधा चम्मच सूखा अदरक पाउडर के साथ गर्म पानी + भीगे अंजीर (2)",
        },
        "breakfast": {
            "en": "Wheat dalia (broken wheat porridge) with jaggery + warm milk",
            "hi": "गुड़ के साथ गेहूं का दलिया + गर्म दूध",
        },
        "mid_morning": {
            "en": "Banana + 1 cup Ashwagandha-ginger herbal tea",
            "hi": "केला + 1 कप अश्वगंधा-अदरक हर्बल चाय",
        },
        "lunch": {
            "en": "Basmati rice + masoor dal + cooked sweet potato + jeera raita",
            "hi": "बासमती चावल + मसूर दाल + पकी शकरकंद + जीरा रायता",
        },
        "evening_snack": {
            "en": "Dates (2-3) + soaked walnuts (5) + warm milk",
            "hi": "खजूर (2-3) + भीगे अखरोट (5) + गर्म दूध",
        },
        "dinner": {
            "en": "2 soft wheat rotis with ghee + mung dal soup + cooked carrots and beets",
            "hi": "घी के साथ 2 नरम गेहूं की रोटी + मूंग दाल सूप + पकी गाजर और चुकंदर",
        },
        "bedtime": {
            "en": "Warm turmeric milk (haldi doodh) with 1/4 tsp Ashwagandha",
            "hi": "1/4 चम्मच अश्वगंधा के साथ गर्म हल्दी दूध",
        },
    },
}


def generate_diet_plan(
    primary_dosha: str,
    diabetes_risk_level: str,
    cvd_risk_level: str,
    bmi: Optional[float] = None,
    language: str = "en",
) -> Dict[str, Any]:
    """Generate a personalised day-wise Ayurvedic diet plan."""

    # Select template
    if primary_dosha == "kapha" and diabetes_risk_level in ("high","critical","moderate"):
        template_key = "kapha_diabetic"
    elif primary_dosha == "pitta" and cvd_risk_level in ("high","critical","moderate"):
        template_key = "pitta_cvd"
    else:
        template_key = "vata_general"

    template = MEAL_TEMPLATES[template_key]
    foods = FOODS.get(f"{primary_dosha}_balancing", FOODS["kapha_balancing"])

    # Build meal plan
    meals = {}
    for meal_time, content in template.items():
        meals[meal_time] = {
            "time_label":   _time_labels(meal_time, language),
            "description":  content[language] if language in content else content["en"],
        }

    # Guidelines
    guidelines_en = [
        "Eat only when genuinely hungry — avoid snacking mindlessly.",
        "Chew each bite 20-30 times for better digestion.",
        "Main meal should be at midday when digestive fire (Agni) is strongest.",
        "Avoid ice-cold water — drink warm or room-temperature water.",
        "Eat in a calm environment, no screens during meals.",
        f"Portion guideline: fill stomach 1/2 food, 1/4 water, 1/4 empty (for {primary_dosha.title()} type).",
    ]
    guidelines_hi = [
        "केवल सच्ची भूख लगने पर ही खाएं — अनावश्यक नाश्ते से बचें।",
        "बेहतर पाचन के लिए प्रत्येक टुकड़े को 20-30 बार चबाएं।",
        "मुख्य भोजन दोपहर में करें जब पाचन अग्नि सबसे मजबूत हो।",
        "बर्फ-ठंडे पानी से बचें — गर्म या सामान्य तापमान का पानी पिएं।",
        "शांत वातावरण में खाएं, भोजन के दौरान स्क्रीन नहीं।",
        f"भाग दिशानिर्देश: पेट का 1/2 भोजन, 1/4 पानी, 1/4 खाली रखें ({primary_dosha.title()} प्रकार के लिए)।",
    ]

    return {
        "dosha": primary_dosha,
        "template": template_key,
        "meals": meals,
        "recommended_foods": foods,
        "guidelines": guidelines_hi if language == "hi" else guidelines_en,
        "weekly_note": (
            "यह भोजन योजना सप्ताह में 5 दिन पालन करें और 2 दिन लचीलापन रखें।"
            if language == "hi" else
            "Follow this meal plan 5 days/week. Allow 2 flexible days to maintain sustainability."
        ),
        "disclaimer": (
            "यह आहार योजना BAMS/AYUSH चिकित्सक की सलाह का विकल्प नहीं है।"
            if language == "hi" else
            "This diet plan is a general guideline and not a substitute for consultation with a registered BAMS/AYUSH practitioner."
        ),
    }


def _time_labels(key: str, language: str) -> str:
    labels = {
        "early_morning": ("Early Morning (6:00–7:00 AM)",  "प्रातःकाल (6:00–7:00 बजे)"),
        "breakfast":     ("Breakfast (8:00–9:00 AM)",       "नाश्ता (8:00–9:00 बजे)"),
        "mid_morning":   ("Mid-Morning (10:30–11:00 AM)",   "मध्य सुबह (10:30–11:00 बजे)"),
        "lunch":         ("Lunch (12:30–1:30 PM)",          "दोपहर का भोजन (12:30–1:30 बजे)"),
        "evening_snack": ("Evening Snack (4:30–5:30 PM)",   "शाम का नाश्ता (4:30–5:30 बजे)"),
        "dinner":        ("Dinner (7:00–8:00 PM)",          "रात का खाना (7:00–8:00 बजे)"),
        "bedtime":       ("Bedtime (9:30–10:00 PM)",        "सोने से पहले (9:30–10:00 बजे)"),
    }
    idx = 1 if language == "hi" else 0
    return labels.get(key, (key, key))[idx]
