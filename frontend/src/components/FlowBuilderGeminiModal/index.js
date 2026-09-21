/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// frontend/geminiModal.jsx
import React, { useState, useEffect, useRef } from "react";
import * as Yup from "yup";
import { Formik, Form, Field, FieldArray } from "formik";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select, 
  FormControlLabel,
  RadioGroup,
  Radio,
  FormLabel,
  Checkbox,
  Chip,
  Box,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from "@material-ui/core";
import { 
  Visibility, 
  VisibilityOff, 
  ExpandMore,
  Add,
  Delete,
  Info,
  Settings,
  Timer
} from "@material-ui/icons";
import { InputAdornment } from "@material-ui/core";

// Lista de modelos Gemini suportados
const geminiModels = [
  "gemini-pro",
  "gemini-1.5-pro", 
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-pro"
];

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  multFieldLine: {
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
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
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1)
  },
  flowModeCard: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.spacing(1),
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.default
  },
  temporarySettings: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.spacing(1),
    border: `1px dashed ${theme.palette.primary.light}`
  },
  keywordChip: {
    margin: theme.spacing(0.5),
  },
  helpText: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5)
  },
  accordion: {
    marginBottom: theme.spacing(1),
    "&:before": {
      display: "none",
    }
  },
  accordionSummary: {
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.spacing(0.5),
    minHeight: 48,
    "&.Mui-expanded": {
      minHeight: 48,
    }
  },
  accordionDetails: {
    padding: theme.spacing(2),
    flexDirection: "column"
  }
}));

// Esquema de validação para Gemini
const GeminiSchema = Yup.object().shape({
  name: Yup.string()
    .min(5, "Muito curto!")
    .max(100, "Muito longo!")
    .required("Obrigatório"),
  prompt: Yup.string()
    .min(50, "Muito curto!")
    .required("Descreva o treinamento para Inteligência Artificial"),
  model: Yup.string()
    .oneOf(geminiModels, "Modelo inválido")
    .required("Informe o modelo"),
  maxTokens: Yup.number()
    .min(10, "Mínimo 10 tokens")
    .max(8000, "Máximo 8000 tokens")
    .required("Informe o número máximo de tokens"),
  temperature: Yup.number()
    .min(0, "Mínimo 0")
    .max(2, "Máximo 2")
    .required("Informe a temperatura"),
  apiKey: Yup.string().required("Informe a API Key"),
  maxMessages: Yup.number()
    .min(1, "Mínimo 1 mensagem")
    .max(100, "Máximo 100 mensagens")
    .required("Informe o número máximo de mensagens"),
  flowMode: Yup.string()
    .oneOf(["permanent", "temporary"], "Modo de fluxo inválido")
    .required("Selecione o modo de fluxo"),
  maxInteractions: Yup.number().when("flowMode", {
    is: "temporary",
    then: Yup.number()
      .min(1, "Mínimo 1 interação")
      .max(50, "Máximo 50 interações")
      .nullable(),
    otherwise: Yup.number().nullable()
  }),
  completionTimeout: Yup.number().when("flowMode", {
    is: "temporary",
    then: Yup.number()
      .min(1, "Mínimo 1 minuto")
      .max(60, "Máximo 60 minutos")
      .nullable(),
    otherwise: Yup.number().nullable()
  }),
  continueKeywords: Yup.array().when("flowMode", {
    is: "temporary",
    then: Yup.array()
      .of(Yup.string().required("Palavra-chave não pode estar vazia"))
      .min(1, "Pelo menos uma palavra-chave é obrigatória no modo temporário"),
    otherwise: Yup.array()
  }),
  objective: Yup.string().when(["flowMode", "autoCompleteOnObjective"], {
    is: (flowMode, autoComplete) => flowMode === "temporary" && autoComplete,
    then: Yup.string().required("Objetivo é obrigatório quando auto completar está ativo"),
    otherwise: Yup.string()
  })
});

