import { getAccessToken } from "./auth";
import { SpotifyPlaylist, SpotifyDevice, PlaybackState } from "./types";

const API_BASE = "https://api.spotify.com/v1";

export async function getUserPlaylists(clientId: string): Promise<SpotifyPlaylist[]> {
    const token = await getAccessToken(clientId);
    const playlists: SpotifyPlaylist[] = [];
    let url: string | null = `${API_BASE}/me/playlists?limit=50`;

    while (url) {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch playlists: ${response.status}`);
        }

        const data = await response.json();
        playlists.push(...data.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            uri: item.uri,
            images: item.images || [],
        })));

        url = data.next;
    }

    return playlists;
}

export async function getDevices(clientId: string): Promise<SpotifyDevice[]> {
    const token = await getAccessToken(clientId);
    
    const response = await fetch(`${API_BASE}/me/player/devices`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.status}`);
    }

    const data = await response.json();
    return data.devices.map((device: any) => ({
        id: device.id,
        name: device.name,
        type: device.type,
        is_active: device.is_active,
    }));
}

export async function playPlaylist(
    clientId: string,
    playlistUri: string,
    deviceId?: string
): Promise<void> {
    const token = await getAccessToken(clientId);
    
    const url = deviceId 
        ? `${API_BASE}/me/player/play?device_id=${deviceId}`
        : `${API_BASE}/me/player/play`;

    const response = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            context_uri: playlistUri,
        }),
    });

    // 204 = success, 404 = no active device
    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to play: ${response.status}`);
    }
}

export async function getPlaylistImage(
    clientId: string,
    playlistId: string
): Promise<string | null> {
    const token = await getAccessToken(clientId);
    
    const response = await fetch(`${API_BASE}/playlists/${playlistId}/images`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        return null;
    }

    const images = await response.json();
    return images[0]?.url || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core playback controls
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current playback state from Spotify.
 * Returns null if nothing is playing or no active device.
 */
export async function getPlaybackState(clientId: string): Promise<PlaybackState | null> {
    const token = await getAccessToken(clientId);

    const response = await fetch(`${API_BASE}/me/player`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    // 204 = no active device / nothing playing
    if (response.status === 204) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Failed to get playback state: ${response.status}`);
    }

    const data = await response.json();
    return {
        is_playing: data.is_playing,
        progress_ms: data.progress_ms,
        device: {
            id: data.device?.id,
            name: data.device?.name,
            type: data.device?.type,
            is_active: data.device?.is_active,
            volume_percent: data.device?.volume_percent ?? null,
        },
        shuffle_state: data.shuffle_state,
        repeat_state: data.repeat_state,
        item: data.item
            ? {
                  id: data.item.id,
                  name: data.item.name,
                  uri: data.item.uri,
                  duration_ms: data.item.duration_ms,
                  artists: (data.item.artists || []).map((a: any) => ({
                      id: a.id,
                      name: a.name,
                      uri: a.uri,
                  })),
                  album: {
                      id: data.item.album?.id,
                      name: data.item.album?.name,
                      uri: data.item.album?.uri,
                      images: data.item.album?.images || [],
                  },
              }
            : null,
    };
}

/**
 * Start or resume playback on the active (or specified) device.
 */
export async function play(clientId: string, deviceId?: string): Promise<void> {
    const token = await getAccessToken(clientId);

    const url = deviceId
        ? `${API_BASE}/me/player/play?device_id=${deviceId}`
        : `${API_BASE}/me/player/play`;

    const response = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to play: ${response.status}`);
    }
}

/**
 * Pause playback on the active (or specified) device.
 */
export async function pause(clientId: string, deviceId?: string): Promise<void> {
    const token = await getAccessToken(clientId);

    const url = deviceId
        ? `${API_BASE}/me/player/pause?device_id=${deviceId}`
        : `${API_BASE}/me/player/pause`;

    const response = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to pause: ${response.status}`);
    }
}

/**
 * Toggle between play and pause based on current state.
 */
export async function togglePlayPause(clientId: string, deviceId?: string): Promise<void> {
    const state = await getPlaybackState(clientId);

    if (state?.is_playing) {
        await pause(clientId, deviceId);
    } else {
        await play(clientId, deviceId);
    }
}

/**
 * Skip to the next track.
 */
export async function nextTrack(clientId: string, deviceId?: string): Promise<void> {
    const token = await getAccessToken(clientId);

    const url = deviceId
        ? `${API_BASE}/me/player/next?device_id=${deviceId}`
        : `${API_BASE}/me/player/next`;

    const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to skip to next track: ${response.status}`);
    }
}

/**
 * Go to the previous track (or restart current track if near the beginning).
 */
export async function previousTrack(clientId: string, deviceId?: string): Promise<void> {
    const token = await getAccessToken(clientId);

    const url = deviceId
        ? `${API_BASE}/me/player/previous?device_id=${deviceId}`
        : `${API_BASE}/me/player/previous`;

    const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to go to previous track: ${response.status}`);
    }
}

/**
 * Set volume to an absolute percentage (0–100).
 */
export async function setVolume(
    clientId: string,
    volumePercent: number,
    deviceId?: string
): Promise<void> {
    const token = await getAccessToken(clientId);
    const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));

    const url = deviceId
        ? `${API_BASE}/me/player/volume?volume_percent=${clamped}&device_id=${deviceId}`
        : `${API_BASE}/me/player/volume?volume_percent=${clamped}`;

    const response = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to set volume: ${response.status}`);
    }
}

/**
 * Change volume by a relative delta (e.g., +10 or -10).
 * Clamps result to 0–100.
 */
export async function changeVolume(
    clientId: string,
    delta: number,
    deviceId?: string
): Promise<void> {
    const state = await getPlaybackState(clientId);
    const currentVolume = state?.device?.volume_percent ?? 50;
    const newVolume = currentVolume + delta;
    await setVolume(clientId, newVolume, deviceId);
}

/**
 * Seek to a specific position in the currently playing track.
 * @param positionMs Position in milliseconds to seek to.
 */
export async function seekToPosition(
    clientId: string,
    positionMs: number,
    deviceId?: string
): Promise<void> {
    const token = await getAccessToken(clientId);
    const clamped = Math.max(0, Math.round(positionMs));

    const url = deviceId
        ? `${API_BASE}/me/player/seek?position_ms=${clamped}&device_id=${deviceId}`
        : `${API_BASE}/me/player/seek?position_ms=${clamped}`;

    const response = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to seek: ${response.status}`);
    }
}

