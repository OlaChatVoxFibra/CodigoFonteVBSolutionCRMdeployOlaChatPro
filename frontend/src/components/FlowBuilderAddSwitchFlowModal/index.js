/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useRef } from "react";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import {
  Grid,
} from "@material-ui/core";

import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { i18n } from "../../translate/i18n";
import TextField from "@material-ui/core/TextField";
import api from "../../services/api";
import { Autocomplete } from "@mui/material";
import Chip from "@mui/material/Chip";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },
  extraAttr: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
}));

const FlowBuilderAddSwitchFlowModal = ({
  open,
  onSave,
  onUpdate,
  data,
  close,
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);

  const initialState = {
    message: "",
    answerKey: "",
  };

  const [message, setMessage] = useState();
  const [activeModal, setActiveModal] = useState(false);
  const [integration, setIntegration] = useState();
  const [flowsData, setFlowsData] = useState();
  const [flowsDataObject, setFlowsDataObj] = useState();
  const [flowSelected, setFlowSelected] = useState();

  const [labels, setLabels] = useState({
    title: "Adicionar Perguta ao fluxo",
    btn: "Adicionar",
  });

  useEffect(() => {
    getFlows();
    if (open === "edit") {
      setLabels({
        title: "Editar Perguta do fluxo",
        btn: "Salvar",
      });
      const existing = data?.data?.flowSelected;
      const selectedName =
        typeof existing === "string"
          ? existing
          : existing && typeof existing === "object"
          ? existing.name || ""
          : "";
      setFlowSelected(selectedName);
      setActiveModal(true);
    } else if (open === "create") {
      setLabels({
        title: "Cria Perguta no fluxo",
        btn: "Salvar",
      });

      setFlowSelected("");
      setActiveModal(true);
    }

    return () => {
      isMounted.current = false;
    };
  }, [open]);

  const handleClose = () => {
    close(null);
    setActiveModal(false);
  };

  const getFlows = async () => {
    return await api.get("/flowbuilder").then((res) => {
      setFlowsData(res.data.flows.map((flow) => flow.name));
      setFlowsDataObj(res.data.flows);
      return res.data.flows;
    });
  };

  const handleSaveContact = (values) => {
    if (open === "edit") {
      handleClose();
      const selected = flowsDataObject?.find((flow) => flow.name === flowSelected);
      const flowSelectedObj = selected
        ? { id: selected.id, name: selected.name }
        : { name: flowSelected || "" };
      onUpdate({
        ...data,
        data: { ...data.data, flowSelected: flowSelectedObj },
      });
    } else if (open === "create") {
      const selected = flowsDataObject?.find((flow) => flow.name === flowSelected);
      const flowSelectedObj = selected
        ? { id: selected.id, name: selected.name }
        : { name: flowSelected || "" };
      handleClose();
      onSave({
        flowSelected: flowSelectedObj,
      });
    }
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={activeModal}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {open === "create"
            ? `Adicionar Troca de Fluxo`
            : `Editar Troca de Fluxo`}
        </DialogTitle>
        <DialogContent dividers>
          <Grid style={{ with: "100%", marginTop: 10, height: "250px" }}>
            {flowsDataObject && flowsDataObject.length && (
              <Autocomplete
                disablePortal
                id="combo-box-demo"
                value={flowSelected || ""}
                options={flowsData || []}
                onChange={(event, newValue) => {
                  setFlowSelected(newValue);
                }}
                sx={{ width: "100%" }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder="Escolha um fluxo"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                      style={{ borderRadius: "8px" }}
                    />
                  ))
                }
              />
            )}
          </Grid>
        </DialogContent>
        <DialogContent>
          <Button onClick={handleClose} color="secondary" variant="outlined">
            {i18n.t("contactModal.buttons.cancel")}
          </Button>
          <Button
            type="submit"
            color="primary"
            variant="contained"
            className={classes.btnWrapper}
            onClick={handleSaveContact}
          >
            {open === "create" ? `Adicionar` : "Editar"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowBuilderAddSwitchFlowModal;
