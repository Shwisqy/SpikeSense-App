export class ValorantRoundTracker {
  constructor() {
    this.latestMatchInfo = {};
    this.latestRoster = null;
    this.latestScoreboard = null;
    this.latestPlantedSite = null;
    this.lastSentRoundKey = null;
  }

  // Called from BackgroundController._onInfoUpdate(infoUpdate.info)
  _onInfoUpdate(info) {
    if (!info) return;

    if (info.match_info) {
      this._handleMatchInfo(info.match_info);
    }
  }

  _handleMatchInfo(mi) {
    // Merge incremental updates into our cache
    this.latestMatchInfo = { ...this.latestMatchInfo, ...mi };

    if (mi.roster) this.latestRoster = mi.roster;
    if (mi.scoreboard) this.latestScoreboard = mi.scoreboard;
    if (mi.planted_site) this.latestPlantedSite = mi.planted_site;
    if (mi.round_report) this.latestMatchInfo.round_report = mi.round_report;

    const roundNumber = this.latestMatchInfo.round_number;
    const roundPhase = this.latestMatchInfo.round_phase;
    const matchId = this.latestMatchInfo.match_id;

    // 1) Mid-round update event (more granular pattern info)
    if (roundNumber != null && roundPhase === "combat" && matchId) {
      this._sendEvent("mid_round_update", {
        scoreboard: this.latestScoreboard,
        score: this.latestMatchInfo.score,
        match_score: this.latestMatchInfo.match_score,
      });
    }

    // 2) Planted site summary (arrives at game_end as array)
    if (mi.planted_site && Array.isArray(mi.planted_site)) {
      this._sendEvent("planted_site_summary", {
        planted_site: mi.planted_site,
      });
    }

    // 3) End-of-round snapshot for clean dataset
    if (roundNumber != null && roundPhase === "end" && matchId) {
      const key = `${matchId}:${roundNumber}:end`;
      if (key !== this.lastSentRoundKey) {
        this.lastSentRoundKey = key;
        this._sendRoundSnapshot();
      }
    }
  }

  _sendRoundSnapshot() {
    const mi = this.latestMatchInfo || {};

    const payload = {
      match_id: mi.match_id,
      map: mi.map,
      team: mi.team,
      round_number: mi.round_number,
      round_phase: mi.round_phase,
      score: mi.score,
      match_score: mi.match_score,
      match_outcome: mi.match_outcome,
      game_mode: mi.game_mode,
      roster: this.latestRoster,
      scoreboard: this.latestScoreboard,
      planted_site: this.latestPlantedSite,
      round_report: mi.round_report,
      ts: Date.now(),
    };

    console.log("[ValorantRoundTracker] Sending round snapshot", payload);

    try {
      fetch("http://127.0.0.1:8000/valorant/round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) =>
        console.error("[ValorantRoundTracker] Failed to send snapshot", err)
      );
    } catch (e) {
      console.error("[ValorantRoundTracker] fetch error", e);
    }
  }

  _sendEvent(eventType, data) {
    const mi = this.latestMatchInfo || {};

    const payload = {
      match_id: mi.match_id,
      round_number: mi.round_number,
      event_type: eventType,
      data,
      ts: Date.now(),
    };

    console.log("[ValorantRoundTracker] Sending event", eventType, payload);

    try {
      fetch("http://127.0.0.1:8000/valorant/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) =>
        console.error("[ValorantRoundTracker] Failed to send event", err)
      );
    } catch (e) {
      console.error("[ValorantRoundTracker] event fetch error", e);
    }
  }
}
