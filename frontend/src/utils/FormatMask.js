/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

class FormatMask {
  setPhoneFormatMask(phoneToFormat) {
    if(!phoneToFormat){
      return phoneToFormat;
    }

    const number = ("" + phoneToFormat).replace(/\D/g, "");

    if (number.length === 12) {
      const phoneNumberFormatted = number.match(/^(\d{2})(\d{2})(\d{4})(\d{4})$/);
      if (!phoneNumberFormatted) return phoneToFormat;
      return (
        "+" +
        phoneNumberFormatted[1] +
        " (" +
        phoneNumberFormatted[2] +
        ") " +
        phoneNumberFormatted[3] +
        "-" +
        phoneNumberFormatted[4]
      );
    }else if(number.length === 13){
      const phoneNumberFormatted = number.match(/^(\d{2})(\d{2})(\d{5})(\d{4})$/);
      if (!phoneNumberFormatted) return phoneToFormat;
      return (
        "+" +
        phoneNumberFormatted[1] +
        " (" +
        phoneNumberFormatted[2] +
        ") " +
        phoneNumberFormatted[3] +
        "-" +
        phoneNumberFormatted[4]
      );
    } else {
      return phoneToFormat;
    }
  }

  removeMask(number) {
    const filterNumber = number.replace(/\D/g, "");
    return filterNumber;
  }

  maskPhonePattern(phoneNumber){
    if(phoneNumber.length < 13){
      return '🇧🇷 (99) 9999 9999';
    }else{
      return '🇧🇷 (99) 99999 9999';
    }
  }
}

export { FormatMask };