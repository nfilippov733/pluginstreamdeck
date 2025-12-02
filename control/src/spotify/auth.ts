import http from "http";
import open from "open";
import { URL } from "url";
import streamDeck from "@elgato/streamdeck";
import { webcrypto } from "crypto";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const REDIRECT_URI = "http://127.0.0.1:3000/callback";
const SCOPES = [
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing"
].join(" ");

let tokens: { access_token: string; refresh_token: string; expires_at: number } | null = null;

// Generate random string for PKCE
function generateRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}

// SHA256 hash for PKCE
async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return webcrypto.subtle.digest("SHA-256", data);
}

// Base64 URL encode
function base64urlencode(buffer: ArrayBuffer): string {
    return Buffer.from(buffer)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export async function startAuthFlow(clientId: string): Promise<void> {
    const codeVerifier = generateRandomString(64);
    const codeChallenge = base64urlencode(await sha256(codeVerifier));
    const state = generateRandomString(16);

    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            const url = new URL(req.url!, `http://127.0.0.1:3000`);
            
            if (url.pathname === "/callback") {
                const code = url.searchParams.get("code");
                const returnedState = url.searchParams.get("state");

                if (returnedState !== state) {
                    res.writeHead(400);
                    res.end("State mismatch");
                    server.close();
                    reject(new Error("State mismatch"));
                    return;
                }

                if (code) {
                    try {
                        await exchangeCodeForTokens(code, codeVerifier, clientId);
                        res.writeHead(200, { "Content-Type": "text/html" });
                        res.end("<html><body><h1>Success!</h1><p>You can close this window.</p></body></html>");
                        server.close();
                        resolve();
                    } catch (error) {
                        res.writeHead(500);
                        res.end("Token exchange failed");
                        server.close();
                        reject(error);
                    }
                }
            }
        });

        server.listen(3000, () => {
            const authUrl = new URL(SPOTIFY_AUTH_URL);
            authUrl.searchParams.set("client_id", clientId);
            authUrl.searchParams.set("response_type", "code");
            authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
            authUrl.searchParams.set("scope", SCOPES);
            authUrl.searchParams.set("state", state);
            authUrl.searchParams.set("code_challenge_method", "S256");
            authUrl.searchParams.set("code_challenge", codeChallenge);

            open(authUrl.toString());
        });

        // Timeout after 2 minutes
        setTimeout(() => {
            server.close();
            reject(new Error("Auth timeout"));
        }, 120000);
    });
}

async function exchangeCodeForTokens(code: string, codeVerifier: string, clientId: string): Promise<void> {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: REDIRECT_URI,
            client_id: clientId,
            code_verifier: codeVerifier,
        }),
    });

    if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
    };

    // Save tokens to global settings
    await streamDeck.settings.setGlobalSettings({ tokens, clientId });
}

export async function refreshAccessToken(clientId: string): Promise<void> {
    if (!tokens?.refresh_token) {
        throw new Error("No refresh token available");
    }

    const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: tokens.refresh_token,
            client_id: clientId,
        }),
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || tokens.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
    };

    await streamDeck.settings.setGlobalSettings({ tokens, clientId });
}

export async function getAccessToken(clientId: string): Promise<string> {
    if (!tokens) {
        const globalSettings = await streamDeck.settings.getGlobalSettings<{ tokens: typeof tokens }>();
        tokens = globalSettings.tokens || null;
    }

    if (!tokens) {
        throw new Error("Not authenticated");
    }

    // Refresh if expired or expiring soon (5 min buffer)
    if (Date.now() > tokens.expires_at - 300000) {
        await refreshAccessToken(clientId);
    }

    return tokens!.access_token;
}

export function isAuthenticated(): boolean {
    return tokens !== null;
}

export async function loadTokensFromSettings(): Promise<void> {
    const globalSettings = await streamDeck.settings.getGlobalSettings<{ tokens: typeof tokens }>();
    tokens = globalSettings.tokens || null;
}

