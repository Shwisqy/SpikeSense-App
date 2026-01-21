from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import json
from pathlib import Path
from typing import Dict, Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory match state: match_id -> list of rounds
matches: Dict[str, Any] = {}

# Data folder and files
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
RAW_FILE = DATA_DIR / "raw_events.jsonl"
ROUNDS_FILE = DATA_DIR / "rounds.jsonl"
EVENTS_FILE = DATA_DIR / "events.jsonl"


def parse_json_field(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return value
    return value


@app.get("/")
async def root():
    return {"status": "ok"}


@app.post("/valorant/round")
async def valorant_round(request: Request):
    raw = await request.json()
    # Always log raw payload for debugging / future parsing
    with RAW_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(raw, ensure_ascii=False) + "\n")
    payload = raw.get("raw", raw)

    score = parse_json_field(payload.get("score"))
    match_score = parse_json_field(payload.get("match_score"))
    game_mode = parse_json_field(payload.get("game_mode"))

    match_id = payload.get("match_id") or "unknown"

    cleaned_round = {
        "match_id": match_id,
        "map": payload.get("map"),
        "team": payload.get("team"),
        "round_number": int(payload.get("round_number")) if payload.get("round_number") is not None else None,
        "round_phase": payload.get("round_phase"),
        "score": score,
        "match_score": match_score,
        "match_outcome": payload.get("match_outcome"),
        "game_mode": game_mode,
        # rich info
        "roster": payload.get("roster"),
        "scoreboard": payload.get("scoreboard"),
        "planted_site": payload.get("planted_site"),
        "round_report": payload.get("round_report"),
        # client timestamp
        "received_at": raw.get("ts") or payload.get("ts"),
    }

    # --- Match-level memory for quick stats ---
    history = matches.setdefault(match_id, [])
    history.append(cleaned_round)

    total_rounds = len(history)
    wins = 0
    losses = 0
    for r in history:
        s = r.get("score") or {}
        if isinstance(s, dict):
            w = s.get("won")
            l = s.get("lost")
            if isinstance(w, int) and isinstance(l, int):
                wins = max(wins, w)
                losses = max(losses, l)

    score_diff = None
    if isinstance(score, dict):
        w = score.get("won")
        l = score.get("lost")
        if isinstance(w, int) and isinstance(l, int):
            score_diff = w - l

    match_summary = {
        "rounds_seen": total_rounds,
        "wins": wins,
        "losses": losses,
        "score_diff": score_diff,
    }

    record = {
        "round": cleaned_round,
        "match": match_summary,
    }

    print("=== CLEAN ROUND SNAPSHOT ===")
    print(cleaned_round)
    print("=== MATCH SUMMARY ===")
    print(match_summary)

    with ROUNDS_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    return {
        "ok": True,
        "round": cleaned_round,
        "match": match_summary,
    }


@app.post("/valorant/event")
async def valorant_event(request: Request):
    raw = await request.json()
    payload = raw.get("raw", raw)

    event_record = {
        "match_id": payload.get("match_id"),
        "round_number": payload.get("round_number"),
        "event_type": payload.get("event_type"),  # "plant", "your_death", "mid_round_update", etc.
        "ts": raw.get("ts") or payload.get("ts"),
        "data": payload.get("data"),
    }

    print("=== EVENT ===")
    print(event_record)

    with EVENTS_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event_record, ensure_ascii=False) + "\n")

    return {"ok": True}
