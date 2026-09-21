/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from 'react';
import { useFormikContext } from 'formik';
import { Typography, Grid } from '@material-ui/core';
import ShippingDetails from './ShippingDetails';
import PaymentDetails from './PaymentDetails';

export default function ReviewOrder() {
  const { values: formValues } = useFormikContext();
  return (
    <React.Fragment>
      <Typography variant="h6" gutterBottom>
        Resumo da assinatura
      </Typography>
      <Grid container spacing={2}>
        <ShippingDetails formValues={formValues} />
        <PaymentDetails formValues={formValues} />
      </Grid>
    </React.Fragment>
  );
}
