/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Typography, Box, Button } from "@material-ui/core";

export function BrainSupabaseConnectButton(props) {
  return (
    <Button {...props} disabled variant="outlined" size="small">
      Supabase indisponível
    </Button>
  );
}

export default function BrainSupabaseConnectDialog({ open, onClose }) {
  if (!open) return null;
  return (
    <Box p={2}>
      <Typography variant="body2" color="textSecondary">
        Integração Supabase indisponível neste pacote do VB Solution CRM.
      </Typography>
      {onClose ? (
        <Button onClick={onClose} style={{ marginTop: 8 }}>
          Fechar
        </Button>
      ) : null}
    </Box>
  );
}
