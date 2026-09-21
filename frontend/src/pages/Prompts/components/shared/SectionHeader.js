/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Typography } from "@material-ui/core";

export default function SectionHeader({ title, description, action }) {
  return (
    <Box mb={2}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" style={{ gap: 8 }}>
        <Box maxWidth={720} flex="1 1 240px">
          <Typography
            component="h2"
            variant="h6"
            style={{ fontSize: 17, fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="textSecondary" style={{ marginTop: 8, lineHeight: 1.5, maxWidth: 640 }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        {action || null}
      </Box>
      <Box
        mt={2}
        style={{
          height: 1,
          background: "linear-gradient(90deg, #e5e7eb 0%, #e5e7eb 100%)",
          maxWidth: "100%"
        }}
        aria-hidden
      />
    </Box>
  );
}
