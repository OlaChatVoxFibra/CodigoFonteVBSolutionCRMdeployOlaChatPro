/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useMemo, useEffect } from "react";
import { useTheme } from "@material-ui/core/styles";
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Popover
} from "@material-ui/core";
import OutlinedInput from "@material-ui/core/OutlinedInput";
import Autocomplete from "@material-ui/lab/Autocomplete";
import NumberFormat from "react-number-format";
import AddIcon from "@material-ui/icons/Add";
import RemoveIcon from "@material-ui/icons/Remove";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import CloseIcon from "@material-ui/icons/Close";
import SearchIcon from "@material-ui/icons/Search";
import LeadCreateStepDock from "./LeadCreateStepDock";
import LeadFieldLabel, { isFieldEditable } from "./LeadFieldLabel";
import { WIZARD_STEPS, ORIGIN_CHANNELS } from "./leadWizardConstants";

export { WIZARD_STEPS, ORIGIN_CHANNELS };

const GRID_SP = 2;
const COL_HALF = 6;

const buildInputProps = (classes, compact) => ({
  classes: {
    root: compact ? `${classes.inputRoot} ${classes.inputRootCompact}` : classes.inputRoot,
    notchedOutline: classes.notchedOutline
  }
});

function Field({
  classes,
  label,
  children,
  xs = COL_HALF,
  required,
  fieldKey,
  viewOnly,
  editableFields,
  setEditableFields,
  compact
}) {
  const canEdit = isFieldEditable(viewOnly, editableFields, fieldKey);
  const child = React.Children.only(children);
  const enhanced =
    viewOnly && fieldKey
      ? React.cloneElement(child, {
          disabled: !canEdit,
          InputProps: {
            ...(child.props.InputProps || {}),
            readOnly: !canEdit
          }
        })
      : child;

  return (
    <Grid
      item
      xs={12}
      sm={xs}
      className={`${classes.formFieldCell} ${compact ? classes.formFieldCellCompact : ""}`}
    >
      {viewOnly && fieldKey ? (
        <LeadFieldLabel
          classes={classes}
          label={label}
          fieldKey={fieldKey}
          viewOnly={viewOnly}
          editableFields={editableFields}
          setEditableFields={setEditableFields}
          required={required}
        />
      ) : (
        <div className={classes.inputLabel}>
          {label}
          {required ? " *" : ""}
        </div>
      )}
      {enhanced}
    </Grid>
  );
}

