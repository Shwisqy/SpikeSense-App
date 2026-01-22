import {
  OWGames,
  OWGameListener,
  OWWindow
} from '@overwolf/overwolf-api-ts';

import { kWindowNames, kGameClassIds, kGamesFeatures } from "../consts";

import RunningGameInfo = overwolf.games.RunningGameInfo;
import AppLaunchTriggeredEvent = overwolf.extensions.AppLaunchTriggeredEvent;

class BackgroundController {
  private static _instance: BackgroundController;
  private _windows: Record<string, OWWindow> = {};
  private _gameListener: OWGameListener;

  private constructor() {
    this._windows[kWindowNames.desktop] = new OWWindow(kWindowNames.desktop);
    this._windows[kWindowNames.inGame] = new OWWindow(kWindowNames.inGame);

    this._gameListener = new OWGameListener({
      onGameStarted: this.onGameStarted.bind(this),
      onGameEnded: this.onGameEnded.bind(this),
    });

    overwolf.extensions.onAppLaunchTriggered.addListener(
      e => this.onAppLaunchTriggered(e)
    );
  }

  public static instance(): BackgroundController {
    if (!BackgroundController._instance) {
      BackgroundController._instance = new BackgroundController();
    }
    return BackgroundController._instance;
  }

  public async run() {
    this._gameListener.start();

    const currWindowName = (await this.isSupportedGameRunning())
      ? kWindowNames.inGame
      : kWindowNames.desktop;

    this._windows[currWindowName].restore();

    // If a supported game is already running, set up GEP now
    const info = await OWGames.getRunningGameInfo();
    if (info && info.isRunning && this.isSupportedGame(info)) {
      this.initGameEventsForwarding(info.classId);
    }
  }

  private async onAppLaunchTriggered(e: AppLaunchTriggeredEvent) {
    console.log('onAppLaunchTriggered():', e);

    if (!e || e.origin.includes('gamelaunchevent')) {
      return;
    }

    if (await this.isSupportedGameRunning()) {
      this._windows[kWindowNames.desktop].close();
      this._windows[kWindowNames.inGame].restore();
    } else {
      this._windows[kWindowNames.desktop].restore();
      this._windows[kWindowNames.inGame].close();
    }
  }

  private onGameStarted(info: RunningGameInfo) {
    if (!info || !this.isSupportedGame(info)) return;

    this._windows[kWindowNames.desktop].close();
    this._windows[kWindowNames.inGame].restore();

    this.initGameEventsForwarding(info.classId);
  }

  private onGameEnded(info: RunningGameInfo) {
    if (!info || !this.isSupportedGame(info)) return;

    this._windows[kWindowNames.desktop].restore();
    this._windows[kWindowNames.inGame].close();
  }

  private async isSupportedGameRunning(): Promise<boolean> {
    const info = await OWGames.getRunningGameInfo();
    return info && info.isRunning && this.isSupportedGame(info);
  }

  private isSupportedGame(info: RunningGameInfo) {
    return kGameClassIds.includes(info.classId);
  }

  /**
   * Subscribe to game events for the given classId and forward info updates to FastAPI.
   */
  private initGameEventsForwarding(classId: number) {
    const gameFeatures = kGamesFeatures.get(classId) || [];

    console.log("[BG] Setting required features for classId", classId, gameFeatures);

    overwolf.games.events.setRequiredFeatures(
      gameFeatures,
      res => {
        console.log("[BG] setRequiredFeatures result:", res);
      }
    );

    // Info updates (includes match_info, scoreboard, roster, etc. for Valorant) [web:422]
    overwolf.games.events.onInfoUpdates2.addListener((info) => {
      console.log("[BG] Info update:", info);

      const snapshot = {
        ts: Date.now(),
        raw: info
      };

      // Only forward Valorant-style info updates for now
      try {
        fetch("http://127.0.0.1:8000/valorant/round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        }).catch((err) => {
          console.error("[BG] Failed to send info snapshot to backend:", err);
        });
      } catch (e) {
        console.error("[BG] fetch error (info)", e);
      }
    });

    // You can still listen to discrete events if you want them later
    overwolf.games.events.onNewEvents.addListener((events) => {
      console.log("[BG] New events:", events);
      // similar POST to /valorant/event could go here later
    });
  }
}

BackgroundController.instance().run();
