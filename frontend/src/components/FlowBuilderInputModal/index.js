/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { green, purple } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import { i18n } from "../../translate/i18n";
import {
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import {
  QuestionAnswer as QuestionIcon,
  Help as HelpIcon,
  Info as InfoIcon
} from "@mui/icons-material";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap"
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1
  },
  extraAttr: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  btnWrapper: {
    position: "relative"
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12
  },
  dialogTitle: {
    backgroundColor: "#f8f8f8",
    padding: theme.spacing(2),
    "& h2": {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
      "& svg": {
        color: purple[500]
      }
    }
  },
  dialogContent: {
    padding: theme.spacing(2, 3)
  },
  dialogActions: {
    padding: theme.spacing(1, 3, 2)
  },
  chip: {
    margin: theme.spacing(0.5),
    backgroundColor: "rgba(156, 39, 176, 0.1)",
    color: purple[500],
    border: `1px solid ${purple[200]}`,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "rgba(156, 39, 176, 0.2)",
    }
  },
  infoBox: {
    backgroundColor: "rgba(156, 39, 176, 0.05)",
    borderRadius: theme.spacing(1),
    padding: theme.spacing(1.5),
    marginTop: theme.spacing(2),
    border: `1px solid rgba(156, 39, 176, 0.1)`,
    "& svg": {
      color: purple[500]
    }
  },
  actionButton: {
    borderRadius: 8,
    textTransform: "none",
    padding: theme.spacing(1, 2),
    fontWeight: 500
  }
}));

const FlowBuilderInputModal = ({ open, onSave, onUpdate, data, close }) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const [activeModal, setActiveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [variableName, setVariableName] = useState("");
  const questionInputRef = useRef(null);

  const [labels, setLabels] = useState({
    title: "Adicionar input ao fluxo",
    btn: "Adicionar"
  });

  const exampleVariables = [
    { name: "nome", description: "Nome do cliente" },
    { name: "email", description: "Email do cliente" },
    { name: "telefone", description: "Telefone do cliente" },
    { name: "cidade", description: "Cidade do cliente" }
  ];

  useEffect(() => {
    if (open === "edit") {
      setLabels({
        title: "Editar input do fluxo",
        btn: "Salvar alterações"
      });
      setQuestion(data.data.question || "");
      setVariableName(data.data.variableName || "");
      setActiveModal(true);
    } else if (open === "create") {
      setLabels({
        title: "Adicionar input ao fluxo",
        btn: "Adicionar"
      });
      setQuestion("");
      setVariableName("");
      setActiveModal(true);
    } else {
      setActiveModal(false);
    }
  }, [open, data]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleClose = () => {
    close(null);
    setActiveModal(false);
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    
    try {
      if (open === "edit") {
        handleClose();
        onUpdate({
          ...data,
          data: { 
            question: question,
            variableName: variableName
          }
        });
      } else if (open === "create") {
        handleClose();
        onSave({
          question: question,
          variableName: variableName
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleVariableClick = (variable) => {
   
    
    if (questionInputRef.current) {
      const inputElement = questionInputRef.current.querySelector('textarea');
      if (inputElement) {
        const start = inputElement.selectionStart;
        const end = inputElement.selectionEnd;
        const variableText = `\${${variable.name}}`;
        const newText = question.substring(0, start) + variableText + question.substring(end);
        setQuestion(newText);
        
       
        const newCursorPosition = start + variableText.length;
    
   
        setTimeout(() => {
          inputElement.focus();
          inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 100);
      }
    }
  };

  const isFormValid = () => {
    return question.trim() !== "" && variableName.trim() !== "";
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={activeModal}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        TransitionProps={{
          style: { 
            transition: "all 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
            transform: activeModal ? "none" : "translateY(-20px)",
            opacity: activeModal ? 1 : 0
          }
        }}
      >
        <DialogTitle className={classes.dialogTitle}>
          <Box display="flex" alignItems="center" gap={1}>
            <QuestionIcon style={{ color: "#9c27b0" }} />
            <Typography variant="h6">{labels.title}</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent className={classes.dialogContent} dividers>
          <Stack spacing={3}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Typography variant="subtitle2">Pergunta</Typography>
                <Tooltip title="A pergunta que será enviada ao usuário. Você pode incluir variáveis usando ${nomeVariavel}">
                  <IconButton size="small">
                    <HelpIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              
              <TextField
                label="Digite a pergunta"
                multiline
                rows={4}
                name="question"
                variant="outlined"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                className={classes.textField}
                fullWidth
                ref={questionInputRef}
                placeholder="Ex: Olá ${nome}, qual é a sua idade?"
              />
              
              <Box mt={1}>
                <Typography variant="caption" color="textSecondary">
                  Variáveis disponíveis (clique para inserir):
                </Typography>
                <Box display="flex" flexWrap="wrap" mt={0.5}>
                  {exampleVariables.map((variable) => (
                    <Chip
                      key={variable.name}
                      label={variable.name}
                      className={classes.chip}
                      onClick={() => handleVariableClick(variable)}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            </Box>
            
            <Divider />
            
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Typography variant="subtitle2">Nome da variável</Typography>
                <Tooltip title="Nome da variável onde a resposta será armazenada. Não use espaços ou caracteres especiais.">
                  <IconButton size="small">
                    <HelpIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              
              <TextField
                label="Nome da variável"
                name="variableName"
                variant="outlined"
                value={variableName}
                onChange={e => setVariableName(e.target.value)}
                className={classes.textField}
                fullWidth
                placeholder="Ex: idade_cliente"
                helperText="A resposta do usuário será armazenada nesta variável"
              />
            </Box>
            
            <Box className={classes.infoBox}>
              <Stack direction="row" spacing={1}>
                <InfoIcon fontSize="small" />
                <Box>
                  <Typography variant="subtitle2">Como funciona</Typography>
                  <Typography variant="body2">
                    Este nó enviará a pergunta ao usuário e aguardará uma resposta.
                    Quando o usuário responder, o valor será armazenado na variável especificada
                    e o fluxo continuará para o próximo nó.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        
        <DialogActions className={classes.dialogActions}>
          <Button 
            onClick={handleClose} 
            color="secondary" 
            variant="outlined"
            className={classes.actionButton}
          >
            {i18n.t("contactModal.buttons.cancel")}
          </Button>
          
          <div className={classes.btnWrapper}>
            <Button
              type="submit"
              color="primary"
              variant="contained"
              onClick={handleSave}
              disabled={loading || !isFormValid()}
              className={classes.actionButton}
            >
              {labels.btn}
            </Button>
            {loading && (
              <CircularProgress size={24} className={classes.buttonProgress} />
            )}
          </div>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FlowBuilderInputModal;