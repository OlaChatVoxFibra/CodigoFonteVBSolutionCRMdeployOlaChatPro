/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress
} from "@material-ui/core";
import { Close as CloseIcon } from "@material-ui/icons";
import LeadDetailPanel from "./LeadDetailPanel";
import LeadChatPane from "./LeadChatPane";
import LeadCreateWizardForm from "./LeadCreateWizardForm";
import LeadDetailMenubar from "./LeadDetailMenubar";
import ContactDrawer from "../ContactDrawer";

export default function LeadSaleSplitDrawer({
  open,
  onClose,
  classes,
  isEdit,
  lead,
  loading,
  handleSubmit,
  wizardProps,
  leadPanelProps,
  ticket,
  ticketLoading,
  selectedContact,
  drawerOpen,
  setDrawerOpen,
  setActiveStep,
  setForm,
  showTicketPreview = true
}) {
  const onOpenInventory = () => {
    setActiveStep("product");
    requestAnimationFrame(() => {
      const anchor = document.querySelector("[data-lead-drawer] [data-product-anchor]");
      const input = anchor?.querySelector?.(".MuiOutlinedInput-root");
      if (input) input.click();
    });
  };

  const conversationHint = useMemo(() => {
    const phoneDigits = String(
      lead?.phone || lead?.contact?.number || selectedContact?.number || ""
    ).replace(/\D/g, "");
    return Boolean(
      lead?.contactId ||
        lead?.contact?.id ||
        selectedContact?.id ||
        phoneDigits.length >= 8
    );
  }, [
    lead?.contactId,
    lead?.contact?.id,
    lead?.contact?.number,
    lead?.phone,
    selectedContact?.id,
    selectedContact?.number
  ]);

  const showChatColumn = useMemo(
    () =>
      showTicketPreview &&
      (Boolean(ticket?.uuid || ticket?.id) ||
        ticketLoading ||
        (isEdit && conversationHint)),
    [
      showTicketPreview,
      ticket?.uuid,
      ticket?.id,
      ticketLoading,
      isEdit,
      conversationHint
    ]
  );

  const drawerPaperClass = showChatColumn ? classes.drawerPaper : classes.drawerPaperNarrow;

  const footer = (
    <div className={classes.splitFooter}>
      <Button
        onClick={onClose}
        variant="outlined"
        className={`${classes.footerBtn} ${classes.footerBtnOutlined}`}
      >
        Cancelar
      </Button>
      <Button
        onClick={handleSubmit}
        variant="contained"
        disabled={loading || !(wizardProps.form?.name || "").trim()}
        className={`${classes.footerBtn} ${classes.footerBtnPrimary}`}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
      >
        {isEdit ? "Salvar" : "Criar"}
      </Button>
    </div>
  );

  const leadTitle = leadPanelProps?.form?.name || lead?.name || "Sem nome";
  const leadIdLabel = lead?.id ? ` #${lead.id}` : "";

  const renderCreateForm = () => (
    <LeadCreateWizardForm {...wizardProps} compact hideSectionDock />
  );

  const renderEditPanel = () => (
    <div className={classes.splitEditInfoScroll}>
      {lead?.id ? (
        <Box px={2} pt={1}>
          
        </Box>
      ) : null}
      <LeadDetailPanel {...leadPanelProps} onOpenInventory={onOpenInventory} />
    </div>
  );

  const renderMainContent = () => {
    if (isEdit) {
      if (showChatColumn) {
        return (
          <>
            <div className={classes.splitEditInfoCol}>{renderEditPanel()}</div>
            <div className={classes.splitEditChatCol}>
              <LeadChatPane
                classes={classes}
                onClose={onClose}
                ticket={ticket}
                ticketLoading={ticketLoading}
                selectedContact={selectedContact}
                setDrawerOpen={setDrawerOpen}
                compactHeader
                fillHeight
              />
            </div>
          </>
        );
      }
      return (
        <div className={classes.splitEditInfoColFull}>
          <LeadDetailPanel {...leadPanelProps} onOpenInventory={onOpenInventory} />
        </div>
      );
    }

    if (showChatColumn) {
      return (
        <>
          <div className={classes.splitEditInfoCol}>
            <div className={classes.splitEditInfoScroll}>{renderCreateForm()}</div>
          </div>
          <div className={classes.splitEditChatCol}>
            <LeadChatPane
              classes={classes}
              onClose={onClose}
              ticket={ticket}
              ticketLoading={ticketLoading}
              selectedContact={selectedContact}
              setDrawerOpen={setDrawerOpen}
              compactHeader
              fillHeight
            />
          </div>
        </>
      );
    }

    return renderCreateForm();
  };

  const createFlowNoChat = !isEdit && !showChatColumn;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ className: drawerPaperClass }}
      ModalProps={{ keepMounted: true }}
    >
      <div className={classes.splitShell} data-lead-drawer>
        <Box className={classes.splitHeader}>
          <IconButton
            onClick={onClose}
            size="small"
            className={classes.splitCloseBtn}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Box className={classes.splitHeaderText}>
            <Typography className={classes.splitTitle} component="h2">
              {isEdit ? (
                <>
                  Detalhes do lead
                  <span className={classes.splitTitleMeta}>
                    {" "}
                    — {leadTitle}
                    {leadIdLabel}
                  </span>
                </>
              ) : (
                "Novo lead"
              )}
            </Typography>
            {!isEdit && (
              <Typography className={classes.splitSubtitle} component="p">
                Obrigatório: nome. Use os filtros para ir a uma seção ou preencha tudo em Todos.
              </Typography>
            )}
          </Box>
        </Box>

        <div className={classes.splitMenubarRow}>
          <LeadDetailMenubar
            variant={isEdit ? "detail" : "create"}
            activeStep={isEdit ? (leadPanelProps.activeStep ?? null) : wizardProps.activeStep}
            setActiveStep={setActiveStep}
          />
        </div>

        <div className={classes.splitEditBody}>
          <div className={createFlowNoChat ? classes.splitEditMainScrollable : classes.splitEditMain}>
            <div className={createFlowNoChat ? undefined : classes.splitEditBottom}>{renderMainContent()}</div>
            {footer}
          </div>
        </div>

        {showChatColumn && (
          <ContactDrawer
            open={drawerOpen}
            handleDrawerClose={() => setDrawerOpen(false)}
            contact={ticket?.contact || selectedContact || {}}
            loading={ticketLoading}
            ticket={ticket || {}}
          />
        )}
      </div>
    </Drawer>
  );
}
