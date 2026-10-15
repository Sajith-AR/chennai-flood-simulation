"""
Crisis Information NLP Extraction Service.
Extracts structured disaster intelligence from unstructured citizen messages, SMS,
helpline transcripts, and social media distress alerts for Greater Chennai Corporation.
Uses spaCy linguistics with comprehensive Chennai Gazetteer and regex entity parsing.
"""
import re
from typing import Dict, Any, List, Optional, Tuple

# Comprehensive Chennai Metropolitan Gazetteer with approximate WGS-84 centroids and GCC Zones
CHENNAI_GAZETTEER: Dict[str, Dict[str, Any]] = {
    "velachery": {
        "canonical": "Velachery",
        "zone": "Zone 13 (Velachery)",
        "coords": [12.9752, 80.2215],
        "keywords": ["velachery", "ags colony", "vijaya nagar", "tansi nagar", "ram nagar velachery"]
    },
    "mudichur": {
        "canonical": "Mudichur",
        "zone": "Suburban South (Tambaram Belt)",
        "coords": [12.9249, 80.0883],
        "keywords": ["mudichur", "varadharajapuram", "krishna nagar mudichur"]
    },
    "tambaram": {
        "canonical": "Tambaram",
        "zone": "Tambaram Municipality",
        "coords": [12.9229, 80.1275],
        "keywords": ["tambaram", "west tambaram", "east tambaram", "sanatorium", "irumbuliyur"]
    },
    "perambur": {
        "canonical": "Perambur",
        "zone": "Zone 4 (Tondiarpet / Perambur)",
        "coords": [13.1140, 80.2450],
        "keywords": ["perambur", "barracks road", "jamalia", "vyasarpadi", "perambur loco"]
    },
    "t nagar": {
        "canonical": "T. Nagar",
        "zone": "Zone 10 (Kodambakkam)",
        "coords": [13.0418, 80.2341],
        "keywords": ["t nagar", "t.nagar", "thyagaraya nagar", "usman road", "panagal park", "bazullah road"]
    },
    "manali": {
        "canonical": "Manali",
        "zone": "Zone 2 (Manali)",
        "coords": [13.1700, 80.2600],
        "keywords": ["manali", "ennore", "manali new town", "sadayankuppam", "burmah colony"]
    },
    "kolathur": {
        "canonical": "Kolathur",
        "zone": "Zone 6 (Kolathur)",
        "coords": [13.1250, 80.2180],
        "keywords": ["kolathur", "villivakkam", "thanikachalam nagar", "retteri"]
    },
    "guindy": {
        "canonical": "Guindy",
        "zone": "Zone 9 (Teynampet / Guindy)",
        "coords": [13.0125, 80.2355],
        "keywords": ["guindy", "ekkatuthangal", "kathipara", "race course"]
    },
    "adyar": {
        "canonical": "Adyar",
        "zone": "Zone 13 (Adyar)",
        "coords": [13.0060, 80.2570],
        "keywords": ["adyar", "gandhi nagar", "kotturpuram", "kasturibai nagar"]
    },
    "anna nagar": {
        "canonical": "Anna Nagar",
        "zone": "Zone 8 (Anna Nagar)",
        "coords": [13.0850, 80.2100],
        "keywords": ["anna nagar", "shanti colony", "anna nagar west", "roundtana"]
    },
    "mylapore": {
        "canonical": "Mylapore",
        "zone": "Zone 9 (Mylapore)",
        "coords": [13.0450, 80.2810],
        "keywords": ["mylapore", "mandaveli", "san thome", "marina"]
    },
    "royapuram": {
        "canonical": "Royapuram",
        "zone": "Zone 5 (Royapuram)",
        "coords": [13.1130, 80.2950],
        "keywords": ["royapuram", "kasimedu", "kalmandapam"]
    },
    "madhavaram": {
        "canonical": "Madhavaram",
        "zone": "Zone 3 (Madhavaram)",
        "coords": [13.1480, 80.2310],
        "keywords": ["madhavaram", "moolakadai", "milk colony"]
    },
    "sholinganallur": {
        "canonical": "Sholinganallur",
        "zone": "Zone 15 (Sholinganallur / OMR)",
        "coords": [12.9010, 80.2279],
        "keywords": ["sholinganallur", "omr", "perungudi", "karapakkam", "thoraipakkam"]
    },
    "pallikaranai": {
        "canonical": "Pallikaranai",
        "zone": "Zone 14 (Perungudi / Pallikaranai)",
        "coords": [12.9550, 80.2180],
        "keywords": ["pallikaranai", "marshland", "medavakkam", "kovilambakkam"]
    }
}

