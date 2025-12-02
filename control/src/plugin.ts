import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { PlayPlaylistAction } from "./actions/play-playlist";
import { loadTokensFromSettings } from "./spotify/auth";

streamDeck.logger.setLevel(LogLevel.DEBUG);

// Load saved tokens on startup
loadTokensFromSettings().catch(console.error);

streamDeck.actions.registerAction(new PlayPlaylistAction());

streamDeck.connect();
