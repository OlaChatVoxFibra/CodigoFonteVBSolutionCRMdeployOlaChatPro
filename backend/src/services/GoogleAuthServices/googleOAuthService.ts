/**
 * VB Solution CRM - Visao Business
 * Cliente OAuth Google para login (sem Workspace).
 */
import { google } from "googleapis";
import {
  getGoogleOAuthClientConfig,
  resolveGoogleOAuthRedirectUri
} from "./googleOAuthConfig";

export function createGoogleOAuthClient() {
  const { clientId, clientSecret } = getGoogleOAuthClientConfig();
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    resolveGoogleOAuthRedirectUri()
  );
}