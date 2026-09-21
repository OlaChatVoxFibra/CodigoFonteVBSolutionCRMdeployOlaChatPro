/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { EMBEDDED_SIGNUP_FINISH_EVENTS } from "../config/metaEmbeddedSignup";

let sdkLoadPromise = null;

const loadFacebookSdk = (appId) => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SDK indisponível no servidor."));
  }

  if (!appId) {
    return Promise.reject(new Error("App ID Meta não informado."));
  }

  if (window.FB && window.__metaEmbeddedAppId === appId) {
    return Promise.resolve(window.FB);
  }

  if (sdkLoadPromise && window.__metaEmbeddedAppId === appId) {
    return sdkLoadPromise;
  }

  window.__metaEmbeddedAppId = appId;
  sdkLoadPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout ao carregar Facebook SDK."));
    }, 20000);

    window.fbAsyncInit = function fbAsyncInit() {
      clearTimeout(timeout);
      try {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: false,
          version: "v21.0"
        });
        resolve(window.FB);
      } catch (error) {
        reject(error);
      }
    };

    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      existing.remove();
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/pt_BR/sdk.js";
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Falha ao carregar Facebook SDK."));
    };
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
};

const parseEmbeddedSignupMessage = (raw) => {
  if (!raw) return null;
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data?.type !== "WA_EMBEDDED_SIGNUP") return null;
    return data;
  } catch {
    return null;
  }
};

export default function useMetaEmbeddedSignup() {
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef(null);

  useEffect(() => {
    const onMessage = (event) => {
      if (!event?.origin?.endsWith?.("facebook.com")) return;
      const payload = parseEmbeddedSignupMessage(event.data);
      if (!payload) return;

      if (payload.event === "CANCEL") {
        sessionRef.current = { cancelled: true };
        return;
      }

      if (EMBEDDED_SIGNUP_FINISH_EVENTS.has(payload.event)) {
        sessionRef.current = {
          ...(sessionRef.current || {}),
          wabaId: payload.data?.waba_id,
          phoneNumberId: payload.data?.phone_number_id,
          businessId: payload.data?.business_id,
          event: payload.event,
          cancelled: false
        };
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const launchEmbeddedSignup = useCallback(
    ({ appId, configId, coexistence = true } = {}) => {
      const cleanAppId = String(appId || "").trim();
      const cleanConfigId = String(configId || "").trim();

      if (!cleanAppId || !cleanConfigId) {
        return Promise.reject(
          new Error(
            "Informe o App ID e o Configuration ID do app Meta desta organização."
          )
        );
      }

      setLoading(true);
      sessionRef.current = { cancelled: false };

      return loadFacebookSdk(cleanAppId)
        .then(
          (FB) =>
            new Promise((resolve, reject) => {
              const extras = {
                setup: {},
                sessionInfoVersion: "3"
              };

              if (coexistence) {
                extras.featureType = "whatsapp_business_app_onboarding";
              }

              FB.login(
                (response) => {
                  const finish = async () => {
                    try {
                      if (sessionRef.current?.cancelled) {
                        throw new Error("Conexão cancelada no login Meta.");
                      }

                      if (
                        response?.status === "unknown" ||
                        !response?.authResponse
                      ) {
                        throw new Error(
                          "Login Meta cancelado ou não autorizado. Tente novamente."
                        );
                      }

                      const code = response.authResponse.code;
                      if (!code) {
                        throw new Error(
                          "Meta não retornou código de autorização."
                        );
                      }

                      const session = await new Promise((res, rej) => {
                        const started = Date.now();
                        const poll = () => {
                          const current = sessionRef.current || {};
                          if (current.wabaId && current.phoneNumberId) {
                            res(current);
                            return;
                          }
                          if (current.cancelled) {
                            rej(new Error("Conexão cancelada no login Meta."));
                            return;
                          }
                          if (Date.now() - started > 12000) {
                            rej(
                              new Error(
                                "Meta não retornou WABA/Phone ID. Escolha 'Conectar um app do WhatsApp Business' e conclua no celular."
                              )
                            );
                            return;
                          }
                          setTimeout(poll, 250);
                        };
                        poll();
                      });

                      resolve({
                        code,
                        wabaId: session.wabaId,
                        phoneNumberId: session.phoneNumberId,
                        businessId: session.businessId,
                        event: session.event,
                        coexistence
                      });
                    } catch (error) {
                      reject(error);
                    } finally {
                      setLoading(false);
                    }
                  };

                  finish();
                },
                {
                  config_id: cleanConfigId,
                  response_type: "code",
                  override_default_response_type: true,
                  extras
                }
              );
            })
        )
        .catch((error) => {
          setLoading(false);
          throw error;
        });
    },
    []
  );

  return { loading, launchEmbeddedSignup };
}