function SectionWrap({ classes, title, hint, action, children, id, compact }) {
  return (
    <div
      className={`${classes.sectionBlock} ${compact ? classes.sectionBlockCompact : ""}`}
      id={id}
      data-lead-section={id}
    >
      {(title || action) && (
        <div className={classes.sectionHeaderRow}>
          {title ? (
            <div>
              <div className={classes.fieldLabel} style={{ marginBottom: hint ? 4 : 0 }}>
                {title}
              </div>
              {hint ? <p className={classes.sectionHint} style={{ marginBottom: 0 }}>{hint}</p> : null}
            </div>
          ) : (
            <div />
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export default function LeadCreateWizardForm(props) {
  const {
    classes,
    activeStep,
    setActiveStep,
    form,
    setForm,
    handleChange,
    handleAddressChange,
    phone,
    setPhone,
    email,
    setEmail,
    contacts,
    selectedContact,
    setSelectedContact,
    cartLines,
    setCartLines,
    addProductToCart,
    formatMoney,
    currency,
    setCurrency,
    inventoryItems,
    originChannel,
    setOriginChannel,
    pipelines,
    selectedPipelineId,
    setSelectedPipelineId,
    stageOptions,
    users,
    priority,
    setPriority,
    tagInput,
    setTagInput,
    activityOpen,
    setActivityOpen,
    activityDraft,
    setActivityDraft,
    NumberFormatCustom,
    cartTotal = 0,
    detailMode = false,
    compact = false,
    viewOnly = false,
    hideSectionDock = false
  } = props;

  const [editableFields, setEditableFields] = useState({});

  useEffect(() => {
    if (!viewOnly) setEditableFields({});
  }, [viewOnly, activeStep]);

  const theme = useTheme();
  const fieldProps = { viewOnly, editableFields, setEditableFields };
  const brandColor = theme.palette.primary.main;
  const [originAnchorEl, setOriginAnchorEl] = useState(null);
  const [productAnchorEl, setProductAnchorEl] = useState(null);
  const [popoverWidth, setPopoverWidth] = useState(320);
  const [productSearch, setProductSearch] = useState("");

  const inventoryList = Array.isArray(inventoryItems) ? inventoryItems : [];

  const filteredInventory = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return inventoryList;
    return inventoryList.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .includes(q)
    );
  }, [inventoryList, productSearch]);

  const openProductPicker = (event) => {
    const anchor = event?.currentTarget?.closest?.("[data-product-anchor]") || event?.currentTarget;
    if (!anchor) return;
    const w = anchor.getBoundingClientRect().width;
    setPopoverWidth(Math.max(280, Math.min(w, 420)));
    setProductAnchorEl(anchor);
  };

  const closeProductPicker = () => {
    setProductAnchorEl(null);
    setProductSearch("");
  };

  const openOriginPicker = (event) => {
    const anchor = event?.currentTarget?.closest?.("[data-origin-anchor]") || event?.currentTarget;
    if (!anchor) return;
    const w = anchor.getBoundingClientRect().width;
    setPopoverWidth(Math.max(260, Math.min(w, 360)));
    setOriginAnchorEl(anchor);
  };

  const closeOriginPicker = () => {
    setOriginAnchorEl(null);
  };

  const productPickerLabel =
    cartLines.length > 0
      ? cartLines.map((l) => `${l.qty}x ${l.name}`).join(" · ")
      : "";

  const showAll = activeStep === null || activeStep === "";
  const show = (id) => showAll || activeStep === id;

  const selectOrigin = (ch) => {
    setOriginChannel(ch.id);
    setForm((prev) => ({ ...prev, origin: ch.label }));
    closeOriginPicker();
  };

  const inputPropsBase = useMemo(() => buildInputProps(classes, compact), [classes, compact]);

  const selectedOrigin = ORIGIN_CHANNELS.find((ch) => ch.id === originChannel);
  const OriginIcon = selectedOrigin?.Icon;

  const originStartAdornment = useMemo(
    () => OriginIcon ? (
      <InputAdornment position="start">
        <OriginIcon size={18} color={selectedOrigin?.color} />
      </InputAdornment>
    ) : undefined,
    [OriginIcon, selectedOrigin?.color]
  );

  const originEndAdornment = useMemo(
    () => (
      <InputAdornment position="end">
        <KeyboardArrowDownIcon fontSize="small" style={{ opacity: 0.5 }} />
      </InputAdornment>
    ),
    []
  );

  const searchStartAdornment = useMemo(
    () => (
      <InputAdornment position="start">
        <SearchIcon fontSize="small" style={{ opacity: 0.5 }} />
      </InputAdornment>
    ),
    []
  );

  const originInputProps = useMemo(
    () => ({
      readOnly: true,
      classes: inputPropsBase.classes,
      startAdornment: originStartAdornment,
      endAdornment: originEndAdornment
    }),
    [inputPropsBase.classes, originStartAdornment, originEndAdornment]
  );

  const searchInputProps = useMemo(
    () => ({
      classes: inputPropsBase.classes,
      startAdornment: searchStartAdornment
    }),
    [inputPropsBase.classes, searchStartAdornment]
  );

  const sectionWrapProps = { classes, compact };
  const formGridClass = compact ? classes.formGridTight : classes.formGrid;
  const cellCls = compact
    ? `${classes.formFieldCell} ${classes.formFieldCellCompact}`
    : classes.formFieldCell;
  const gridSpacing = compact ? 1 : GRID_SP;

  const ro = (key) => viewOnly && key && !isFieldEditable(viewOnly, editableFields, key);

  const renderLabel = (label, key, required) =>
    viewOnly && key ? (
      <LeadFieldLabel
        classes={classes}
        label={label}
        fieldKey={key}
        viewOnly={viewOnly}
        editableFields={editableFields}
        setEditableFields={setEditableFields}
        required={required}
      />
    ) : (
      <div className={classes.inputLabel}>
        {label}
        {required ? " *" : ""}
      </div>
    );

  const sectionPersonal = (
    <SectionWrap
      {...sectionWrapProps}
      id="lead-section-personal"
      title="Identificação"
      action={
        !viewOnly ? (
          <Button
            size="small"
            variant="outlined"
            className={classes.ghostActionBtn}
            onClick={() => {
              const el = document.querySelector("[data-lead-contact-autocomplete] input");
              if (el) el.focus();
            }}
          >
            Buscar existente
          </Button>
        ) : null
      }
    >
      <Grid container spacing={gridSpacing} className={formGridClass}>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("Nome", "name", true)}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            value={form.name}
            onChange={handleChange("name")}
            InputProps={{ ...inputPropsBase, readOnly: ro("name") }}
          />
        </Grid>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("Telefone", "phone")}
          <NumberFormat
            customInput={TextField}
            format="+55 (##) #####-####"
            mask="_"
            allowEmptyFormatting
            value={phone}
            onValueChange={(v) => setPhone((prev) => prev === v.value ? prev : v.value)}
            variant="outlined"
            size="small"
            fullWidth
            InputProps={{ ...inputPropsBase, readOnly: ro("phone") }}
          />
        </Grid>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("E-mail", "email")}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            type="email"
            placeholder="nome@empresa.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{ ...inputPropsBase, readOnly: ro("email") }}
          />
        </Grid>
        <Grid item xs={12} sm={6} data-lead-contact-autocomplete className={cellCls}>
          {renderLabel("Contato", "contact")}
          <Autocomplete
            options={contacts}
            disabled={ro("contact")}
            getOptionLabel={(c) => (c?.name ? `${c.name} (${c.number})` : c?.number || "")}
            value={selectedContact}
            onChange={(_e, val) => {
              setSelectedContact(val || null);
              setForm((prev) => ({ ...prev, contactId: val?.id || null }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                placeholder="Selecionar contato (opcional)"
                InputProps={{
                  ...params.InputProps,
                  ...inputPropsBase,
                  readOnly: ro("contact")
                }}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} className={cellCls}>
          {renderLabel("Empresa", "companyName")}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            value={form.companyName}
            onChange={handleChange("companyName")}
            placeholder="Opcional"
            InputProps={{ ...inputPropsBase, readOnly: ro("companyName") }}
          />
        </Grid>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("Data de entrada do lead", "dateStart")}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            type="date"
            value={form.dateStart || ""}
            onChange={handleChange("dateStart")}
            InputLabelProps={{ shrink: true }}
            InputProps={{ ...inputPropsBase, readOnly: ro("dateStart") }}
          />
        </Grid>
      </Grid>
      <Typography className={classes.fieldLabel} style={{ marginTop: 16, marginBottom: 8 }}>
        Endereço
      </Typography>
      <Grid container spacing={gridSpacing} className={formGridClass}>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("CEP", "cep")}
          <NumberFormat
            customInput={TextField}
            format="#####-###"
            variant="outlined"
            size="small"
            fullWidth
            value={form.address?.cep || ""}
            onValueChange={(v) =>
              setForm((prev) => {
                if ((prev.address?.cep || "") === v.value) return prev;
                return { ...prev, address: { ...(prev.address || {}), cep: v.value } };
              })
            }
            InputProps={{ ...inputPropsBase, readOnly: ro("cep") }}
          />
        </Grid>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("Logradouro", "street")}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            value={form.address?.street || ""}
            onChange={handleAddressChange("street")}
            InputProps={{ ...inputPropsBase, readOnly: ro("street") }}
          />
        </Grid>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("Nº", "number")}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            value={form.address?.number || ""}
            onChange={handleAddressChange("number")}
            InputProps={{ ...inputPropsBase, readOnly: ro("number") }}
          />
        </Grid>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("Complemento", "complement")}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            value={form.address?.complement || ""}
            onChange={handleAddressChange("complement")}
            InputProps={{ ...inputPropsBase, readOnly: ro("complement") }}
          />
        </Grid>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("Bairro", "neighborhood")}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            value={form.address?.neighborhood || ""}
            onChange={handleAddressChange("neighborhood")}
            InputProps={{ ...inputPropsBase, readOnly: ro("neighborhood") }}
          />
        </Grid>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("Cidade", "city")}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            value={form.address?.city || ""}
            onChange={handleAddressChange("city")}
            InputProps={{ ...inputPropsBase, readOnly: ro("city") }}
          />
        </Grid>
        <Grid item xs={12} sm={6} className={cellCls}>
          {renderLabel("UF", "state")}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            value={form.address?.state || ""}
            onChange={handleAddressChange("state")}
            inputProps={{ maxLength: 2 }}
            InputProps={{ ...inputPropsBase, readOnly: ro("state") }}
          />
        </Grid>
      </Grid>
    </SectionWrap>
  );

  const sectionProduct = (
    <>
      <SectionWrap
        {...sectionWrapProps}
        id="lead-section-product"
        title="Produto e valor"
        hint={compact ? undefined : "Inventário e valor total do negócio"}
      >
        <div className={classes.productBlockHero}>
        <Grid container spacing={gridSpacing} className={formGridClass}>
          <Grid item xs={12} sm={8} className={cellCls}>
            <div className={classes.inputLabel}>Produtos</div>
            <div className={classes.anchorFieldWrap} data-product-anchor>
            <TextField
              variant="outlined"
              size="small"
              fullWidth
              placeholder="Selecionar produtos do inventário"
              value={productPickerLabel}
              onClick={openProductPicker}
              InputProps={{
                readOnly: true,
                classes: inputPropsBase.classes,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      type="button"
                      className={classes.brandAddBtn}
                      style={{ backgroundColor: brandColor }}
                      onClick={openProductPicker}
                      aria-label="Adicionar produto"
                    >
                      <AddIcon fontSize="small" htmlColor="#fff" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            </div>
          </Grid>
          <Grid item xs={12} sm={4} className={cellCls}>
            <div className={classes.inputLabel}>Moeda</div>
            <FormControl variant="outlined" fullWidth size="small">
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                input={<OutlinedInput {...inputPropsBase} />}
              >
                <MenuItem value="BRL">Real (R$)</MenuItem>
                <MenuItem value="USD">Dólar ($)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {cartLines.length > 0 && (
            <Grid item xs={12}>
              {cartLines.map((line) => (
                <div key={line.id} className={classes.productLineCard}>
                  <Typography variant="body2" style={{ fontWeight: 500 }}>
                    {line.qty}x {line.name}
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" style={{ marginRight: 8, opacity: 0.8 }}>
                      {formatMoney(line.price * line.qty, line.currency || currency)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() =>
                        setCartLines((prev) =>
                          prev
                            .map((l) =>
                              l.id === line.id ? { ...l, qty: Math.max(0, (l.qty || 1) - 1) } : l
                            )
                            .filter((l) => l.qty > 0)
                        )
                      }
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() =>
                        addProductToCart({
                          id: line.id,
                          name: line.name,
                          price: line.price,
                          currency: line.currency
                        })
                      }
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </div>
              ))}
              <div className={classes.cartTotalBar}>
                <span className={classes.cartTotalLabel}>Total dos produtos</span>
                <span className={classes.cartTotalValue}>{formatMoney(cartTotal, currency)}</span>
              </div>
            </Grid>
          )}
          <Grid item xs={12} sm={6} className={cellCls}>
            <div className={classes.inputLabel}>Valor da venda</div>
            <TextField
              variant="outlined"
              size="small"
              fullWidth
              value={cartLines.length > 0 ? cartTotal : form.value}
              onChange={cartLines.length > 0 ? undefined : handleChange("value")}
              className={classes.valueDisplay}
              helperText={cartLines.length > 0 ? "Total calculado pelos produtos" : ""}
              InputProps={{
                readOnly: cartLines.length > 0,
                classes: inputPropsBase.classes,
                inputComponent: NumberFormatCustom,
                inputProps: {
                  thousandSeparator: ".",
                  decimalSeparator: ",",
                  prefix: currency === "USD" ? "$ " : "R$ "
                }
              }}
            />
          </Grid>
        </Grid>
        </div>
      </SectionWrap>

      {!detailMode && (
      <SectionWrap {...sectionWrapProps} title="Pipeline">
        <Grid container spacing={gridSpacing} className={formGridClass}>
          <Grid item xs={12} sm={6} className={cellCls}>
            <div className={classes.inputLabel}>Pipeline</div>
            <FormControl variant="outlined" fullWidth size="small">
              <Select
                value={selectedPipelineId ?? ""}
                onChange={(e) => setSelectedPipelineId(e.target.value === "" ? null : e.target.value)}
                input={<OutlinedInput {...inputPropsBase} />}
              >
                <MenuItem value="">
                  <em>Padrão</em>
                </MenuItem>
                {Array.isArray(pipelines) &&
                  pipelines.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} className={cellCls}>
            <div className={classes.inputLabel}>Status</div>
            <FormControl variant="outlined" fullWidth size="small">
              <Select
                value={form.status}
                onChange={handleChange("status")}
                input={<OutlinedInput {...inputPropsBase} />}
              >
                {stageOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} className={cellCls}>
            <div className={classes.inputLabel}>Responsável</div>
            <FormControl variant="outlined" fullWidth size="small">
              <Select
                value={form.responsibleId ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    responsibleId: e.target.value === "" ? null : e.target.value
                  }))
                }
                input={<OutlinedInput {...inputPropsBase} />}
              >
                <MenuItem value="">
                  <em>Sem responsável</em>
                </MenuItem>
                {Array.isArray(users) &&
                  users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} className={cellCls}>
            <div className={classes.inputLabel}>Prioridade</div>
            <div className={classes.choiceGrid}>
              {["Baixa", "Média", "Alta", "Crítica"].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${classes.choiceChip} ${priority === p ? classes.choiceChipActive : ""}`}
                  onClick={() => setPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </Grid>
          <Grid item xs={12} sm={6} className={cellCls}>
            <div className={classes.inputLabel}>Site</div>
            <TextField
              variant="outlined"
              size="small"
              fullWidth
              placeholder="https://"
              value={form.site}
              onChange={handleChange("site")}
              InputProps={inputPropsBase}
            />
          </Grid>
        </Grid>
      </SectionWrap>
      )}
    </>
  );

  const sectionOrigin = (
    <SectionWrap
      {...sectionWrapProps}
      id="lead-section-origin"
      title="Origem"
      hint={viewOnly ? undefined : "Canal de entrada do lead"}
    >
      {renderLabel("Canal de origem", "origin")}
      <div className={classes.anchorFieldWrap} data-origin-anchor>
        <TextField
          variant="outlined"
          size="small"
          fullWidth
          className={classes.originPickerField}
          value={form.origin || ""}
          placeholder="Selecionar origem"
          onClick={ro("origin") ? undefined : openOriginPicker}
          onKeyDown={(e) => {
            if (ro("origin")) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openOriginPicker(e);
            }
          }}
          InputProps={originInputProps}
        />
      </div>
    </SectionWrap>
  );

  const sectionNotes = (
    <SectionWrap {...sectionWrapProps} id="lead-section-notes" title="Anotações">
      {renderLabel("Descrição", "description")}
      <TextField
        variant="outlined"
        fullWidth
        multiline
        minRows={3}
        placeholder="Observações sobre o lead…"
        value={form.description}
        onChange={handleChange("description")}
        InputProps={{ ...inputPropsBase, readOnly: ro("description") }}
      />
      <Box mt={2}>
        <div className={classes.inputLabel}>Tags</div>
        <div className={classes.tagInputRow}>
          {Array.isArray(form.tags) &&
            form.tags.map((t, idx) => (
              <Chip
                key={`${t}-${idx}`}
                label={t}
                size="small"
                onDelete={() =>
                  setForm((prev) => ({
                    ...prev,
                    tags: prev.tags.filter((x, i) => i !== idx)
                  }))
                }
              />
            ))}
          <TextField
            variant="outlined"
            size="small"
            placeholder="Adicionar tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                setForm((prev) => ({
                  ...prev,
                  tags: [...(prev.tags || []), tagInput.trim()]
                }));
                setTagInput("");
              }
            }}
            style={{ flex: 1, minWidth: 120 }}
            InputProps={inputPropsBase}
          />
        </div>
      </Box>
      <Button
        variant="outlined"
        className={classes.ghostActionBtn}
        style={{ marginTop: 16 }}
        onClick={() => setActivityOpen(true)}
      >
        Criar atividade para este lead
      </Button>
    </SectionWrap>
  );

  return (
    <>
      {!detailMode && !hideSectionDock && (
        <div className={compact ? classes.wizardDockWrap : undefined}>
          <LeadCreateStepDock activeStep={activeStep} setActiveStep={setActiveStep} />
        </div>
      )}

      <div className={compact ? classes.stepPanelCompact : classes.stepPanel}>
        {show("personal") && sectionPersonal}
        {show("product") && sectionProduct}
        {show("origin") && sectionOrigin}
        {show("notes") && sectionNotes}
      </div>

      <Popover
        open={Boolean(productAnchorEl)}
        anchorEl={productAnchorEl}
        onClose={closeProductPicker}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        disableScrollLock
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          className: classes.anchorPopoverPaper,
          style: { width: popoverWidth }
        }}
      >
        <div className={classes.anchorPopoverHeader}>
          <span>Inventário</span>
          <IconButton size="small" onClick={closeProductPicker} aria-label="Fechar">
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
        <div className={classes.anchorPopoverBody}>
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            placeholder="Buscar produto…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className={classes.nestedDialogSearch}
            InputProps={searchInputProps}
          />
          {filteredInventory.length === 0 ? (
            <Typography className={classes.productsEmpty}>Nenhum item encontrado.</Typography>
          ) : (
            <div className={classes.productPickList}>
              {filteredInventory.map((item) => {
                const cur = String(item.currency || "BRL").toUpperCase();
                const itemKey = item.id ?? item._id ?? `inv-${String(item.name || "").trim()}`;
                const line = cartLines.find((l) => l.id === itemKey);
                const qty = line?.qty || 0;
                return (
                  <div
                    key={itemKey}
                    className={`${classes.productPickCard} ${qty > 0 ? classes.productPickCardActive : ""}`}
                  >
                    <div className={classes.productPickMain}>
                      <Typography variant="subtitle2" style={{ fontWeight: 500 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" className={classes.productPickPrice}>
                        {Number(item.price || 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: cur === "USD" ? "USD" : "BRL"
                        })}
                      </Typography>
                    </div>
                    {qty > 0 ? <span className={classes.productQtyPill}>{qty}x</span> : null}
                    <button
                      type="button"
                      className={classes.productModalAddBtn}
                      aria-label={`Adicionar ${item.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addProductToCart(item);
                      }}
                    >
                      <AddIcon style={{ fontSize: 18 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <Box display="flex" justifyContent="flex-end" mt={1}>
            <Button size="small" variant="contained" className={classes.footerBtnPrimary} onClick={closeProductPicker}>
              Concluído
            </Button>
          </Box>
        </div>
      </Popover>

      <Popover
        open={Boolean(originAnchorEl)}
        anchorEl={originAnchorEl}
        onClose={closeOriginPicker}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        disableScrollLock
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          className: classes.anchorPopoverPaper,
          style: { width: popoverWidth }
        }}
      >
        <div className={classes.anchorPopoverHeader}>
          <span>Origem do lead</span>
          <IconButton size="small" onClick={closeOriginPicker} aria-label="Fechar">
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
        <div className={classes.originMiniList}>
          {ORIGIN_CHANNELS.map((ch) => {
            const Icon = ch.Icon;
            const selected = originChannel === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                className={`${classes.originMiniItem} ${selected ? classes.originMiniItemActive : ""}`}
                onClick={() => selectOrigin(ch)}
              >
                <Icon size={20} color={ch.color} />
                <span>{ch.label}</span>
              </button>
            );
          })}
        </div>
      </Popover>

      <Dialog open={activityOpen} onClose={() => setActivityOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 400 }}>Criar atividade</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Título"
            variant="outlined"
            size="small"
            value={activityDraft.title}
            onChange={(e) => setActivityDraft((d) => ({ ...d, title: e.target.value }))}
            InputProps={inputPropsBase}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Descrição"
            variant="outlined"
            size="small"
            multiline
            minRows={2}
            value={activityDraft.description}
            onChange={(e) => setActivityDraft((d) => ({ ...d, description: e.target.value }))}
            InputProps={inputPropsBase}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            className={classes.footerBtnPrimary}
            onClick={() => {
              const extra = `[Atividade] ${activityDraft.title}: ${activityDraft.description}`;
              setForm((prev) => ({
                ...prev,
                description: prev.description ? `${prev.description}\n${extra}` : extra
              }));
              setActivityOpen(false);
            }}
          >
            Vincular
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
