import streamDeck, {
    action,
    DialDownEvent,
    DialRotateEvent,
    SingletonAction,
    WillAppearEvent,
} from "@elgato/streamdeck";
import {
    VolumeDialSettings,
    TrackDialSettings,
    SeekDialSettings,
} from "../spotify/types";
import {
    getPlaybackState,
    setVolume,
    changeVolume,
    togglePlayPause,
    nextTrack,
    previousTrack,
    seekToPosition,
} from "../spotify/api";

// ─────────────────────────────────────────────────────────────────────────────
// Volume Dial
// - Rotate: adjust volume by ticks * step
// - Press: toggle mute (save volume, set to 0; press again to restore)
// ─────────────────────────────────────────────────────────────────────────────

@action({ UUID: "com.spotify-macos.control.volume-dial" })
export class VolumeDialAction extends SingletonAction<VolumeDialSettings> {
    override async onWillAppear(ev: WillAppearEvent<VolumeDialSettings>) {
        await this.updateFeedback(ev.action);
    }

    override async onDialRotate(ev: DialRotateEvent<VolumeDialSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;
        const stepPerTick = settings.stepPerTick ?? 2;
        const ticks = ev.payload.ticks;

        try {
            await changeVolume(globalSettings.clientId, ticks * stepPerTick, settings.deviceId);
            await this.updateFeedback(ev.action);
        } catch (error) {
            console.error("Volume dial rotate failed:", error);
        }
    }

    override async onDialDown(ev: DialDownEvent<VolumeDialSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;

        try {
            const state = await getPlaybackState(globalSettings.clientId);
            const currentVolume = state?.device?.volume_percent ?? 50;

            if (currentVolume > 0) {
                // Mute: save current volume and set to 0
                await ev.action.setSettings({ ...settings, mutedVolume: currentVolume });
                await setVolume(globalSettings.clientId, 0, settings.deviceId);
            } else {
                // Unmute: restore saved volume
                const restoreVolume = settings.mutedVolume ?? 50;
                await setVolume(globalSettings.clientId, restoreVolume, settings.deviceId);
                await ev.action.setSettings({ ...settings, mutedVolume: undefined });
            }

            await this.updateFeedback(ev.action);
        } catch (error) {
            console.error("Volume dial press failed:", error);
        }
    }

    private async updateFeedback(actionContext: WillAppearEvent<VolumeDialSettings>["action"]) {
        try {
            const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
            const state = await getPlaybackState(globalSettings.clientId);
            const volume = state?.device?.volume_percent ?? 0;
            const icon = volume === 0 ? "🔇" : "🔊";
            await actionContext.setTitle(`${icon} ${volume}%`);
        } catch {
            await actionContext.setTitle("🔊 --");
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Track Dial
// - Rotate clockwise: next track
// - Rotate counter-clockwise: previous track
// - Press: toggle play/pause
// ─────────────────────────────────────────────────────────────────────────────

@action({ UUID: "com.spotify-macos.control.track-dial" })
export class TrackDialAction extends SingletonAction<TrackDialSettings> {
    private tickAccumulator = 0;

    override async onWillAppear(ev: WillAppearEvent<TrackDialSettings>) {
        await this.updateFeedback(ev.action);
    }

    override async onDialRotate(ev: DialRotateEvent<TrackDialSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;
        const ticksToSkip = settings.ticksToSkip ?? 1;
        const ticks = ev.payload.ticks;

        this.tickAccumulator += ticks;

        try {
            // Skip track when accumulated ticks reach threshold
            while (this.tickAccumulator >= ticksToSkip) {
                await nextTrack(globalSettings.clientId, settings.deviceId);
                this.tickAccumulator -= ticksToSkip;
            }
            while (this.tickAccumulator <= -ticksToSkip) {
                await previousTrack(globalSettings.clientId, settings.deviceId);
                this.tickAccumulator += ticksToSkip;
            }

            // Small delay to let Spotify update, then refresh display
            setTimeout(() => this.updateFeedback(ev.action), 300);
        } catch (error) {
            console.error("Track dial rotate failed:", error);
        }
    }

    override async onDialDown(ev: DialDownEvent<TrackDialSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;

        try {
            await togglePlayPause(globalSettings.clientId, settings.deviceId);
            await this.updateFeedback(ev.action);
        } catch (error) {
            console.error("Track dial press failed:", error);
        }
    }

    private async updateFeedback(actionContext: WillAppearEvent<TrackDialSettings>["action"]) {
        try {
            const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
            const state = await getPlaybackState(globalSettings.clientId);
            
            if (state?.item) {
                const trackName = state.item.name;
                const icon = state.is_playing ? "▶" : "⏸";
                // Truncate long track names
                const displayName = trackName.length > 12 ? trackName.slice(0, 11) + "…" : trackName;
                await actionContext.setTitle(`${icon} ${displayName}`);
            } else {
                await actionContext.setTitle("🎵 --");
            }
        } catch {
            await actionContext.setTitle("🎵 --");
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seek Dial
// - Rotate: seek forward/backward in current track
// - Press: restart current track from beginning
// ─────────────────────────────────────────────────────────────────────────────

@action({ UUID: "com.spotify-macos.control.seek-dial" })
export class SeekDialAction extends SingletonAction<SeekDialSettings> {
    override async onWillAppear(ev: WillAppearEvent<SeekDialSettings>) {
        await ev.action.setTitle("⏩ Seek");
    }

    override async onDialRotate(ev: DialRotateEvent<SeekDialSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;
        const seekMsPerTick = settings.seekMsPerTick ?? 5000; // default 5 seconds
        const ticks = ev.payload.ticks;

        try {
            const state = await getPlaybackState(globalSettings.clientId);
            if (!state?.item) return;

            const currentPosition = state.progress_ms ?? 0;
            const duration = state.item.duration_ms;
            const newPosition = Math.max(0, Math.min(duration, currentPosition + ticks * seekMsPerTick));

            await seekToPosition(globalSettings.clientId, newPosition, settings.deviceId);
        } catch (error) {
            console.error("Seek dial rotate failed:", error);
        }
    }

    override async onDialDown(ev: DialDownEvent<SeekDialSettings>) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        const settings = ev.payload.settings;

        try {
            // Restart track from beginning
            await seekToPosition(globalSettings.clientId, 0, settings.deviceId);
        } catch (error) {
            console.error("Seek dial press failed:", error);
        }
    }
}

