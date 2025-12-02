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
                delay 1
                play track "${playlistUri}"
            end tell
        `;

        exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
            if (error) {
                console.error("Failed to play playlist (error):", error);
            }
            if (stderr) {
                console.error("Failed to play playlist (stderr):", stderr);
            }
            if (stdout) {
                console.log("Play playlist (stdout):", stdout);
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

