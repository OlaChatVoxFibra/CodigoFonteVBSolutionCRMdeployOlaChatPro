/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import { DrawerContext } from "../../context/DrawerContext";
import {
  Paper,
  Typography,
  Button,
  InputBase,
  Select,
  MenuItem,
  IconButton,
  Divider,
  Grid,
  Box
} from '@material-ui/core';
import PageHelpButton from '../PageHelpButton';
import useAppTranslation from '../../hooks/useAppTranslation';
import { getHelpTopicForPath } from '../../utils/pageHelpMap';
import AppIcon from "../ui/AppIcon";
import BrainPreviewMini from "../BrainPreviewMini";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
  Calendar,
  Menu as MenuLucide,
} from "lucide-react";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === 'dark';
  const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.12)';
  /** Cabeçalho de abas + faixa de filtros: navbar OlaChat Pro (palette.chromeSurface) */
  const chromeSurface =
    theme.palette.chromeSurface != null
      ? theme.palette.chromeSurface
      : theme.palette.background.paper;
  const pageBg = theme.palette.background.default;
  const pageTextPrimary = theme.palette.text.primary;
  const chromeTextPrimary =
    theme.palette.chromeTextPrimary || "#FFFFFF";
  const chromeTextSecondary =
    theme.palette.chromeTextSecondary || "#E5E7EB";
  const textPrimary = chromeTextPrimary;
  const textSecondary = chromeTextSecondary;
  const mutedIcon = chromeTextSecondary;
  const filterLabelColor = chromeTextSecondary;
  const tabHoverBg = 'rgba(255, 255, 255, 0.08)';
  const tabActiveBg = 'rgba(255, 255, 255, 0.14)';
  const scrollHoverBg = 'rgba(255, 255, 255, 0.1)';
  const filterPillHover = 'rgba(18, 140, 90, 0.25)';
  /** Abas: whitelabel "botões secundários" (pageTabsAccent), não os botões principais. */
  const tabBrand =
    theme.pageTabsAccent != null && theme.pageTabsAccent !== ''
      ? theme.pageTabsAccent
      : theme.palette.primary.main;
  /** Navbar azul escuro: texto das abas em branco; ativo usa verde da marca */
  const navTabColor = chromeTextPrimary;
  /** Verde da marca (topbar/botões) para filtros ativos */
  const strongBlue = tabBrand || "#128C5A";
  const strongBlueLight = "#34D399";

  return {
    root: {
      minHeight: '100vh',
      maxWidth: '100%',
      overflowX: 'hidden',
      backgroundColor: pageBg,
      color: pageTextPrimary,
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      backgroundColor: chromeSurface,
      borderBottom: `1px solid ${borderSubtle}`,
      boxShadow: isDark
        ? '0 1px 2px 0 rgba(0, 0, 0, 0.45)'
        : '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    },
    headerContent: {
      padding: theme.spacing(0.125, 1, 0),
    },
    navRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
      paddingBottom: theme.spacing(0.25),
      paddingLeft: theme.spacing(1.5),
      paddingRight: theme.spacing(1.5),
      borderBottom: `1px solid ${borderSubtle}`,
      minHeight: 28,
    },
    tabsContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      overflowX: 'auto',
      overflowY: 'visible',
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
      scrollBehavior: 'smooth',
      flex: 1,
      whiteSpace: 'nowrap',
      padding: 0,
    },
    scrollButton: {
      minWidth: "auto",
      padding: 6,
      borderRadius: "50%",
      color: textPrimary,
      '&:hover': {
        backgroundColor: scrollHoverBg,
        color: textPrimary,
      },
    },
    navTab: {
      textTransform: "none",
      fontSize: "0.875rem",
      "&&": { fontWeight: 400 },
      color: navTabColor,
      minWidth: "auto",
      padding: theme.spacing(1, 2),
      paddingTop: theme.spacing(0.625),
      paddingBottom: theme.spacing(0.625),
      borderRadius: "8px",
      backgroundColor: 'transparent',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1.5),
      flexShrink: 0,
      transition: 'all 0.15s ease',
      '&:hover': {
        backgroundColor: tabHoverBg,
        color: navTabColor,
      },
    },
    navTabIcon: {
      fontSize: '0.875rem',
      opacity: 1,
      color: 'inherit',
      display: 'flex',
      alignItems: 'center',
      marginRight: theme.spacing(1.25),
    },
    navTabActive: {
      "&&": { fontWeight: 400 },
      color: isDark ? "#f4f4f5" : navTabColor,
      backgroundColor: isDark ? `${strongBlue}30` : tabActiveBg,
      boxShadow: isDark
        ? "0 2px 4px rgba(0, 0, 0, 0.35)"
        : "0 2px 4px rgba(15, 23, 42, 0.16)",
      border: "none",
      '&:hover': {
        backgroundColor: isDark ? `${strongBlue}40` : tabActiveBg,
        color: isDark ? '#ffffff' : navTabColor,
      },
    },
    createButton: {
      display: 'none',
    },
    statsContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(3),
    },
    statItem: {
      textAlign: 'center',
    },
    statValue: {
      fontSize: '1.5rem',
      fontWeight: 700,
    },
    statLabel: {
      fontSize: '0.75rem',
      color: textSecondary,
    },
    filterBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 16px",
      backgroundColor: chromeSurface,
      minHeight: 28,
      boxSizing: "border-box",
      width: "100%",
      marginTop: 2,
      borderTop: "none",
      gap: 10,
      [theme.breakpoints.down("sm")]: {
        alignItems: "flex-start",
        flexDirection: "column",
        padding: "4px 6px",
        gap: 4,
      },
    },
    leftFilter: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      flex: "0 0 auto",
      width: "clamp(160px, 20vw, 210px)",
      maxWidth: 210,
      minWidth: 160,
      [theme.breakpoints.down("sm")]: {
        flex: "1 1 auto",
        maxWidth: "100%",
        width: "100%",
      },
    },
    funnelIcon: {
      color: isDark ? "#ffffff" : mutedIcon,
      opacity: 1,
      flexShrink: 0,
    },
    filterInput: {
      fontSize: "0.56rem",
      color: textPrimary,
      fontWeight: 400,
      width: "100%",
      lineHeight: 1,
      "& input": {
        fontSize: "0.56rem",
        lineHeight: 1,
        padding: 0,
        minWidth: 0,
      },
      "& input::placeholder": {
        color: mutedIcon,
        opacity: 1,
        fontSize: "0.56rem",
        lineHeight: 1,
        whiteSpace: "nowrap",
      },
    },
    rightFilter: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      justifyContent: "flex-end",
      flex: "1 1 auto",
      minWidth: 0,
      [theme.breakpoints.down("sm")]: {
        width: "100%",
        justifyContent: "flex-start",
        gap: 6,
      },
    },
    filterItem: {
      display: "flex",
      alignItems: "center",
      gap: 3,
      cursor: "pointer",
      padding: "1px 5px",
      minHeight: 18,
      borderRadius: 8,
      border: "none",
      backgroundColor: "transparent",
      transition: 'background-color 0.2s, border-color 0.2s, transform 0.12s ease',
      '&:hover': {
        backgroundColor: filterPillHover,
      },
      '&:active': {
        transform: "translateY(1px)",
      },
      [theme.breakpoints.down("sm")]: {
        minHeight: 18,
        padding: "1px 5px",
      },
    },
    filterLabel: {
      fontSize: "0.5625rem",
      color: filterLabelColor,
      fontWeight: 400,
      lineHeight: 1,
      opacity: 1,
      whiteSpace: "nowrap",
      letterSpacing: "-0.01em",
      [theme.breakpoints.down("sm")]: {
        fontSize: "0.53125rem",
      },
    },
    chevronIcon: {
      color: filterLabelColor,
      opacity: 1,
      fontSize: 10,
      flexShrink: 0,
    },
    calendarIcon: {
      color: filterLabelColor,
      opacity: 1,
      fontSize: 10,
      marginRight: 2,
      flexShrink: 0,
    },
    viewModeGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1.5),
      backgroundColor: chromeSurface,
      padding: theme.spacing(0.5),
      borderRadius: 8,
      border: `1px solid ${borderSubtle}`,
    },
    viewModeButton: {
      textTransform: 'none',
      fontWeight: 500,
      minWidth: 'auto',
      padding: theme.spacing(0.75, 1.25),
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
    },
    content: {
      flex: 1,
      padding: theme.spacing(0.5),
      overflowY: 'auto',
      overflowX: 'hidden',
      maxWidth: '100%',
      maxHeight: 'calc(100vh - 112px)',
      backgroundColor: pageBg,
    },
    contentEdgeToEdge: {
      flex: 1,
      width: '100%',
      minHeight: 0,
      padding: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      maxHeight: 'calc(100vh - 112px)',
      backgroundColor: isDark ? pageBg : pageBg,
      display: 'flex',
      flexDirection: 'column',
    },
    noScroll: {
      overflowY: 'hidden',
      overflowX: 'hidden',
      maxHeight: 'none',
      height: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
      '& *::-webkit-scrollbar': {
        display: 'none',
      },
      '& *': {
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      },
    },
    fab: {
      position: "fixed",
      bottom: theme.spacing(2.5),
      right: theme.spacing(2.5),
      backgroundColor: theme.palette.primary.main,
      color: "#fff",
      zIndex: 1200,
      "&:hover": {
        backgroundColor: theme.palette.primary.main,
        filter: "brightness(1.05)",
      },
    },
    searchContainer: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      borderRadius: 6,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
      paddingLeft: theme.spacing(0.35),
      paddingRight: theme.spacing(0.35),
      minHeight: 18,
    },
    searchIcon: {
      display: 'flex',
      color: mutedIcon,
      marginRight: theme.spacing(0.5),
    },
    inputRoot: {
      color: textPrimary,
    },
    inputInput: {
      padding: "0px 0",
      fontSize: "0.58rem",
    },
  };
});

