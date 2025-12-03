import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { PlayPlaylistAction } from "./actions/play-playlist";
import {
    PlayPauseAction,
    NextTrackAction,
    PreviousTrackAction,
    VolumeUpAction,
    VolumeDownAction,
    VolumePresetAction,
} from "./actions/playback";
import {
    VolumeDialAction,
    TrackDialAction,
    SeekDialAction,
} from "./actions/dials";
import { loadTokensFromSettings } from "./spotify/auth";

streamDeck.logger.setLevel(LogLevel.DEBUG);

// Load saved tokens on startup
loadTokensFromSettings().catch(console.error);

// Register button actions
streamDeck.actions.registerAction(new PlayPlaylistAction());
streamDeck.actions.registerAction(new PlayPauseAction());
streamDeck.actions.registerAction(new NextTrackAction());
streamDeck.actions.registerAction(new PreviousTrackAction());
streamDeck.actions.registerAction(new VolumeUpAction());
streamDeck.actions.registerAction(new VolumeDownAction());
streamDeck.actions.registerAction(new VolumePresetAction());

// Register dial actions (Stream Deck +)
streamDeck.actions.registerAction(new VolumeDialAction());
streamDeck.actions.registerAction(new TrackDialAction());
streamDeck.actions.registerAction(new SeekDialAction());

streamDeck.connect();
