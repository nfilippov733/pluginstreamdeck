import { getAccessToken } from "./auth";
import { SpotifyPlaylist, SpotifyDevice } from "./types";

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

