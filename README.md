# SpikeSense

**A Valorant companion app that helps players learn the game.**

SpikeSense is an Overwolf application designed to help newer and intermediate Valorant players build better game sense. During a match, it displays helpful suggestions based on the current round state, giving players a reference point for common strategies and mechanics they may not yet be familiar with.

The goal is not to play the game for you — it's to help you understand why certain decisions tend to work, so you can develop your own game sense over time.

---

## Features

- **Buy Phase Suggestions** — shows a helpful note during the buy phase about common economy decisions, such as when teams typically save, eco, or full buy based on credit counts
- **Situational Reminders** — during the round, displays a short suggestion referencing common Valorant strategies for the current situation, such as typical positioning patterns or when players generally use certain abilities
- **In-game Overlay** — a small, unobtrusive overlay that displays a suggestion and fades away after a customizable amount of time.
- **Round History** — a session log so players can review the suggestions from previous rounds and reflect on their decisions
- **Win Likelihood Indicator** — a rough estimate based on economy to help newer players understand how credit advantage affects round outcomes
- **Player Habit Tracking** — tracks which approaches have tended to work for the player personally, helping them identify patterns in their own playstyle

---

## How It Works

SpikeSense currently just uses the **Overwolf Game Events Provider (GEP)** to read match data directly from the Valorant client. A local Python backend processes the round state and uses the **Gemini AI** to generate short, plain-English suggestions that reference common Valorant strategies. The suggestion is displayed in a small HUD overlay that the player can choose to read or ignore.
The player retains full agency over every decision. SpikeSense only ever displays a text suggestion — it does not interact with the game client in any way.

---

## Tech Stack

- **Frontend:** TypeScript, Overwolf API
- **Backend:** Python, FastAPI, XGBoost
- **AI:** Google Gemini with Google Search grounding
- **Data:** Overwolf GEP

---

## Compliance

SpikeSense is developed in accordance with Riot Games' third-party tool policies and Overwolf's developer guidelines. The app reads only data exposed by the Overwolf GEP and does not interact with or modify the Valorant game client in any way. All suggestions are passive text references — the app does not automate any player input or decision.

---

## Status

Currently in development. Targeting release on the Overwolf Appstore.

---

## Contact

For enquiries contact: shwisqygaming@gmail.com
