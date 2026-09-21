/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { styled } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';

const TicketAdvancedLayout = styled(Paper)({
    height: `calc(100% - 48px)`,
    display: "grid",
    gridTemplateRows: "56px 1fr"
})

export default TicketAdvancedLayout;