const FlowBuilderGeminiModal = ({ open, onSave, data, onUpdate, close }) => {
  const classes = useStyles();
  const isMounted = useRef(true);

  const initialState = {
    name: "",
    prompt: "",
    model: "gemini-1.5-flash",
    maxTokens: 1000,
    temperature: 0.7,
    apiKey: "",
    maxMessages: 10,
    queueId: 0,
    
    // Campos para controle de fluxo
    flowMode: "permanent",
    maxInteractions: 5,
    completionTimeout: 10,
    continueKeywords: ["continuar", "próximo", "avançar"],
    objective: "",
    autoCompleteOnObjective: false
  };

  const [showApiKey, setShowApiKey] = useState(false);
  const [integration, setIntegration] = useState(initialState);
  const [labels, setLabels] = useState({
    title: "Adicionar Gemini ao fluxo",
    btn: "Adicionar",
  });
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    if (open === "edit") {
      setLabels({
        title: "Editar Gemini do fluxo",
        btn: "Salvar",
      });
      const typebotIntegration = data?.data?.typebotIntegration || {};
      setIntegration({
        ...initialState,
        ...typebotIntegration,
        model: geminiModels.includes(typebotIntegration.model)
          ? typebotIntegration.model
          : "gemini-1.5-flash",
        flowMode: typebotIntegration.flowMode || "permanent",
        continueKeywords: typebotIntegration.continueKeywords || ["continuar", "próximo", "avançar"],
        maxInteractions: typebotIntegration.maxInteractions || 5,
        completionTimeout: typebotIntegration.completionTimeout || 10,
        objective: typebotIntegration.objective || "",
        autoCompleteOnObjective: typebotIntegration.autoCompleteOnObjective || false
      });
    } else if (open === "create") {
      setLabels({
        title: "Adicionar Gemini ao fluxo",
        btn: "Adicionar",
      });
      setIntegration(initialState);
    }

    return () => {
      isMounted.current = false;
    };
  }, [open, data]);

  const handleClose = () => {
    setNewKeyword("");
    close(null);
  };

  const handleSavePrompt = (values, { setSubmitting }) => {
    const promptData = {
      ...values,
      // Garantir que campos do modo temporário sejam nulos se modo for permanente
      maxInteractions: values.flowMode === "temporary" ? values.maxInteractions : null,
      completionTimeout: values.flowMode === "temporary" ? values.completionTimeout : null,
      continueKeywords: values.flowMode === "temporary" ? values.continueKeywords : [],
      objective: values.flowMode === "temporary" ? values.objective : "",
      autoCompleteOnObjective: values.flowMode === "temporary" ? values.autoCompleteOnObjective : false,
      // Forçar provider como gemini e voz como texto
      provider: "gemini",
      voice: "texto"
    };

    if (open === "edit") {
      onUpdate({
        ...data,
        data: { typebotIntegration: promptData },
      });
    } else if (open === "create") {
      promptData.projectName = promptData.name;
      onSave({
        typebotIntegration: promptData,
      });
    }
    handleClose();
    setSubmitting(false);
  };

  const addKeyword = (arrayHelpers, keyword) => {
    if (keyword.trim() && !integration.continueKeywords.includes(keyword.trim())) {
      arrayHelpers.push(keyword.trim());
      setNewKeyword("");
    }
  };

  const removeKeyword = (arrayHelpers, index) => {
    arrayHelpers.remove(index);
  };

  const getModelDisplayName = (model) => {
    const modelNames = {
      "gemini-pro": "Gemini Pro",
      "gemini-1.5-pro": "Gemini 1.5 Pro",
      "gemini-1.5-flash": "Gemini 1.5 Flash",
      "gemini-2.0-flash": "Gemini 2.0 Flash",
      "gemini-2.0-pro": "Gemini 2.0 Pro"
    };
    return modelNames[model] || model;
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open === "create" || open === "edit"}
        onClose={handleClose}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {labels.title}
        </DialogTitle>
        <Formik
          initialValues={integration}
          enableReinitialize={true}
          validationSchema={GeminiSchema}
          onSubmit={handleSavePrompt}
        >
          {({ touched, errors, isSubmitting, values, setFieldValue }) => (
            <Form style={{ width: "100%" }}>
              <DialogContent dividers>
                
                {/* CONFIGURAÇÕES BÁSICAS */}
                <Accordion className={classes.accordion} defaultExpanded>
                  <AccordionSummary 
                    expandIcon={<ExpandMore />}
                    className={classes.accordionSummary}
                  >
                    <Typography className={classes.sectionTitle}>
                      <Settings />
                      Configurações Básicas - Google Gemini
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails className={classes.accordionDetails}>
                    
                    <Field
                      as={TextField}
                      label="Nome do Assistente"
                      name="name"
                      error={touched.name && Boolean(errors.name)}
                      helperText={touched.name && errors.name}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      required
                    />

                    <FormControl fullWidth margin="dense" variant="outlined">
                      <Field
                        as={TextField}
                        label="API Key Google AI"
                        name="apiKey"
                        type={showApiKey ? "text" : "password"}
                        error={touched.apiKey && Boolean(errors.apiKey)}
                        helperText={touched.apiKey && errors.apiKey}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        required
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowApiKey(!showApiKey)}>
                                {showApiKey ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </FormControl>

                    <FormControl
                      fullWidth
                      margin="dense"
                      variant="outlined"
                      error={touched.model && Boolean(errors.model)}
                    >
                      <InputLabel>Modelo Gemini</InputLabel>
                      <Field
                        as={Select}
                        label="Modelo Gemini"
                        name="model"
                      >
                        {geminiModels.map((model) => (
                          <MenuItem key={model} value={model}>
                            {getModelDisplayName(model)}
                          </MenuItem>
                        ))}
                      </Field>
                      {touched.model && errors.model && (
                        <div style={{ color: "red", fontSize: "12px" }}>
                          {errors.model}
                        </div>
                      )}
                    </FormControl>

                    <Field
                      as={TextField}
                      label="Prompt do Sistema"
                      name="prompt"
                      error={touched.prompt && Boolean(errors.prompt)}
                      helperText={touched.prompt && errors.prompt}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      required
                      rows={6}
                      multiline
                      placeholder="Descreva como a IA deve se comportar, que informações deve coletar, como deve responder..."
                    />

                    <div className={classes.multFieldLine}>
                      <Field
                        as={TextField}
                        label="Temperatura"
                        name="temperature"
                        error={touched.temperature && Boolean(errors.temperature)}
                        helperText={touched.temperature && errors.temperature || "0 = conservador, 2 = criativo"}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        type="number"
                        inputProps={{
                          step: "0.1",
                          min: "0",
                          max: "2",
                        }}
                      />
                      <Field
                        as={TextField}
                        label="Max Tokens"
                        name="maxTokens"
                        error={touched.maxTokens && Boolean(errors.maxTokens)}
                        helperText={touched.maxTokens && errors.maxTokens || "Tamanho máximo da resposta"}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        type="number"
                      />
                      <Field
                        as={TextField}
                        label="Max Mensagens"
                        name="maxMessages"
                        error={touched.maxMessages && Boolean(errors.maxMessages)}
                        helperText={touched.maxMessages && errors.maxMessages || "Histórico de contexto"}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        type="number"
                      />
                    </div>

                  </AccordionDetails>
                </Accordion>

                {/* COMPORTAMENTO DO FLUXO */}
                <Accordion className={classes.accordion} defaultExpanded>
                  <AccordionSummary 
                    expandIcon={<ExpandMore />}
                    className={classes.accordionSummary}
                  >
                    <Typography className={classes.sectionTitle}>
                      <Timer />
                      Comportamento do Fluxo
                      <Tooltip title="Configure como o Gemini deve se comportar no fluxo">
                        <Info fontSize="small" color="action" />
                      </Tooltip>
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails className={classes.accordionDetails}>
                    
                    <FormControl component="fieldset" margin="normal">
                      <FormLabel component="legend">Modo de Funcionamento</FormLabel>
                      <RadioGroup
                        name="flowMode"
                        value={values.flowMode}
                        onChange={(e) => setFieldValue("flowMode", e.target.value)}
                      >
                        <FormControlLabel
                          value="permanent"
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1">
                                <strong>Permanente</strong> - Encerrar fluxo aqui
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                O usuário fica conversando com a IA até pedir transferência ou encerrar
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="temporary"
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1">
                                <strong>Temporário</strong> - Volta ao fluxo depois
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                A IA executa uma tarefa específica e depois retorna ao fluxo normal
                              </Typography>
                            </Box>
                          }
                        />
                      </RadioGroup>
                    </FormControl>

                    {/* CONFIGURAÇÕES DO MODO TEMPORÁRIO */}
                    {values.flowMode === "temporary" && (
                      <div className={classes.temporarySettings}>
                        <Typography variant="h6" gutterBottom>
                          ⏱️ Configurações do Modo Temporário
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Configure quando a IA deve parar e retornar ao fluxo
                        </Typography>

                        {/* Limite de Interações */}
                        <Field
                          as={TextField}
                          label="Máximo de Interações"
                          name="maxInteractions"
                          error={touched.maxInteractions && Boolean(errors.maxInteractions)}
                          helperText={touched.maxInteractions && errors.maxInteractions || "Número máximo de mensagens antes de voltar ao fluxo (0 = ilimitado)"}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          type="number"
                          inputProps={{ min: 0, max: 50 }}
                        />

                        {/* Timeout */}
                        <Field
                          as={TextField}
                          label="Timeout (minutos)"
                          name="completionTimeout"
                          error={touched.completionTimeout && Boolean(errors.completionTimeout)}
                          helperText={touched.completionTimeout && errors.completionTimeout || "Tempo limite antes de voltar ao fluxo (0 = sem limite)"}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          type="number"
                          inputProps={{ min: 0, max: 60 }}
                        />

                        {/* Palavras-chave de Continuação */}
                        <FormControl fullWidth margin="dense">
                          <Typography variant="subtitle2" gutterBottom>
                            Palavras-chave para Continuar Fluxo
                          </Typography>
                          <FieldArray name="continueKeywords">
                            {(arrayHelpers) => (
                              <div>
                                <Box display="flex" gap={1} alignItems="center" mb={1}>
                                  <TextField
                                    variant="outlined"
                                    size="small"
                                    placeholder="Digite uma palavra-chave"
                                    value={newKeyword}
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === "Enter") {
                                        addKeyword(arrayHelpers, newKeyword);
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Add />}
                                    onClick={() => addKeyword(arrayHelpers, newKeyword)}
                                    disabled={!newKeyword.trim()}
                                  >
                                    Adicionar
                                  </Button>
                                </Box>
                                <Box display="flex" flexWrap="wrap" gap={0.5}>
                                  {values.continueKeywords.map((keyword, index) => (
                                    <Chip
                                      key={index}
                                      label={keyword}
                                      className={classes.keywordChip}
                                      onDelete={() => removeKeyword(arrayHelpers, index)}
                                      deleteIcon={<Delete />}
                                      variant="outlined"
                                      size="small"
                                    />
                                  ))}
                                </Box>
                                <Typography variant="caption" color="textSecondary">
                                  Quando o usuário enviar uma dessas palavras, o fluxo continuará automaticamente
                                </Typography>
                                {touched.continueKeywords && errors.continueKeywords && (
                                  <Typography variant="caption" color="error">
                                    {errors.continueKeywords}
                                  </Typography>
                                )}
                              </div>
                            )}
                          </FieldArray>
                        </FormControl>

                        {/* Objetivo */}
                        <Field
                          as={TextField}
                          label="Objetivo da IA"
                          name="objective"
                          error={touched.objective && Boolean(errors.objective)}
                          helperText={touched.objective && errors.objective || "Descreva o que a IA deve completar (ex: 'Coletar nome, email e telefone')"}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          multiline
                          rows={2}
                          placeholder="Ex: Coletar dados do cliente, Qualificar interesse, Diagnosticar problema..."
                        />

                        {/* Auto Completar */}
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={values.autoCompleteOnObjective}
                              onChange={(e) => setFieldValue("autoCompleteOnObjective", e.target.checked)}
                              name="autoCompleteOnObjective"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">
                                Auto completar quando atingir objetivo
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                A IA analisará automaticamente se completou o objetivo e voltará ao fluxo
                              </Typography>
                            </Box>
                          }
                        />

                        {/* Fila de Transferência */}
                        <Field
                          as={TextField}
                          label="ID da Fila (para transferência)"
                          name="queueId"
                          error={touched.queueId && Boolean(errors.queueId)}
                          helperText="ID da fila para onde transferir se usuário pedir atendente (0 = não transferir)"
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          type="number"
                          inputProps={{ min: 0 }}
                        />

                      </div>
                    )}

                  </AccordionDetails>
                </Accordion>

              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  variant="outlined"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  className={classes.btnWrapper}
                  disabled={isSubmitting}
                >
                  {labels.btn}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default FlowBuilderGeminiModal;