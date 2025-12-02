import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { PlayPlaylistAction } from "./actions/play-playlist";

streamDeck.logger.setLevel(LogLevel.DEBUG);

streamDeck.actions.registerAction(new PlayPlaylistAction());

streamDeck.connect();