URGENCY_KEYWORDS = {
    "critical": [
        "sos", "critical", "dying", "life threatening", "submerged", "trapped on roof",
        "children", "infant", "pregnant", "cardiac", "dialysis", "swept away", "emergency",
        "danger", "drowning", "now", "immediately", "starving", "no water for 2 days"
    ],
    "high": [
        "urgent", "urgent help", "severe", "elderly", "stranded", "cut off", "no power",
        "3 feet", "4 feet", "5 feet", "chest deep", "waist deep", "food running out",
        "water entering house", "no drinking water"
    ],
    "medium": [
        "needed", "assistance", "moderate", "waterlogged", "water logging", "knee deep",
        "first floor", "running low", "requesting", "power outage"
    ],
    "low": [
        "minor", "advisory", "traffic slow", "slight water", "drains slow", "information"
    ]
}

DISASTER_TYPE_MAP = [
    (r"\b(flash\s*flood|flashflood)\b", "Flash Flood"),
    (r"\b(river\s*overflow|river\s*breach|adyar\s*overflow|cooum\s*overflow)\b", "River Overflow"),
    (r"\b(storm\s*surge|sea\s*surge|tidal\s*surge|coastal\s*flood)\b", "Storm Surge"),
    (r"\b(bund\s*breach|lake\s*breach|tank\s*breach|overflowing\s*lake)\b", "Bund Breach"),
    (r"\b(subway\s*flooded|subway\s*water|underpass\s*submerged)\b", "Subway Submersion"),
    (r"\b(waterlog(ging)?|inundat(ed|ion)|flooded?|submerged?)\b", "Urban Inundation"),
]


