import streamDeck, {
    action,
    KeyDownEvent,
    SingletonAction,
    WillAppearEvent,
} from "@elgato/streamdeck";
import {
    PlaybackActionSettings,
    VolumeActionSettings,
    VolumePresetSettings,
} from "../spotify/types";
import {
    togglePlayPause,
    nextTrack,
    previousTrack,
    changeVolume,
    setVolume,
    getPlaybackState,
} from "../spotify/api";

// ─────────────────────────────────────────────────────────────────────────────
// Play / Pause Toggle
// ─────────────────────────────────────────────────────────────────────────────

@action({ UUID: "com.spotify-macos.control.play-pause" })
export class PlayPauseAction extends SingletonAction<PlaybackActionSettings> {
    override async onWillAppear(ev: WillAppearEvent<PlaybackActionSettings>) {
        await this.updateTitle(ev.action);
    }

    override async onKeyDown(ev: KeyDownEvent<PlaybackActionSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;

        try {
            await togglePlayPause(globalSettings.clientId, settings.deviceId);
            await ev.action.showOk();
            await this.updateTitle(ev.action);
        } catch (error) {
            console.error("Play/Pause failed:", error);
            await ev.action.showAlert();
        }
    }

    private async updateTitle(actionContext: WillAppearEvent<PlaybackActionSettings>["action"]) {
        try {
            const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
            const state = await getPlaybackState(globalSettings.clientId);
            const icon = state?.is_playing ? "⏸" : "▶";
            await actionContext.setTitle(icon);
        } catch {
            await actionContext.setTitle("▶⏸");
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Next Track
// ─────────────────────────────────────────────────────────────────────────────

@action({ UUID: "com.spotify-macos.control.next-track" })
export class NextTrackAction extends SingletonAction<PlaybackActionSettings> {
    override async onWillAppear(ev: WillAppearEvent<PlaybackActionSettings>) {
        await ev.action.setTitle("⏭");
    }

    override async onKeyDown(ev: KeyDownEvent<PlaybackActionSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;

        try {
            await nextTrack(globalSettings.clientId, settings.deviceId);
            await ev.action.showOk();
        } catch (error) {
            console.error("Next track failed:", error);
            await ev.action.showAlert();
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Previous Track
// ─────────────────────────────────────────────────────────────────────────────

@action({ UUID: "com.spotify-macos.control.previous-track" })
export class PreviousTrackAction extends SingletonAction<PlaybackActionSettings> {
    override async onWillAppear(ev: WillAppearEvent<PlaybackActionSettings>) {
        await ev.action.setTitle("⏮");
    }

    override async onKeyDown(ev: KeyDownEvent<PlaybackActionSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;

        try {
            await previousTrack(globalSettings.clientId, settings.deviceId);
            await ev.action.showOk();
        } catch (error) {
            console.error("Previous track failed:", error);
            await ev.action.showAlert();
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Volume Up
// ─────────────────────────────────────────────────────────────────────────────

@action({ UUID: "com.spotify-macos.control.volume-up" })
export class VolumeUpAction extends SingletonAction<VolumeActionSettings> {
    override async onWillAppear(ev: WillAppearEvent<VolumeActionSettings>) {
        await ev.action.setTitle("🔊+");
    }

    override async onKeyDown(ev: KeyDownEvent<VolumeActionSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;
        const step = settings.step ?? 10;

        try {
            await changeVolume(globalSettings.clientId, step, settings.deviceId);
            await ev.action.showOk();
        } catch (error) {
            console.error("Volume up failed:", error);
            await ev.action.showAlert();
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Volume Down
// ─────────────────────────────────────────────────────────────────────────────

@action({ UUID: "com.spotify-macos.control.volume-down" })
export class VolumeDownAction extends SingletonAction<VolumeActionSettings> {
    override async onWillAppear(ev: WillAppearEvent<VolumeActionSettings>) {
        await ev.action.setTitle("🔉−");
    }

    override async onKeyDown(ev: KeyDownEvent<VolumeActionSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;
        const step = settings.step ?? 10;

        try {
            await changeVolume(globalSettings.clientId, -step, settings.deviceId);
            await ev.action.showOk();
        } catch (error) {
            console.error("Volume down failed:", error);
            await ev.action.showAlert();
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Volume Preset (e.g., Narration level, Combat level)
// ─────────────────────────────────────────────────────────────────────────────

@action({ UUID: "com.spotify-macos.control.volume-preset" })
export class VolumePresetAction extends SingletonAction<VolumePresetSettings> {
    override async onWillAppear(ev: WillAppearEvent<VolumePresetSettings>) {
        const settings = ev.payload.settings;
        const label = settings.presetName || `${settings.volumePercent ?? 50}%`;
        await ev.action.setTitle(label);
    }

    override async onKeyDown(ev: KeyDownEvent<VolumePresetSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;
        const targetVolume = settings.volumePercent ?? 50;

        try {
            await setVolume(globalSettings.clientId, targetVolume, settings.deviceId);
            await ev.action.showOk();
        } catch (error) {
            console.error("Volume preset failed:", error);
            await ev.action.showAlert();
        }
    }
}

