import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { exec } from "child_process";

@action({ UUID: "com.spotify-macos.control.play-playlist" })
export class PlayPlaylistAction extends SingletonAction {
    override async onKeyDown(ev: KeyDownEvent<PlaylistSettings>) {
        const playlistUri = ev.payload.settings.playlistUri;

        if (!playlistUri) {
            await ev.action.setTitle("No URI!");
            return;
        }

        const script = `
            tell application "Spotify"
                activate
                open location "${playlistUri}"
                delay 2
                play
            end tell
        `;

        exec(`osascript -e '${script}'`, (error) => {
            if (error) {
                console.error("Failed to play playlist:", error);
            }
        });
    }

    override async onWillAppear(ev: WillAppearEvent<PlaylistSettings>) {
        const title = ev.payload.settings.playlistName || "Playlist";
        await ev.action.setTitle(title);
    }
}

type PlaylistSettings = {
    playlistUri: string;
    playlistName: string;
};

