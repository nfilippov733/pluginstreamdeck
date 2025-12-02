import streamDeck, {
    action,
    KeyDownEvent,
    SingletonAction,
    WillAppearEvent,
    SendToPluginEvent,
} from "@elgato/streamdeck";
import { PlaylistSettings } from "../spotify/types";
import { playPlaylist, getUserPlaylists, getDevices } from "../spotify/api";
import { startAuthFlow, isAuthenticated, loadTokensFromSettings } from "../spotify/auth";

@action({ UUID: "com.spotify-macos.control.play-playlist" })
export class PlayPlaylistAction extends SingletonAction<PlaylistSettings> {
    
    override async onWillAppear(ev: WillAppearEvent<PlaylistSettings>) {
        const settings = ev.payload.settings;

        // Set button title
        if (settings.playlistName) {
            await ev.action.setTitle(settings.playlistName);
        }

        // Set playlist image if available
        const image = settings.playlistImage;
        if (!image) {
            return;
        }

        try {
            // If it's already a data URL, use it directly
            if (image.startsWith("data:image")) {
                await ev.action.setImage(image);
                return;
            }

            // If it's an HTTP(S) URL from Spotify, fetch and convert to base64 data URL
            if (image.startsWith("http://") || image.startsWith("https://")) {
                const response = await fetch(image);
                if (!response.ok) {
                    console.error("Failed to fetch playlist image:", response.status, response.statusText);
                    return;
                }

                const arrayBuffer = await response.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString("base64");
                const contentType = response.headers.get("content-type") || "image/jpeg";
                const dataUrl = `data:${contentType};base64,${base64}`;

                await ev.action.setImage(dataUrl);
                return;
            }

            // Fallback: attempt to set whatever string we have
            await ev.action.setImage(image);
        } catch (error) {
            console.error("Error setting playlist image:", error);
        }
    }

    override async onKeyDown(ev: KeyDownEvent<PlaylistSettings>) {
        const settings = ev.payload.settings;
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();
        
        if (!settings.playlistUri) {
            await ev.action.showAlert();
            return;
        }

        try {
            await playPlaylist(
                globalSettings.clientId,
                settings.playlistUri,
                settings.deviceId || undefined
            );
            await ev.action.showOk();
        } catch (error) {
            console.error("Play failed:", error);
            await ev.action.showAlert();
        }
    }

    // Handle messages from Property Inspector
    override async onSendToPlugin(ev: SendToPluginEvent<any, PlaylistSettings>) {
        const { event, payload } = ev.payload as any;
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string }>();

        switch (event) {
            case "getPlaylists":
                try {
                    const playlists = await getUserPlaylists(globalSettings.clientId);
                    await streamDeck.ui.current?.sendToPropertyInspector({
                        event: "playlists",
                        playlists,
                    });
                } catch (error) {
                    await streamDeck.ui.current?.sendToPropertyInspector({
                        event: "error",
                        message: "Failed to fetch playlists",
                    });
                }
                break;

            case "getDevices":
                try {
                    const devices = await getDevices(globalSettings.clientId);
                    await streamDeck.ui.current?.sendToPropertyInspector({
                        event: "devices",
                        devices,
                    });
                } catch (error) {
                    await streamDeck.ui.current?.sendToPropertyInspector({
                        event: "error",
                        message: "Failed to fetch devices",
                    });
                }
                break;

            case "authenticate":
                try {
                    await startAuthFlow(payload.clientId);
                    await streamDeck.ui.current?.sendToPropertyInspector({
                        event: "authenticated",
                    });
                } catch (error) {
                    await streamDeck.ui.current?.sendToPropertyInspector({
                        event: "error",
                        message: "Authentication failed",
                    });
                }
                break;
        }
    }
}
