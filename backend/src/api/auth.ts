import express, { Request, Response } from "express";
import https from "https";
import pick from "lodash.pick";
import passport from "passport";
import { Strategy as CustomStrategy } from "passport-custom";
import OAuth2Strategy from "passport-oauth2";
import { ApiLogins } from "../data/ApiLogins";
import { ApiPermissionAssignments } from "../data/ApiPermissionAssignments";
import { ApiUserInfo } from "../data/ApiUserInfo";
import { ApiUserInfoData } from "../data/entities/ApiUserInfo";
import { env } from "../env";
import { ok } from "./responses";

interface IPassportApiUser {
  apiKey: string;
  userId: string;
}

declare global {
  namespace Express {
    interface User extends IPassportApiUser {}
  }
}

const DISCORD_API_URL = "https://discord.com/api";

export function simpleDiscordAPIRequest(bearerToken, path, bot = false): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      `${DISCORD_API_URL}/${path}`,
      {
        headers: {
          Authorization: `${bot ? "Bot" : "Bearer"} ${bearerToken}`,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Discord API error ${res.statusCode}`));
          return;
        }

        let rawData = "";
        res.on("data", (data) => (rawData += data));
        res.on("end", () => {
          resolve(JSON.parse(rawData));
        });
      },
    );

    request.on("error", (err) => reject(err));
  });
}

export function initAuth(app: express.Express) {
  app.use(passport.initialize());

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user as IPassportApiUser));

  const apiLogins = new ApiLogins();
  const apiUserInfo = new ApiUserInfo();
  const apiPermissionAssignments = new ApiPermissionAssignments();

  // Initialize API tokens
  passport.use(
    "api-token",
    new CustomStrategy(async (req, cb) => {
      const apiKey = req.header("X-Api-Key") || req.body?.["X-Api-Key"];
      if (!apiKey) return cb("API key missing");

      const userId = await apiLogins.getUserIdByApiKey(apiKey);
      if (userId) {
        void apiLogins.refreshApiKeyExpiryTime(apiKey); // Refresh expiry time in the background
        return cb(null, { apiKey, userId });
      }

      cb("API key not found");
    }),
  );

  // Initialize OAuth2 for Discord login
  // When the user logs in through OAuth2, we create them a "login" (= api token) and update their user info in the DB
  passport.use(
    new OAuth2Strategy(
      {
        authorizationURL: "https://discord.com/api/oauth2/authorize",
        tokenURL: "https://discord.com/api/oauth2/token",
        clientID: env.CLIENT_ID,
        clientSecret: env.CLIENT_SECRET,
        callbackURL: `${env.API_URL}/auth/oauth-callback`,
        scope: ["identify"],
      },
      async (accessToken, refreshToken, profile, cb) => {
        const user = await simpleDiscordAPIRequest(accessToken, "users/@me");

        // Make sure the user is able to access at least 1 guild
        const permissions = await apiPermissionAssignments.getByUserId(user.id);
        if (permissions.length === 0) {
          cb(null, {});
          return;
        }

        // Generate API key
        const apiKey = await apiLogins.addLogin(user.id);
        const userData = pick(user, ["username", "discriminator", "avatar"]) as ApiUserInfoData;
        await apiUserInfo.update(user.id, userData);
        // TODO: Revoke access token, we don't need it anymore
        cb(null, { apiKey });
      },
    ),
  );

  app.get("/auth/login", passport.authenticate("oauth2"));
  app.get(
    "/auth/oauth-callback",
    passport.authenticate("oauth2", { failureRedirect: "/", session: false }),
    (req: Request, res: Response) => {
      if (req.user && req.user.apiKey) {
        res.redirect(`${env.DASHBOARD_URL}/login-callback/?apiKey=${req.user.apiKey}`);
      } else {
        res.redirect(`${env.DASHBOARD_URL}/login-callback/?error=noAccess`);
      }
    },
  );
  app.post("/auth/validate-key", async (req: Request, res: Response) => {
    const key = req.body.key;
    if (!key) {
      return res.status(400).json({ error: "No key supplied" });
    }

    const userId = await apiLogins.getUserIdByApiKey(key);
    if (!userId) {
      return res.json({ valid: false });
    }

    res.json({ valid: true, userId });
  });
  app.post("/auth/logout", ...apiTokenAuthHandlers(), async (req: Request, res: Response) => {
    await apiLogins.expireApiKey(req.user!.apiKey);
    return ok(res);
  });

  // API route to refresh the given API token's expiry time
  // The actual refreshing happens in the api-token passport strategy above, so we just return 200 OK here
  app.post("/auth/refresh", ...apiTokenAuthHandlers(), (req, res) => {
    return ok(res);
  });
}

export function apiTokenAuthHandlers() {
  return [
    passport.authenticate("api-token", { failWithError: true, session: false }),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (err, req: Request, res: Response, next) => {
      return res.status(401).json({ error: err.message });
    },
  ];
}
