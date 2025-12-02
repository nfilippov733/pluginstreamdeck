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

