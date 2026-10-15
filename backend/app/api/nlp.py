from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()


class NLPExtractRequest(BaseModel):
    text: str


SAMPLE_DISASTER_MESSAGES = [
    {
        "id": "MSG-01",
        "title": "Velachery Residential Distress SOS",
        "text": "SOS! Catastrophic flash flood in Velachery AGS Colony. Water entered ground floors and is 4 feet deep. Around 500 people stranded without drinking water and baby food. Need medical kits and rescue boats immediately!"
    },
    {
        "id": "MSG-02",
        "title": "Mudichur Submerged River Corridor",
        "text": "Heavy flooding in Mudichur Krishna Nagar, Adyar river overflowed. Around 380 residents cut off. Water level is chest-deep (1.8m). Diabetic elderly patients need insulin and food rations urgently. Road is impassable."
    },
    {
        "id": "MSG-03",
        "title": "Perambur Subway Inundation",
        "text": "Perambur Barracks Road railway underpass completely submerged. Nearly 250 citizens trapped at community shelter. Clean drinking water and blankets needed."
    },
    {
        "id": "MSG-04",
        "title": "Manali Industrial Creek Surge",
        "text": "CRITICAL EMERGENCY: Ennore Creek storm surge submerging Manali industrial sector. 400 contractual laborers stranded on factory rooftops. Submerged over 5 feet. High urgency, deploy amphibious craft now!"
    },
    {
        "id": "MSG-05",
        "title": "T. Nagar Commercial Core Waterlogging",
        "text": "Waterlogging on Usman Road T. Nagar. Around 150 shopkeepers and residents stranded with knee deep water. Requesting potable drinking water and food packets."
    }
]


@router.post("/nlp/extract")
def extract_disaster_info(req: NLPExtractRequest, request: Request):
    nlp_extractor = getattr(request.app.state, "nlp_extractor", None)
    if not nlp_extractor:
        from backend.app.services.nlp_extractor import NLPExtractor
        nlp_extractor = NLPExtractor()
        request.app.state.nlp_extractor = nlp_extractor

    result = nlp_extractor.extract(req.text)
    return {
        "status": "ok",
        "raw_text": req.text,
        "extracted_data": result
    }


@router.get("/nlp/samples")
def get_sample_messages():
    return {
        "status": "ok",
        "samples": SAMPLE_DISASTER_MESSAGES
    }
