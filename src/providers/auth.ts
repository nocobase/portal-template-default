import type { AuthProvider } from "@refinedev/core";

import { nocobaseClient } from "@/lib/nocobase/client";
import {
  getNocoBaseErrorMessage,
  NocoBaseHttpError,
} from "@/lib/nocobase/error";

type NocoBaseUser = {
  id: number | string;
  nickname?: string;
  username?: string;
  email?: string;
  avatar?: string;
};

type NocoBaseSignInResponse = {
  token?: string;
  user?: NocoBaseUser;
};

type CurrentUserCache = {
  token: string;
  user: NocoBaseUser;
  expiresAt: number;
};

const CURRENT_USER_CACHE_MS = 30_000;
let currentUserCache: CurrentUserCache | undefined;
let currentUserRequest: Promise<NocoBaseUser> | undefined;

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (payload instanceof NocoBaseHttpError) return payload.message;
  return getNocoBaseErrorMessage(payload, fallback);
};

const clearCurrentUserCache = () => {
  currentUserCache = undefined;
  currentUserRequest = undefined;
};

const getCurrentUser = async (): Promise<NocoBaseUser> => {
  const token = nocobaseClient.getToken();
  if (!token) throw new Error("No NocoBase token");

  const cached = currentUserCache;
  if (cached && cached.token === token && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  if (currentUserRequest) return currentUserRequest;

  currentUserRequest = (async () => {
    const user = await nocobaseClient.action<NocoBaseUser>("auth", "check", {
      token,
      includeAuthenticator: true,
    });
    currentUserCache = {
      token: nocobaseClient.getToken() ?? token,
      user,
      expiresAt: Date.now() + CURRENT_USER_CACHE_MS,
    };
    return user;
  })();

  try {
    return await currentUserRequest;
  } finally {
    currentUserRequest = undefined;
  }
};

export const authProvider: AuthProvider = {
  login: async ({ username, email, password, providerName }) => {
    if (providerName) {
      return {
        success: false,
        error: {
          name: "UnsupportedAuthenticator",
          message:
            "Configure this provider as a NocoBase authenticator before using social sign-in.",
        },
      };
    }

    const account = username ?? email;
    if (!account || !password) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: "Please enter your account and password.",
        },
      };
    }

    try {
      const result = await nocobaseClient.action<NocoBaseSignInResponse>(
        "auth",
        "signIn",
        {
          method: "POST",
          includeAuthenticator: true,
          body: { account, password },
        }
      );
      if (!result.token) {
        return {
          success: false,
          error: {
            name: "LoginError",
            message: "NocoBase did not return an access token.",
          },
        };
      }

      nocobaseClient.setToken(result.token);
      clearCurrentUserCache();
      return { success: true, redirectTo: "/" };
    } catch (error) {
      return {
        success: false,
        error: {
          name:
            error instanceof NocoBaseHttpError ? "LoginError" : "NetworkError",
          message: getErrorMessage(
            error,
            "Unable to reach the NocoBase server. If this is a remote NocoBase from localhost, enable backend CORS for X-Authenticator or use the Vite proxy."
          ),
        },
      };
    }
  },

  logout: async () => {
    const token = nocobaseClient.getToken();
    try {
      if (token) {
        await nocobaseClient.action("auth", "signOut", {
          method: "POST",
          token,
          includeAuthenticator: true,
        });
      }
    } finally {
      nocobaseClient.setToken(null);
      clearCurrentUserCache();
    }

    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    try {
      await getCurrentUser();
      return { authenticated: true };
    } catch {
      nocobaseClient.setToken(null);
      clearCurrentUserCache();
      return { authenticated: false, redirectTo: "/login" };
    }
  },

  getPermissions: async () => null,

  getIdentity: async () => {
    try {
      const user = await getCurrentUser();
      const fullName =
        user.nickname ?? user.username ?? user.email ?? "NocoBase user";
      return {
        id: user.id,
        firstName: fullName,
        lastName: "",
        fullName,
        email: user.email ?? "",
        avatar: user.avatar,
      };
    } catch {
      return null;
    }
  },

  onError: async (error) => {
    const status =
      (error as { status?: number; statusCode?: number }).status ??
      (error as { status?: number; statusCode?: number }).statusCode;

    if (status === 401 || status === 403) {
      nocobaseClient.setToken(null);
      clearCurrentUserCache();
      return { logout: true, redirectTo: "/login" };
    }

    return { error };
  },
};
