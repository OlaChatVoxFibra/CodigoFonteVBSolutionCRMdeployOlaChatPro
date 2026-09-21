/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import checkoutFormModel from './checkoutFormModel';
const {
  formField: {
    firstName,
    lastName,
    address1,
    city,
    state,
    zipcode,
    country,
    useAddressForPaymentDetails,
    nameOnCard,
    cardNumber,
    cvv
  }
} = checkoutFormModel;

export default {
  [firstName.name]: '',
  [lastName.name]: '',
  [address1.name]: '',
  [city.name]: '',
  [state.name]: '',
  [zipcode.name]: '',
  [country.name]: '',
  [useAddressForPaymentDetails.name]: false,
  [nameOnCard.name]: '',
  [cardNumber.name]: '',
  [cvv.name]: ''
};
