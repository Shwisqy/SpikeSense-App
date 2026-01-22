import { OWGames, OWGamesEvents, OWHotkeys } from "@overwolf/overwolf-api-ts";
import { AppWindow } from "../AppWindow";
import { kHotkeys, kWindowNames, kGamesFeatures } from "../consts";
import WindowState = overwolf.windows.WindowStateEx;

interface MatchSnapshot {
  match_id: string | null;
  map: string | null;
  team: string | null;
  round_number: number | null;
  round_phase: string | null;
  score: any;
  match_score: any;
  match_outcome: string | null;
  game_mode: any;
  roster: any;
  scoreboard: any;
  planted_site: string | null;
}

const currentState: MatchSnapshot = {
  match_id: null,
  map: null,
  team: null,
  round_number: null,
  round_phase: null,
  score: null,
  match_score: null,
  match_outcome: null,
  game_mode: null,
  roster: null,
  scoreboard: null,
  planted_site: null
};

let lastStratsText = "Waiting for strategy suggestions...";

// The window displayed in-game while a game is running.
class InGame extends AppWindow {
  private static _instance: InGame;
  private _gameEventsListener: OWGamesEvents;
  private _eventsLog: HTMLElement;
  private _infoLog: HTMLElement;

  private constructor() {
    super(kWindowNames.inGame);

    this._eventsLog = document.getElementById("eventsLog") as HTMLElement;
    this._infoLog = document.getElementById("infoLog") as HTMLElement;

    const panel = document.getElementById("stratsPanel");
    if (panel) {
      panel.textContent = lastStratsText;
    }

    this.setToggleHotkeyBehavior();
    this.setToggleHotkeyText();
  }

  public static instance() {
    if (!this._instance) {
      this._instance = new InGame();
    }
    return this._instance;
  }

  public async run() {
    const gameClassId = await this.getCurrentGameClassId();
    const gameFeatures = kGamesFeatures.get(gameClassId);

    if (gameFeatures && gameFeatures.length) {
      this._gameEventsListener = new OWGamesEvents(
        {
          onInfoUpdates: this.onInfoUpdates.bind(this),
          onNewEvents: this.onNewEvents.bind(this)
        },
        gameFeatures
      );

      this._gameEventsListener.start();
    }
  }

  // Build currentState and show a summary
  private onInfoUpdates(info) {
    this.logLine(this._infoLog, info, false);

    const mi = info && info.match_info ? info.match_info : {};

    currentState.match_id =
      mi.match_id || mi.pseudo_match_id || currentState.match_id;
    currentState.map = mi.map ?? currentState.map;
    currentState.team = mi.team ?? currentState.team;
    currentState.round_number = mi.round_number ?? currentState.round_number;
    currentState.round_phase = mi.round_phase ?? currentState.round_phase;
    currentState.score = mi.score ?? currentState.score;
    currentState.match_score = mi.match_score ?? currentState.match_score;
    currentState.match_outcome =
      mi.match_outcome ?? currentState.match_outcome;
    currentState.game_mode = mi.game_mode ?? currentState.game_mode;
    currentState.roster = mi.roster ?? currentState.roster;
    currentState.scoreboard = mi.scoreboard ?? currentState.scoreboard;
    currentState.planted_site =
      mi.planted_site ?? currentState.planted_site;

    const panel = document.getElementById("stratsPanel");
    if (panel) {
      lastStratsText =
        `Map: ${currentState.map} | Team: ${currentState.team} | ` +
        `R: ${currentState.round_number} (${currentState.round_phase}) | ` +
        `Score: ${JSON.stringify(currentState.score)}`;
      panel.textContent = lastStratsText;
    }

    if (
      currentState.round_phase === "shopping" ||
      currentState.round_phase === "combat"
    ) {
      try {
        fetch("http://localhost:8000/valorant/round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentState)
        }).catch(console.error);
      } catch (e) {
        console.error(e);
      }
    }
  }

  // Special events will be highlighted in the event log
  private onNewEvents(e) {
    const shouldHighlight = e.events.some((event) => {
      switch (event.name) {
        case "kill":
        case "death":
        case "assist":
        case "level":
        case "matchStart":
        case "match_start":
        case "matchEnd":
        case "match_end":
          return true;
      }

      return false;
    });

    this.logLine(this._eventsLog, e, shouldHighlight);

    const planted = e.events.find(
      (ev) =>
        ev.name === "bomb_planted" ||
        ev.name === "bomb_planted_site" ||
        ev.name === "round_planted_site"
    );
    if (planted && planted.data && planted.data.site) {
      currentState.planted_site = planted.data.site;
    }
  }

  private async setToggleHotkeyText() {
    const gameClassId = await this.getCurrentGameClassId();
    const hotkeyText = await OWHotkeys.getHotkeyText(
      kHotkeys.toggle,
      gameClassId
    );
    const hotkeyElem = document.getElementById("hotkey");
    if (hotkeyElem) {
      hotkeyElem.textContent = hotkeyText;
    }
  }

  private async setToggleHotkeyBehavior() {
    const toggleInGameWindow = async (
      hotkeyResult: overwolf.settings.hotkeys.OnPressedEvent
    ): Promise<void> => {
      console.log(`pressed hotkey for ${hotkeyResult.name}`);

      const inGameState = await this.getWindowState();

      if (
        inGameState.window_state === WindowState.NORMAL ||
        inGameState.window_state === WindowState.MAXIMIZED
      ) {
        this.currWindow.minimize();
      } else if (
        inGameState.window_state === WindowState.MINIMIZED ||
        inGameState.window_state === WindowState.CLOSED
      ) {
        this.currWindow.restore();
      }
    };

    OWHotkeys.onHotkeyDown(kHotkeys.toggle, toggleInGameWindow);
  }

  private logLine(log: HTMLElement, data, highlight: boolean) {
    const line = document.createElement("pre");

    line.textContent = JSON.stringify(data);

    if (highlight) {
      line.className = "highlight";
    }

    const shouldAutoScroll =
      log.scrollTop + log.offsetHeight >= log.scrollHeight - 10;

    log.appendChild(line);

    if (shouldAutoScroll) {
      log.scrollTop = log.scrollHeight;
    }
  }

  private async getCurrentGameClassId(): Promise<number | null> {
    const info = await OWGames.getRunningGameInfo();
    return info && info.isRunning && info.classId ? info.classId : null;
  }
}

InGame.instance().run();
