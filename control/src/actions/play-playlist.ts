import streamDeck, {
    action,
    DidReceiveSettingsEvent,
    KeyDownEvent,
    SendToPluginEvent,
    SingletonAction,
    WillAppearEvent,
} from "@elgato/streamdeck";
import { PlaylistSettings } from "../spotify/types";
import { playPlaylist, getUserPlaylists, getDevices } from "../spotify/api";
import { startAuthFlow, isAuthenticated, loadTokensFromSettings } from "../spotify/auth";

@action({ UUID: "com.spotify-macos.control.play-playlist" })
export class PlayPlaylistAction extends SingletonAction<PlaylistSettings> {
    
    override async onWillAppear(ev: WillAppearEvent<PlaylistSettings>) {
        await this.updateKeyAppearance(ev.action, ev.payload.settings ?? {});
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PlaylistSettings>) {
        await this.updateKeyAppearance(ev.action, ev.payload.settings ?? {});
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
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ clientId: string; tokens?: any }>();

        switch (event) {
            case "getAuthStatus":
                // Check if we have valid tokens stored
                await loadTokensFromSettings();
                const authenticated = isAuthenticated();
                await streamDeck.ui.current?.sendToPropertyInspector({
                    event: "authStatus",
                    authenticated,
                    clientId: globalSettings.clientId || "",
                });
                break;

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
                // If already authenticated, just send success without opening browser
                await loadTokensFromSettings();
                if (isAuthenticated()) {
                    await streamDeck.ui.current?.sendToPropertyInspector({
                        event: "authenticated",
                    });
                    break;
                }
                
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

    private async updateKeyAppearance(
        actionContext: WillAppearEvent<PlaylistSettings>["action"],
        settings: PlaylistSettings,
    ): Promise<void> {
        try {
            if (settings.playlistName) {
                await actionContext.setTitle(settings.playlistName);
            }

            const image = settings.playlistImage;
            if (!image) {
                return;
            }

            if (image.startsWith("data:image")) {
                await actionContext.setImage(image);
                return;
            }

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

                await actionContext.setImage(dataUrl);

                if (settings.playlistImage !== dataUrl) {
                    await actionContext.setSettings({
                        ...settings,
                        playlistImage: dataUrl,
                    });
                }
                return;
            }

            await actionContext.setImage(image);
        } catch (error) {
            console.error("Error setting playlist image:", error);
        }
    }
}
