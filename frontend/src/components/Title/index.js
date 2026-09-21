/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import Typography from "@material-ui/core/Typography";
import { useTheme } from "@material-ui/core/styles";

export default function Title(props) {
	const theme = useTheme();
	const isDark = theme.palette.type === "dark";

	return (
		<Typography
			variant="h5"
			color="inherit"
			gutterBottom
			style={{
				color: isDark ? theme.palette.common.white : theme.palette.primary.main,
			}}
		>
			{props.children}
		</Typography>
	);
}
