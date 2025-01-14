import type { ActionType, AuthData, ServerInfo } from "../types";

import { notifyError } from "./notifications";
import {
  SESSION_BUSY,
  SESSION_SETUP,
  SESSION_SETUP_COMPLETE,
  SESSION_STORE_REDIRECT_URL,
  SESSION_SERVER_CHANGE,
  SESSION_GET_SERVERINFO,
  SESSION_SERVERINFO_SUCCESS,
  SESSION_PERMISSIONS_SUCCESS,
  SESSION_BUCKETS_REQUEST,
  SESSION_BUCKETS_SUCCESS,
  SESSION_AUTHENTICATED,
  SESSION_AUTHENTICATION_FAILED,
  SESSION_COPY_AUTHENTICATION_HEADER,
  SESSION_LOGOUT,
} from "../constants";

type NavigationResult = ActionType<typeof notifyError> | { type: null };

export function sessionBusy(
  busy: boolean
): {
  type: "SESSION_BUSY";
  busy: boolean;
} {
  return { type: SESSION_BUSY, busy };
}

export function setupSession(
  auth: AuthData
): {
  type: "SESSION_SETUP";
  auth: AuthData;
} {
  return { type: SESSION_SETUP, auth };
}

export function setupComplete(
  auth: AuthData
): {
  type: "SESSION_SETUP_COMPLETE";
  auth: AuthData;
} {
  return { type: SESSION_SETUP_COMPLETE, auth };
}

export function storeRedirectURL(
  redirectURL: string | null | undefined
): {
  type: "SESSION_STORE_REDIRECT_URL";
  redirectURL: string | null | undefined;
} {
  return { type: SESSION_STORE_REDIRECT_URL, redirectURL };
}

export function serverChange(): {
  type: "SESSION_SERVER_CHANGE";
} {
  return { type: SESSION_SERVER_CHANGE };
}

export function getServerInfo(
  auth: AuthData
): {
  type: "SESSION_GET_SERVERINFO";
  auth: AuthData;
} {
  return { type: SESSION_GET_SERVERINFO, auth };
}

export function serverInfoSuccess(
  serverInfo: ServerInfo
): {
  type: "SESSION_SERVERINFO_SUCCESS";
  serverInfo: ServerInfo;
} {
  return { type: SESSION_SERVERINFO_SUCCESS, serverInfo };
}

export function permissionsListSuccess(
  permissions: Object[]
): {
  type: "SESSION_PERMISSIONS_SUCCESS";
  permissions: Object[];
} {
  return { type: SESSION_PERMISSIONS_SUCCESS, permissions };
}

export function listBuckets(): {
  type: "SESSION_BUCKETS_REQUEST";
} {
  return { type: SESSION_BUCKETS_REQUEST };
}

export function bucketsSuccess(
  buckets: Object[]
): {
  type: "SESSION_BUCKETS_SUCCESS";
  buckets: Object[];
} {
  return { type: SESSION_BUCKETS_SUCCESS, buckets };
}

export function setAuthenticated(): {
  type: "SESSION_AUTHENTICATED";
} {
  return { type: SESSION_AUTHENTICATED };
}

export function authenticationFailed(): {
  type: "SESSION_AUTHENTICATION_FAILED";
} {
  return { type: SESSION_AUTHENTICATION_FAILED };
}

export function copyAuthenticationHeader(): {
  type: "SESSION_COPY_AUTHENTICATION_HEADER";
} {
  return { type: SESSION_COPY_AUTHENTICATION_HEADER };
}

export function logout(): {
  type: "SESSION_LOGOUT";
} {
  return { type: SESSION_LOGOUT };
}

function navigateToFxA(server: string, redirect: string): NavigationResult {
  document.location.href = `${server}/fxa-oauth/login?redirect=${encodeURIComponent(
    redirect
  )}`;
  return { type: null };
}

function postToPortier(server: string, redirect: string): NavigationResult {
  // Alter the AuthForm to make it posting Portier auth information to the
  // dedicated Kinto server endpoint. This is definitely one of the ugliest
  // part of this project, but it works :)
  try {
    const portierUrl = `${server}/portier/login`.replace(
      "//portier",
      "/portier"
    );
    const form = document.querySelector("form.rjsf");
    if (!(form instanceof HTMLFormElement)) {
      return notifyError("Missing authentication form.");
    }
    form.setAttribute("method", "post");
    form.setAttribute("action", portierUrl);
    const emailInput = form.querySelector("#root_email");
    if (!emailInput) {
      return notifyError("Couldn't find email input widget in form.");
    }
    emailInput.setAttribute("name", "email");
    const hiddenRedirect = document.createElement("input");
    hiddenRedirect.setAttribute("type", "hidden");
    hiddenRedirect.setAttribute("name", "redirect");
    hiddenRedirect.setAttribute("value", redirect);
    form.appendChild(hiddenRedirect);
    form.submit();
    return { type: null };
  } catch (error) {
    return notifyError("Couldn't redirect to authentication endpoint.", error);
  }
}

export function navigateToOpenID(
  authFormData: any,
  provider: any
): NavigationResult {
  const { origin, pathname } = document.location;
  const { server } = authFormData;
  const strippedServer = server.replace(/\/$/, "");
  const { auth_path: authPath } = provider;
  const strippedAuthPath = authPath.replace(/^\//, "");
  const payload = btoa(JSON.stringify(authFormData));
  const redirect = encodeURIComponent(`${origin}${pathname}#/auth/${payload}/`);
  document.location.href = `${strippedServer}/${strippedAuthPath}?callback=${redirect}&scope=openid email`;
  return { type: null };
}

/**
 * Massive side effect: this will navigate away from the current page to perform
 * authentication to a third-party service, like FxA.
 */
export function navigateToExternalAuth(authFormData: any): NavigationResult {
  const { origin, pathname } = document.location;
  const { server, authType } = authFormData;
  try {
    const payload = btoa(JSON.stringify(authFormData));
    const redirect = `${origin}${pathname}#/auth/${payload}/`;
    if (authType === "fxa") {
      return navigateToFxA(server, redirect);
    } else if (authType === "portier") {
      return postToPortier(server, redirect);
    } else {
      return notifyError(`Unsupported auth navigation type "${authType}".`);
    }
  } catch (error) {
    return notifyError("Couldn't redirect to authentication endpoint.", error);
  }
}
