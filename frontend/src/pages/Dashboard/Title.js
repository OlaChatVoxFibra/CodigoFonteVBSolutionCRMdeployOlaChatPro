/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import Typography from "@material-ui/core/Typography";

const Title = props => {
	return (
		<Typography component="h2" variant="h6" color="primary" gutterBottom>
			{props.children}
		</Typography>
	);
};

export default Title;
