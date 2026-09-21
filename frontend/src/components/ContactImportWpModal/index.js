/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState, useContext } from 'react';
import { Dialog, DialogTitle, DialogActions, DialogContent, Button, Box, Typography } from '@material-ui/core';
import { i18n } from '../../translate/i18n';
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { Can } from "../Can";

import { AuthContext } from "../../context/Auth/AuthContext";
import * as XLSX from "xlsx";
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import toastError from '../../errors/toastError';
const useStyles = makeStyles((theme) => ({
  multFieldLine: {
    display: "flex",
    marginTop: 8,
  },
  uploadInput: {
    display: "none",
  },
  btns: {
    margin: 15,
  },
  label: {
    padding: 18,
    width: "100%",
    textTransform: 'uppercase',
    display: 'block',
    marginTop: 10,
    border: "solid 2px grey",
    textAlign: 'center',
    cursor: 'pointer',
    borderRadius: 8,
  },
  templatePreview: {
    borderRadius: 8,
    border: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E5EAF1',
    overflow: 'hidden',
    marginBottom: 16,
  },
  templateRow: {
    display: 'flex',
    borderBottom: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
    '&:last-child': { borderBottom: 'none' },
  },
  templateColLabel: {
    width: 36,
    padding: '6px 10px',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#FAFBFC',
    borderRight: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
  },
  templateColValue: {
    flex: 1,
    padding: '6px 12px',
    fontSize: '0.82rem',
    color: theme.palette.text.primary,
  },
}));

const ContactImportWpModal = ({ isOpen, handleClose, selectedTags, hideNum, userProfile }) => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const history = useHistory();

  const initialContact = { name: "", number: "", error: "" }

  const [contactsToImport, setContactsToImport] = useState([])
  const [statusMessage, setStatusMessage] = useState("")
  const [currentContact, setCurrentContact] = useState(initialContact)

  const handleClosed = () => {
    setContactsToImport([])
    setStatusMessage("")
    setCurrentContact(initialContact)
    handleClose()
  }

  useEffect(() => {
    console.log(contactsToImport?.length)
    if (contactsToImport?.length) {
      contactsToImport.map(async (item, index) => {
        setTimeout(async () => {
          try {
            if (index >= contactsToImport?.length - 1) {
              setStatusMessage(`importação concluída com exito a importação`)
              //setContactsToImport([])
              setCurrentContact(initialContact)

              setTimeout(() => {
                handleClosed()
              }, 15000);
            }
            if (index % 5 === 0) {

              setStatusMessage(`importação em andamento ${index} de ${contactsToImport?.length} não saia desta tela até concluir a importação`)
              // toast.info(
              // );
            }
            console.log("antes do import: ", item[0])
            await api.post(`/contactsImport`, {
              name: item.name,
              number: item.number.toString(),
              email: item.email,
              birthDate: item.birthDate,
              tags: item.tags,
              carteira: item.carteira,
            });

            setCurrentContact({ name: item.name, number: item.number, error: "success" })
          } catch (err) {
            setCurrentContact({ name: item.name, number: item.number, error: err })
          }
        }, 330 * index);
      });
    }
  }, [contactsToImport]);

  const handleOnExportContacts = async (model = false) => {
    const allDatas = []; //const { data } = await api.get("/contacts");

    let i = 1;
    if (!model) {
      while (i !== 0) {
        const { data } = await api.get("/contacts/", {
          params: { searchParam: "", pageNumber: i, contactTag: JSON.stringify(selectedTags) },
        });
        console.log(data)
        data.contacts.forEach((element) => {
          const tagsContact = element?.tags?.map(tag => tag?.name).join(', '); 
          // Extrair carteira (email do usuário responsável)
          const carteira = element?.contactWallets && element.contactWallets.length > 0 
            ? element.contactWallets[0].wallet?.email 
            : "";
          const contactWithTags = { ...element, tags: tagsContact, carteira };
          allDatas.push(contactWithTags);
        });

        const pages = data?.count / 20;
        i++;
        if (i > pages) {
          i = 0;
        }
      }
    } else {
      allDatas.push({
        name: "Nome Contato",
        number: "5599999999999",
        email: "email-contato@email.com",
        tags: "tag1, tag2",
        carteira: "funcionario-empresa@email.com",
      });
    }

    const exportData = allDatas.map((e) => ({
      Nome: e.name,
      Número: (hideNum && userProfile === "user" ? (e.isGroup ? e.number : e.number.slice(0, -6) + "**-**" + e.number.slice(-2)) : e.number),
      Email: e.email || "",
      Tags: e.tags || "",
      Carteira: e.carteira || "",
    }));
    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    XLSX.writeFile(wb, "backup_contatos.xlsx");
  };

  const handleImportChange = (e) => {
    const [file] = e.target.files;
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setContactsToImport(data)
      } catch (err) {
        console.log(err);
        setContactsToImport([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const handleimportContact = async () => {
    try {
      history.push('/contacts/import');
    } catch (err) {
      toastError(err);
    }
  };

  const templateColumns = [
    { col: "A", label: "Nome" },
    { col: "B", label: "Número" },
    { col: "C", label: "Email" },
    { col: "D", label: "Tags" },
    { col: "E", label: "Carteira" },
  ];

  return (
    <Dialog fullWidth open={isOpen} onClose={handleClosed} maxWidth="xs">
      <DialogTitle style={{ paddingBottom: 4 }}>Exportar / Importar Contatos</DialogTitle>
      <DialogContent style={{ paddingTop: 0 }}>
        <Typography variant="caption" color="textSecondary" style={{ marginBottom: 8, display: 'block' }}>
          Formato fixo do arquivo exportado:
        </Typography>
        <div className={classes.templatePreview}>
          {templateColumns.map((item) => (
            <div key={item.col} className={classes.templateRow}>
              <div className={classes.templateColLabel}>{item.col}</div>
              <div className={classes.templateColValue}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Can
            role={user.profile}
            perform="contacts-page:deleteContact"
            yes={() => (
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleOnExportContacts(false)}
                style={{ flex: 1, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', padding: '8px 12px' }}
              >
                Exportar
              </Button>
            )}
          />
          <Button
            variant="outlined"
            color="primary"
            onClick={() => handleOnExportContacts(true)}
            style={{ flex: 1, textTransform: 'none', fontSize: '0.8rem', padding: '8px 12px' }}
          >
            Modelo Excel
          </Button>
        </div>
        <Button
          fullWidth
          variant="outlined"
          color="primary"
          onClick={() => handleimportContact()}
          style={{ textTransform: 'none', fontSize: '0.8rem', padding: '8px 12px' }}
        >
          Importar Contatos
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary" style={{ textTransform: 'none' }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactImportWpModal;
