export interface SpotifyPlaylist {
    id: string;
    name: string;
    uri: string;
    images: { url: string; height: number; width: number }[];
    [key: string]: any;
}

export interface SpotifyDevice {
    id: string;
    name: string;
    type: string;
    is_active: boolean;
    [key: string]: any;
}

export interface SpotifyTokens {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

export interface PlaylistSettings {
    playlistUri?: string;
    playlistName?: string;
    playlistImage?: string;
    deviceId?: string;
    deviceName?: string;
    [key: string]: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Playback state types (GET /me/player)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaybackArtist {
    id: string;
    name: string;
    uri: string;
}

export interface PlaybackAlbum {
    id: string;
    name: string;
    uri: string;
    images: { url: string; height: number; width: number }[];
}

export interface PlaybackTrack {
    id: string;
    name: string;
    uri: string;
    duration_ms: number;
    artists: PlaybackArtist[];
    album: PlaybackAlbum;
}

export interface PlaybackDevice {
    id: string;
    name: string;
    type: string;
    is_active: boolean;
    volume_percent: number | null;
}

export interface PlaybackState {
    is_playing: boolean;
    progress_ms: number | null;
    device: PlaybackDevice;
    shuffle_state: boolean;
    repeat_state: "off" | "track" | "context";
    item: PlaybackTrack | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings for playback actions
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaybackActionSettings {
    deviceId?: string;
    deviceName?: string;
    [key: string]: any;
}

export interface VolumeActionSettings extends PlaybackActionSettings {
    step?: number; // default 10
}

export interface VolumePresetSettings extends PlaybackActionSettings {
    volumePercent?: number; // e.g. 25 for narration, 65 for combat
    presetName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings for dial actions
// ─────────────────────────────────────────────────────────────────────────────

export interface VolumeDialSettings extends PlaybackActionSettings {
    stepPerTick?: number; // volume change per dial tick, default 2
    mutedVolume?: number; // stored volume when muted (internal state)
}

export interface TrackDialSettings extends PlaybackActionSettings {
    ticksToSkip?: number; // how many ticks needed to trigger skip, default 1
}

export interface SeekDialSettings extends PlaybackActionSettings {
    seekMsPerTick?: number; // milliseconds to seek per tick, default 5000 (5s)
}

