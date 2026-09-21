/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/Auth/AuthContext";
import { getBackendUrl } from "../config";
import useSocketListener from "./useSocketListener";

function buildProfileUrl(user, backendUrl) {
  const companyId = user?.companyId;
  if (!companyId) return null;

  const savedProfileImage = localStorage.getItem("profileImage");
  const currentProfileImage = savedProfileImage || user?.profileImage;

  if (currentProfileImage) {
    return `${backendUrl}/public/company${companyId}/user/${currentProfileImage}`;
  }

  return `${backendUrl}/public/app/noimage.png`;
}

export default function useUserProfileImageUrl() {
  const { user, socket } = useContext(AuthContext);
  const backendUrl = getBackendUrl();
  const [profileUrl, setProfileUrl] = useState(() => buildProfileUrl(user, backendUrl));

  useEffect(() => {
    setProfileUrl(buildProfileUrl(user, backendUrl));
  }, [user?.companyId, user?.profileImage, backendUrl]);

  const handleUserUpdate = useCallback(
    (data) => {
      if (data.action === "update" && data.user.id === +user?.id && data.user.profileImage) {
        const nextUrl = `${backendUrl}/public/company${user?.companyId}/user/${data.user.profileImage}`;
        setProfileUrl(nextUrl);
        localStorage.setItem("profileImage", data.user.profileImage);
      }
    },
    [user?.companyId, user?.id, backendUrl]
  );

  useSocketListener(socket, user, "user", handleUserUpdate);

  return profileUrl;
}
