/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import withWidth, { isWidthUp } from '@material-ui/core/withWidth';

import Tickets from "../TicketsCustom"
import TicketAdvanced from "../TicketsAdvanced";

function TicketResponsiveContainer (props) {
     if (isWidthUp('md', props.width)) {
        return <Tickets />;    
    }
    return <TicketAdvanced />
}

export default withWidth()(TicketResponsiveContainer);