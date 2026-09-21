/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useHistory } from "react-router-dom";
import { has, isArray } from "lodash";

import { toast } from "react-toastify";

import { i18n, applyAppLanguage } from "../../translate/i18n";
import api from "../../services/api";
import { openApi } from "../../services/api";
import toastError from "../../errors/toastError";
import { socketConnection, resolveSocketCompanyId } from "../../services/socket";
import moment from "moment";

const batchUpdates = ReactDOM.unstable_batchedUpdates || ((fn) => fn());

/** Uma única requisição de refresh por vez evita 401 em rajada quando há vários 403. */
let refreshSessionPromise = null;

function readStoredRefreshToken() {
  try {
    const raw = localStorage.getItem("refreshToken");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

function storeRefreshToken(token) {
  if (!token) return;
  try {
    localStorage.setItem("refreshToken", JSON.stringify(token));
  } catch {
    /* ignore */
  }
}

function clearAuthStorage() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  } catch {
    /* ignore */
  }
}

function isAuthExpiredForbidden(error) {
  const status = error?.response?.status;
  if (status !== 403) return false;
  const msg = String(
    error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      ""
  ).toLowerCase();
  return (
    msg.includes("invalid token") ||
    msg.includes("err_session_expired") ||
    msg.includes("jwt") ||
    msg.includes("assign a new one")
  );
}

function refreshSessionOnce(apiClient) {
  if (!refreshSessionPromise) {
    const refreshToken = readStoredRefreshToken();
    refreshSessionPromise = apiClient
      .post(
        "/auth/refresh_token",
        refreshToken ? { refreshToken } : {},
        refreshToken
          ? { headers: { "x-refresh-token": refreshToken } }
          : undefined
      )
      .then((res) => {
        refreshSessionPromise = null;
        if (res?.data?.refreshToken) {
          storeRefreshToken(res.data.refreshToken);
        }
        return res;
      })
      .catch((err) => {
        refreshSessionPromise = null;
        throw err;
      });
  }
  return refreshSessionPromise;
}

