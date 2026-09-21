/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from 'yup';
import checkoutFormModel from './checkoutFormModel';
const {
  formField: {
    firstName,
    address1,
    city,
    zipcode,
    country,
  }
} = checkoutFormModel;


export default [
  Yup.object().shape({
    [firstName.name]: Yup.string().required(`${firstName.requiredErrorMsg}`),

    [zipcode.name]: Yup.string()
      .required(`${zipcode.requiredErrorMsg}`),
  }),

];
