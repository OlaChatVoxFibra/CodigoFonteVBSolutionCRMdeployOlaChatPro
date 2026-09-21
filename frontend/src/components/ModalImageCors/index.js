/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import ModalImage from "react-modal-image";
import api from "../../services/api";
import { getBackendUrl } from "../../config";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
	messageMedia: {
		objectFit: "cover",
		width: 250,
		height: "auto", // Redimensionar automaticamente a altura para manter a proporção
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
	}
}));

const ModalImageCors = ({ imageUrl, candidates: inputCandidates = [] }) => {
	const classes = useStyles();
	const [fetching, setFetching] = useState(true);
	const [blobUrl, setBlobUrl] = useState("");
	const backendUrl = getBackendUrl();
	const { user } = useContext(AuthContext) || {};
	const companyId = user?.companyId;

	const resolveUrl = (url) => {
		if (!url || typeof url !== "string") return "";
		const u = url.trim();
		// URLs já utilizáveis diretamente pelo navegador
		if (/^(data:|blob:|https?:\/\/)/i.test(u)) return u;
		// Caminho absoluto do backend
		if (u.startsWith("/")) return `${backendUrl}${u}`;
		// Nome de arquivo simples: priorizar pasta da empresa
		if (!u.includes("/") && companyId) return `${backendUrl}/public/company${companyId}/${u}`;
		// Nome de arquivo relativo em /public
		return `${backendUrl}/public/${u}`;
	};

	const buildCandidates = (url) => {
		const primary = resolveUrl(url);
		const list = [...(Array.isArray(inputCandidates) ? inputCandidates : []), primary];
		try {
			const noSlash = typeof url === "string" && !url.includes("/");
			const basename = typeof url === "string" ? url.split("/").pop() : "";
			if (noSlash && basename) {
				if (companyId) {
					list.push(`${backendUrl}/public/company${companyId}/${basename}`);
					list.push(`${backendUrl}/public/company${companyId}/media/${basename}`);
					list.push(`${backendUrl}/public/company${companyId}/message/${basename}`);
				}
				list.push(`${backendUrl}/public/${basename}`);
			}
		} catch { /* ignore */ }
		return [...new Set(list)];
	};

	useEffect(() => {
		const list = imageUrl ? buildCandidates(imageUrl) : (Array.isArray(inputCandidates) ? inputCandidates : []);
		// Se já é data/blob, usar diretamente
		if (list.length && /^(data:|blob:)/i.test(list[0])) {
			setBlobUrl(list[0]);
			setFetching(false);
			return;
		}
		const fetchSequential = async () => {
			for (let i = 0; i < list.length; i++) {
				const urlTry = list[i];
				try {
					// Para http(s) de terceiros, evitar buscar via API (CORS). Usar direto.
					if (/^https?:\/\//i.test(urlTry) && !urlTry.startsWith(backendUrl)) {
						setBlobUrl(urlTry);
						return;
					}
					const { data, headers } = await api.get(urlTry, { responseType: "blob" });
					const url = window.URL.createObjectURL(
						new Blob([data], { type: headers["content-type"] || "image/*" })
					);
					setBlobUrl(url);
					return;
				} catch (e) {
					// tenta próximo
				}
			}
			// Fallback final: usar primeira candidata diretamente
			setBlobUrl(list[0] || "");
		};
		if (list.length === 0) {
			setFetching(false);
			return;
		}
		fetchSequential().finally(() => setFetching(false));
	}, [imageUrl]);

	return (
		<ModalImage
			className={classes.messageMedia}
			smallSrcSet={fetching ? resolveUrl(imageUrl) : blobUrl}
			medium={fetching ? resolveUrl(imageUrl) : blobUrl}
			large={fetching ? resolveUrl(imageUrl) : blobUrl}
			alt="image"
			showRotate={true}
		/>
	);
};

export default ModalImageCors;
