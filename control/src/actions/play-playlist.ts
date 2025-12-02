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
        if (settings.playlistImage) {
            await ev.action.setImage(settings.playlistImage);
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