const ActivitiesStyleLayout = ({
  title,
  description,
  children,
  onCreateClick,
  createButtonText = "Criar",
  searchPlaceholder = "Buscar...",
  searchValue = "",
  onSearchChange,
  filters = [],
  stats = [],
  viewModes = [],
  currentViewMode,
  onViewModeChange,
  actions,
  navActions,
  showAdvancedFilters = false,
  advancedFiltersComponent,
  disableFilterBar = false,
  hideSearch = false,
  enableTabsScroll = false,
  hideNavDivider = false,
  hideHeaderDivider = false,
  rightFilters,
  hideDefaultRightFilters = false,
  rootBackground,
  compactHeader = false,
  transparentHeader = false,
  scrollContent = true,
  hideLeftIcon = false,
  /** Preenche a área abaixo das abas com fundo papel, sem margem cinza */
  contentEdgeToEdge = false,
  rootClassName = '',
  helpTopic = null,
  hidePageHelp = false,
}) => {
  const { t } = useAppTranslation();
  const classes = useStyles();
  const muiTheme = useTheme();
  const location = useLocation();
  const resolvedSearchPlaceholder = searchPlaceholder === "Buscar..." || searchPlaceholder === "Pesquisar..."
    ? t("modules.common.search")
    : searchPlaceholder;
  const resolvedCreateButtonText = createButtonText === "Criar"
    ? t("modules.common.create")
    : createButtonText;
  const resolvedHelpTopic = hidePageHelp
    ? null
    : helpTopic || getHelpTopicForPath(location.pathname);
  const pageHelpButton = resolvedHelpTopic ? (
    <PageHelpButton topic={resolvedHelpTopic} />
  ) : null;
  const contentRef = React.useRef(null);
  const tabsRef = React.useRef(null);
  const context = useContext(DrawerContext);
  const { drawerOpen, setDrawerOpen } = context || {};

  const [tabScrollArrows, setTabScrollArrows] = useState({ left: false, right: false });

  const updateTabScrollArrows = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    const eps = 2;
    const next = {
      left: scrollLeft > eps,
      right: maxScroll > eps && scrollLeft < maxScroll - eps,
    };
    setTabScrollArrows((prev) =>
      prev.left === next.left && prev.right === next.right ? prev : next
    );
  }, []);

  const tabScrollRafRef = React.useRef(null);
  const scheduleTabScrollUpdate = useCallback(() => {
    if (tabScrollRafRef.current != null) return;
    tabScrollRafRef.current = window.requestAnimationFrame(() => {
      tabScrollRafRef.current = null;
      updateTabScrollArrows();
    });
  }, [updateTabScrollArrows]);

  const handleScroll = (direction) => {
    if (tabsRef.current) {
      const scrollAmount = 300;
      tabsRef.current.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
      scheduleTabScrollUpdate();
    }
  };

  useLayoutEffect(() => {
    if (!enableTabsScroll) {
      if (tabScrollRafRef.current != null) {
        window.cancelAnimationFrame(tabScrollRafRef.current);
        tabScrollRafRef.current = null;
      }
      setTabScrollArrows({ left: false, right: false });
      return;
    }
    const el = tabsRef.current;
    if (!el) return;
    scheduleTabScrollUpdate();
    const onScroll = () => scheduleTabScrollUpdate();
    el.addEventListener('scroll', onScroll, { passive: true });
    // Evita loop do ResizeObserver em layouts com largura dinâmica de abas/filtros.
    // Mantemos atualização por scroll + resize de janela, que cobre os casos práticos.
    const ro = null;
    window.addEventListener('resize', scheduleTabScrollUpdate);
    const t = window.setTimeout(scheduleTabScrollUpdate, 150);
    return () => {
      window.clearTimeout(t);
      if (tabScrollRafRef.current != null) {
        window.cancelAnimationFrame(tabScrollRafRef.current);
        tabScrollRafRef.current = null;
      }
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', scheduleTabScrollUpdate);
    };
  }, [
    enableTabsScroll,
    viewModes.length,
    currentViewMode,
    scheduleTabScrollUpdate,
  ]);

  useEffect(() => {
    if (scrollContent && contentRef.current) {
      contentRef.current.scrollTop = 0;
    } else if (typeof window !== "undefined" && window.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div
      className={[classes.root, rootClassName].filter(Boolean).join(' ')}
      style={rootBackground ? { backgroundColor: rootBackground } : undefined}
    >
      <div
        className={classes.header}
        style={{
          ...(hideHeaderDivider ? { borderBottom: 'none' } : undefined),
          ...(transparentHeader ? { backgroundColor: 'transparent', boxShadow: 'none', borderBottom: 'none' } : undefined)
        }}
      >
        <div className={classes.headerContent} style={compactHeader ? { padding: 0 } : undefined}>
          {viewModes.length > 0 && (
            <div
              className={classes.navRow}
              style={{
                ...(hideNavDivider ? { borderBottom: 'none' } : undefined),
                ...(compactHeader ? { paddingTop: 4, paddingBottom: 4, paddingLeft: 8, paddingRight: 8 } : undefined)
              }}
            >
              {/* Menu Icon for collapsed state */}
              {!drawerOpen && setDrawerOpen && (
                <IconButton 
                  size="small" 
                  onClick={() => setDrawerOpen(true)}
                  style={{
                    marginRight: 8,
                    color: muiTheme.palette.text.primary,
                    opacity: 1,
                    padding: 2,
                    width: 24,
                    height: 24,
                  }}
                >
                  <AppIcon icon={MenuLucide} size={16} />
                </IconButton>
              )}

              {enableTabsScroll && tabScrollArrows.left && (
                <IconButton 
                  size="small" 
                  onClick={() => handleScroll('left')} 
                  className={classes.scrollButton}
                  aria-label="Rolar abas para a esquerda"
                >
                  <AppIcon icon={ChevronLeft} size={14} />
                </IconButton>
              )}
              
              <div className={classes.tabsContainer} ref={tabsRef}>
                {viewModes.map((mode) => {
                  const active = currentViewMode === mode.value;
                  return (
                    <Button
                      color="inherit"
                      key={mode.value}
                      onClick={() => onViewModeChange && onViewModeChange(mode.value)}
                      className={`${classes.navTab} ${active ? classes.navTabActive : ''}`}
                    >
                      {mode.icon &&
                        React.cloneElement(mode.icon, {
                          className: classes.navTabIcon
                        })}
                      <span>{mode.label}</span>
                    </Button>
                  );
                })}
              </div>

              {enableTabsScroll && tabScrollArrows.right && (
                <IconButton 
                  size="small" 
                  onClick={() => handleScroll('right')} 
                  className={classes.scrollButton}
                  aria-label="Rolar abas para a direita"
                >
                  <AppIcon icon={ChevronRight} size={14} />
                </IconButton>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'center' }}>
                {disableFilterBar && !hideSearch && (
                   <div className={classes.searchContainer} style={{ width: 'auto', marginRight: 0 }}>
                    <div className={classes.searchIcon}>
                      <AppIcon icon={Search} size={14} />
                    </div>
                    <InputBase
                      placeholder={searchPlaceholder}
                      classes={{
                        root: classes.inputRoot,
                        input: classes.inputInput,
                      }}
                      value={searchValue}
                      onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                    />
                  </div>
                )}
                {navActions}
                {pageHelpButton}
              </div>
            </div>
          )}

          {!disableFilterBar && currentViewMode !== "calendar" && (
            <div className={classes.filterBar}>
              {/* Esquerda: Busca */}
              <div className={classes.leftFilter}>
                {!hideLeftIcon && (
                  <AppIcon icon={Filter} size={11} className={classes.funnelIcon} />
                )}
                <InputBase
                  placeholder={resolvedSearchPlaceholder}
                  className={classes.filterInput}
                  value={searchValue}
                  onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                />
              </div>

              {/* Direita: Filtros */}
              <div className={classes.rightFilter}>
                {rightFilters !== undefined && rightFilters !== null
                  ? (typeof rightFilters === "function" ? rightFilters({ classes }) : rightFilters)
                  : (hideDefaultRightFilters ? null : (
                    <>
                      <div className={classes.filterItem}>
                        <Typography className={classes.filterLabel}>Pipeline Ativa</Typography>
                        <AppIcon icon={ChevronDown} size={10} className={classes.chevronIcon} />
                      </div>
                      <div className={classes.filterItem}>
                        <Typography className={classes.filterLabel}>Responsável</Typography>
                        <AppIcon icon={ChevronDown} size={10} className={classes.chevronIcon} />
                      </div>
                      <div className={classes.filterItem}>
                        <Typography className={classes.filterLabel}>Contato/Empr...</Typography>
                        <AppIcon icon={ChevronDown} size={10} className={classes.chevronIcon} />
                      </div>
                      <div className={classes.filterItem}>
                        <AppIcon icon={Calendar} size={10} className={classes.calendarIcon} />
                        <Typography className={classes.filterLabel}>Período</Typography>
                      </div>
                      <div className={classes.filterItem}>
                        <Typography className={classes.filterLabel}>Todos</Typography>
                        <AppIcon icon={ChevronDown} size={10} className={classes.chevronIcon} />
                      </div>
                    </>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={contentRef}
        className={
          contentEdgeToEdge
            ? `${classes.contentEdgeToEdge} ${!scrollContent ? classes.noScroll : ''}`
            : `${classes.content} ${!scrollContent ? classes.noScroll : ''}`
        }
        style={
          scrollContent
            ? undefined
            : {
                overflowY: "hidden",
                overflowX: "hidden",
                maxHeight: "none",
                minHeight: 0,
                flex: 1,
                display: "flex",
                flexDirection: "column"
              }
        }
      >
        {children}
      </div>

      {onCreateClick && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <BrainPreviewMini context={description || 'general'} iconSize={54} />
          <IconButton
            className={`${classes.fab} premium-fab`}
            onClick={onCreateClick}
            aria-label="nova-atividade"
            style={{ position: 'relative', bottom: 'auto', right: 'auto' }}
          >
            <AppIcon icon={Plus} size={22} color="#fff" strokeWidth={2} />
          </IconButton>
        </div>
      )}
    </div>
  );
};

export default ActivitiesStyleLayout;