class NLPExtractor:
    def __init__(self):
        self.nlp = None
        self._init_spacy()

    def _init_spacy(self):
        try:
            import spacy
            # Try to load lightweight English model, or fall back to blank
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except Exception:
                self.nlp = spacy.blank("en")
        except Exception as e:
            print(f"NLP Extractor: spaCy fallback mode ({e})")
            self.nlp = None

    def extract(self, text: str) -> Dict[str, Any]:
        """
        Parses raw crisis text and returns structured intelligence.
        """
        if not text or not text.strip():
            return self._empty_result()

        clean_text = text.strip()
        lower_text = clean_text.lower()
        extracted_entities = []

        # 1. Location Identification via Gazetteers
        matched_loc_key = None
        matched_loc_info = None
        for key, info in CHENNAI_GAZETTEER.items():
            for kw in info["keywords"]:
                pattern = r"\b" + re.escape(kw) + r"\b"
                match = re.search(pattern, lower_text)
                if match:
                    matched_loc_key = key
                    matched_loc_info = info
                    extracted_entities.append({
                        "entity": "LOCATION",
                        "text": clean_text[match.start():match.end()],
                        "start": match.start(),
                        "end": match.end(),
                        "canonical": info["canonical"]
                    })
                    break
            if matched_loc_info:
                break

        location_name = matched_loc_info["canonical"] if matched_loc_info else "Central Chennai (Default)"
        zone_name = matched_loc_info["zone"] if matched_loc_info else "Zone 5 (Royapuram / Central)"
        coords = matched_loc_info["coords"] if matched_loc_info else [13.0827, 80.2707]

        # 2. Disaster Type Identification
        disaster_type = "Urban Inundation"
        for pattern, dtype in DISASTER_TYPE_MAP:
            match = re.search(pattern, lower_text)
            if match:
                disaster_type = dtype
                extracted_entities.append({
                    "entity": "DISASTER_TYPE",
                    "text": clean_text[match.start():match.end()],
                    "start": match.start(),
                    "end": match.end(),
                    "canonical": dtype
                })
                break

        # 3. Affected Population Estimation
        # Look for patterns like "500 people", "around 300 citizens", "45 families"
        affected_pop = 150  # sensible default
        pop_patterns = [
            r"(\d+)\s*(?:people|citizens|residents|persons|souls|stranded|trapped)",
            r"(?:around|about|approx|over|nearly)\s*(\d+)",
            r"(\d+)\s*(?:families|households|homes)"
        ]
        pop_found = False
        for pat in pop_patterns:
            match = re.search(pat, lower_text)
            if match:
                num = int(match.group(1))
                if "famil" in match.group(0) or "household" in match.group(0) or "home" in match.group(0):
                    affected_pop = num * 4  # Average Indian urban household size ~4
                else:
                    affected_pop = num
                extracted_entities.append({
                    "entity": "POPULATION",
                    "text": clean_text[match.start():match.end()],
                    "start": match.start(),
                    "end": match.end(),
                    "value": affected_pop
                })
                pop_found = True
                break

        # 4. Water Depth Estimation
        water_depth_m = 0.8
        depth_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:feet|ft|m|meters|metre)", lower_text)
        if depth_match:
            val = float(depth_match.group(1))
            matched_span = depth_match.group(0)
            if "feet" in matched_span or "ft" in matched_span:
                water_depth_m = round(val * 0.3048, 2)
            else:
                water_depth_m = round(val, 2)
            extracted_entities.append({
                "entity": "WATER_DEPTH",
                "text": clean_text[depth_match.start():depth_match.end()],
                "start": depth_match.start(),
                "end": depth_match.end(),
                "value_m": water_depth_m
            })
        elif "chest deep" in lower_text or "chest-deep" in lower_text:
            water_depth_m = 1.4
        elif "waist deep" in lower_text or "waist-deep" in lower_text:
            water_depth_m = 1.0
        elif "knee deep" in lower_text or "knee-deep" in lower_text:
            water_depth_m = 0.5

        # 5. Urgency Classification
        urgency = "medium"
        for level in ["critical", "high", "medium", "low"]:
            for cue in URGENCY_KEYWORDS[level]:
                if re.search(r"\b" + re.escape(cue) + r"\b", lower_text):
                    urgency = level
                    extracted_entities.append({
                        "entity": "URGENCY",
                        "text": cue,
                        "level": level
                    })
                    break
            if urgency != "medium":
                break

        # Override urgency if depth > 1.5m or pop > 400
        if water_depth_m >= 1.5 or affected_pop >= 400:
            if urgency in ["medium", "low"]:
                urgency = "high"

        # 6. Requested Resources Extraction & Sphere Standard Derivation
        # Sphere Standard: 10L water / person / day, 2 food rations, 1 med kit per 10-15 people
        has_water = bool(re.search(r"\b(water|drinking water|water pouches|drinking)\b", lower_text))
        has_food = bool(re.search(r"\b(food|rations|meals|baby food|bread|rice|groceries)\b", lower_text))
        has_meds = bool(re.search(r"\b(med(ic(al|ine|s))?|first aid|kits|insulin|doctor|injur(ed|y))\b", lower_text))
        has_blankets = bool(re.search(r"\b(blanket(s)?|bedsheet(s)?|mat(s)?|warm clothes)\b", lower_text))
        has_boats = bool(re.search(r"\b(boat(s)?|zodiac|dinghy|raft|amphibious|evacuate by boat)\b", lower_text))

        demands = {
            "water_litres": affected_pop * 10,
            "food_rations": affected_pop * 2,
            "medical_kits": max(5, affected_pop // 10) if has_meds or urgency == "critical" else max(2, affected_pop // 25),
            "blankets": int(affected_pop * 0.6) if has_blankets or urgency in ["critical", "high"] else int(affected_pop * 0.3),
            "rescue_boats": max(1, affected_pop // 100) if (has_boats or water_depth_m >= 1.2) else 0
        }

        # 7. Confidence Score Calculation
        confidence = 0.50
        if matched_loc_info:
            confidence += 0.25
        if pop_found:
            confidence += 0.15
        if depth_match or water_depth_m != 0.8:
            confidence += 0.05
        if urgency != "medium":
            confidence += 0.05
        confidence = min(0.98, round(confidence, 2))

        # 8. Human-Readable Explanation
        explanation = [
            f"Location identified as '{location_name}' in {zone_name}." if matched_loc_info else "No specific locality matched; anchored to Central Sector.",
            f"Population estimated at {affected_pop} citizens." if pop_found else f"Using baseline estimate of {affected_pop} affected citizens.",
            f"Water depth detected at ~{water_depth_m}m ({'Road cut off' if water_depth_m >= 0.35 else 'Road passable by high clearance'}).",
            f"Classified as '{urgency.upper()}' urgency based on distress severity cues."
        ]

        return {
            "location": location_name,
            "zone": zone_name,
            "coordinates": coords,
            "disaster_type": disaster_type,
            "water_depth_m": water_depth_m,
            "affected_population": affected_pop,
            "urgency": urgency,
            "demands": demands,
            "confidence_score": confidence,
            "extracted_entities": extracted_entities,
            "explanation": " • ".join(explanation),
            "road_accessible": water_depth_m < 0.35
        }

    def _empty_result(self) -> Dict[str, Any]:
        return {
            "location": "Central Chennai",
            "zone": "Zone 5 (Central)",
            "coordinates": [13.0827, 80.2707],
            "disaster_type": "Urban Inundation",
            "water_depth_m": 0.5,
            "affected_population": 100,
            "urgency": "medium",
            "demands": {
                "water_litres": 1000,
                "food_rations": 200,
                "medical_kits": 10,
                "blankets": 50,
                "rescue_boats": 0
            },
            "confidence_score": 0.3,
            "extracted_entities": [],
            "explanation": "No text provided. Returned baseline defaults.",
            "road_accessible": True
        }