const useAuth = () => {
  const history = useHistory();
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ queues: [] });
  const [socket, setSocket] = useState({
    on: () => {},
    off: () => {},
    emit: () => {},
    disconnect: () => {}
  });
  
  const listenersRef = useRef(new Set());
  const setIsAuthRef = useRef(setIsAuth);
  setIsAuthRef.current = setIsAuth;
  const socketRef = useRef(socket);
  socketRef.current = socket;

  useEffect(() => {
    const reqId = api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const resId = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        // Só tenta refresh em 403 de token inválido/expirado — não em 403 de permissão/plano
        if (
          isAuthExpiredForbidden(error) &&
          originalRequest &&
          !originalRequest._retry &&
          !String(originalRequest.url || "").includes("/auth/refresh_token")
        ) {
          originalRequest._retry = true;
          try {
            const { data } = await refreshSessionOnce(api);
            if (data?.token) {
              localStorage.setItem("token", JSON.stringify(data.token));
              api.defaults.headers.Authorization = `Bearer ${data.token}`;
            }
            return api(originalRequest);
          } catch (refreshErr) {
            if (refreshErr?.response?.status === 401) {
              clearAuthStorage();
              api.defaults.headers.Authorization = undefined;
              setIsAuthRef.current(false);
            }
            return Promise.reject(refreshErr);
          }
        }
        if (error?.response?.status === 401) {
          const errCode = error?.response?.data?.error;
          const errMsg = String(
            error?.response?.data?.error ||
              error?.response?.data?.message ||
              ""
          );
          const isMetaTokenError =
            errCode === "ERR_META_TOKEN_INVALID" ||
            errMsg.includes("ERR_META_TOKEN_INVALID") ||
            errMsg.includes("Token Meta");
          const isAuthPath = String(originalRequest?.url || "").includes("/auth/");
          // Só derruba sessão em expiração explícita (evita logout por 401 de outras rotas)
          if (
            !isMetaTokenError &&
            (errCode === "ERR_SESSION_EXPIRED" ||
              (isAuthPath && errCode === "ERR_SESSION_EXPIRED"))
          ) {
            clearAuthStorage();
            api.defaults.headers.Authorization = undefined;
            setIsAuthRef.current(false);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(reqId);
      api.interceptors.response.eject(resId);
    };
  }, []);

  // Effect para inicialização do token
  useEffect(() => {
    const token = localStorage.getItem("token");
    let cancelled = false;

    const finish = (auth, nextUser) => {
      if (cancelled) return;
      batchUpdates(() => {
        if (auth && nextUser) {
          setIsAuth(true);
          setUser({
            ...nextUser,
            queues: Array.isArray(nextUser?.queues) ? nextUser.queues : [],
          });
        } else {
          setIsAuth(false);
        }
        setLoading(false);
      });
    };

    // Hard stop: só encerra o loading — NÃO derruba sessão se ainda há token
    const hardStop = setTimeout(() => {
      if (cancelled) return;
      batchUpdates(() => {
        setLoading((prev) => {
          if (!prev) return prev;
          return false;
        });
      });
    }, 20000);

    (async () => {
      // Sem token: não chama refresh (evita loading eterno)
      if (!token) {
        finish(false);
        return;
      }

      const withTimeout = (promise, ms) =>
        Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AUTH_INIT_TIMEOUT")), ms)
          ),
        ]);

      try {
        const { data } = await withTimeout(refreshSessionOnce(api), 8000);
        if (data?.token) {
          api.defaults.headers.Authorization = `Bearer ${data.token}`;
          localStorage.setItem("token", JSON.stringify(data.token));
        }
        if (data?.refreshToken) {
          storeRefreshToken(data.refreshToken);
        }
        const u = data?.user || data;
        if (u?.id) {
          finish(true, u);
          return;
        }
        finish(false);
      } catch (err) {
        try {
          let raw = token;
          try {
            raw = JSON.parse(token);
          } catch {
            /* token já em texto puro */
          }
          api.defaults.headers.Authorization = `Bearer ${raw}`;
          const { data } = await withTimeout(api.get("/auth/me"), 6000);
          const u = data?.user || data;
          if (u?.id) {
            finish(true, u);
            return;
          }
        } catch {
          /* logout */
        }
        clearAuthStorage();
        api.defaults.headers.Authorization = undefined;
        finish(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(hardStop);
    };
  }, []);

  // Effect para configuração do socket
  useEffect(() => {
    if (Object.keys(user).length && user.id > 0) {
      const socketCompanyId = resolveSocketCompanyId({
        user: { companyId: user.companyId, id: user.id }
      });
      console.log("Configurando socket para user", user.id, "company", socketCompanyId);
      
      // Limpar listeners anteriores
      if (socket) {
        listenersRef.current.forEach(eventName => {
          if (socket.off) {
            socket.off(eventName);
          }
        });
        listenersRef.current.clear();
      }

      if (socketCompanyId == null) {
        return;
      }

      // Criar nova conexão socket
      const socketInstance = socketConnection({ user: {
        companyId: user.companyId,
        id: user.id }
      });
      
      if (socketInstance) {
        setSocket(socketInstance);

        // Aguardar um pouco para garantir que o socket está configurado
        setTimeout(() => {
          const eventName = `company-${socketCompanyId}-user`;
          
          const handleUserUpdate = (data) => {
            if (data.action === "update" && data.user.id === user.id) {
              const u = data.user;
              setUser({ ...u, queues: Array.isArray(u?.queues) ? u.queues : [] });
            }
          };

          // Verificar se o socket tem o método 'on'
          if (socketInstance && typeof socketInstance.on === 'function') {
            socketInstance.on(eventName, handleUserUpdate);
            listenersRef.current.add(eventName);
            console.log(`Listener adicionado para: ${eventName}`);
          } else {
            console.error("Socket instance não tem método 'on'", socketInstance);
          }
        }, 100);
      }
    }

    // Cleanup function
    return () => {
      if (socket && listenersRef.current.size > 0) {
        console.log("Limpando listeners do socket para user", user.id);
        listenersRef.current.forEach(eventName => {
          if (socket.off) {
            socket.off(eventName);
          }
        });
        listenersRef.current.clear();
      }
    };
  }, [user.id, user.companyId]); // Dependências específicas

  // Effect para buscar dados do usuário atual (skip se init já carregou)
  const userLoadedRef = useRef(false);
  useEffect(() => {
    if (!isAuth) {
      userLoadedRef.current = false;
      return;
    }
    if (userLoadedRef.current) return;
    userLoadedRef.current = true;
  }, [isAuth]);

  const applyLoginSession = useCallback(async (data) => {
    const {
      user: { company },
    } = data;

    if (
      has(company, "companieSettings") &&
      isArray(company.companieSettings) &&
      isArray(company.companieSettings[0])
    ) {
      const setting = company.companieSettings[0].find(
        (s) => s.key === "campaignsEnabled"
      );
      if (setting && setting.value === "true") {
        localStorage.setItem("cshow", null);
      }
    }

    if (
      has(company, "companieSettings") &&
      isArray(company.companieSettings) &&
      isArray(company.companieSettings[0])
    ) {
      const setting = company.companieSettings[0].find(
        (s) => s.key === "sendSignMessage"
      );

      if (setting && (setting.value === "enabled" || setting.value === "enable")) {
        localStorage.setItem("sendSignMessage", setting.value === "enable");
      }
    }

    if (data.user.profileImage != null) {
      localStorage.setItem("profileImage", data.user.profileImage);
    } else {
      localStorage.removeItem("profileImage");
    }

    const userLanguage = data?.user?.language || localStorage.getItem("language") || "pt";
    const momentLocale = String(userLanguage).toLowerCase().startsWith("en")
      ? "en"
      : String(userLanguage).toLowerCase().startsWith("es")
        ? "es"
        : "pt-br";
    moment.locale(momentLocale);
    let dueDate;
    if (data.user.company.id === 1) {
      dueDate = "2999-12-31T00:00:00.000Z";
    } else {
      const rawDue = data?.user?.company?.dueDate;
      if (!rawDue || !moment(rawDue).isValid()) {
        dueDate = "2999-12-31T00:00:00.000Z";
      } else {
        dueDate = rawDue;
      }
    }

    const vencimento = moment(dueDate).format("DD/MM/yyyy");

    const hojeInicio = moment().startOf("day");
    const vencimentoInicio = moment(dueDate).startOf("day");

    const diff = vencimentoInicio.diff(hojeInicio, "days");
    const before = hojeInicio.isSameOrBefore(vencimentoInicio, "day");
    const dias = diff;

    if (before === true) {
      localStorage.setItem("token", JSON.stringify(data.token));
      if (data.refreshToken) storeRefreshToken(data.refreshToken);
      localStorage.setItem("companyDueDate", vencimento);
      api.defaults.headers.Authorization = `Bearer ${data.token}`;
      const u = data.user || data;
      batchUpdates(() => {
        setUser({ ...u, queues: Array.isArray(u?.queues) ? u.queues : [] });
        setIsAuth(true);
        setLoading(false);
      });
      if (u?.language) {
        applyAppLanguage(u.language);
      }
      toast.success(i18n.t("auth.toasts.success"));

      if (Math.round(dias) >= 0 && Math.round(dias) < 7) {
        toast.warn(
          `Sua assinatura vence em ${Math.round(dias)} ${
            Math.round(dias) === 1 ? "dia" : "dias"
          } `
        );
      }

      history.push("/tickets");
    } else {
      api.defaults.headers.Authorization = `Bearer ${data.token}`;
      if (data.refreshToken) storeRefreshToken(data.refreshToken);
      batchUpdates(() => {
        setIsAuth(true);
        setLoading(false);
      });
      toastError(`Opss! Sua assinatura venceu ${vencimento}.
Entre em contato com o Suporte para mais informações! `);
      history.push("/tickets");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const handleLogin = useCallback(async (userData) => {
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", userData);
      await applyLoginSession(data);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyLoginSession]);

  const handleGoogleLoginComplete = useCallback(async (exchange) => {
    setLoading(true);

    try {
      const { data } = await openApi.post(
        "/auth/google/complete",
        { exchange },
        { withCredentials: true }
      );
      await applyLoginSession(data);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyLoginSession]);

  const handleLogout = useCallback(async () => {
    setLoading(true);

    try {
      const currentSocket = socketRef.current;
      if (currentSocket) {
        listenersRef.current.forEach(eventName => {
          if (currentSocket.off) {
            currentSocket.off(eventName);
          }
        });
        listenersRef.current.clear();
        
        if (typeof currentSocket.disconnect === 'function') {
          currentSocket.disconnect();
        }
      }

      await api.delete("/auth/logout");
      clearAuthStorage();
      localStorage.removeItem("cshow");
      api.defaults.headers.Authorization = undefined;
      batchUpdates(() => {
        setIsAuth(false);
        setUser({ queues: [] });
        setSocket({
          on: () => {},
          off: () => {},
          emit: () => {},
          disconnect: () => {}
        });
        setLoading(false);
      });
      history.push("/login");
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const getCurrentUserInfo = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      console.log(data);
      return data;
    } catch (_) {
      return null;
    }
  }, []);

  return {
    isAuth,
    user,
    loading,
    handleLogin,
    handleGoogleLoginComplete,
    handleLogout,
    getCurrentUserInfo,
    socket,
  };
};

export default useAuth;
