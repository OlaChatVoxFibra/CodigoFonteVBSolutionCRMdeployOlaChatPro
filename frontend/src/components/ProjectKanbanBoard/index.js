/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Grid,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Button,
  Tooltip
} from '@material-ui/core';
import { MoreVert as MoreVertIcon, Add as AddIcon, DeleteOutline as DeleteIcon, CalendarTodayOutlined as CalendarIcon, ChevronRightOutlined as ArrowIcon } from '@material-ui/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { AuthContext } from '../../context/Auth/AuthContext';
import { getBackendUrl } from '../../config';
import useAppTranslation from '../../hooks/useAppTranslation';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: 'minmax(0, 1fr)',
    alignItems: 'flex-start',
    overflowX: 'auto',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
    backgroundColor: 'transparent',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
      display: 'none'
    }
  },
  column: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 0,
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '100%',
  },
  columnHeaderRow: {
    margin: theme.spacing(1, 1, 0.5, 1),
    padding: theme.spacing(0.5, 0.5),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28
  },
  columnHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1)
  },
  columnDot: {
    width: 10,
    height: 10,
    borderRadius: '50%'
  },
  columnTitle: {
    fontSize: '0.85rem',
    fontWeight: 400,
    letterSpacing: '0.06em',
    color: theme.palette.type === 'dark' ? '#94a3b8' : '#6B7280',
    textTransform: 'uppercase',
    opacity: 1
  },
  countBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 8,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#F9FAFB',
    color: theme.palette.type === 'dark' ? '#e5e7eb' : '#6B7280',
    fontWeight: 600
  },
  columnContent: {
    padding: theme.spacing(1),
    margin: theme.spacing(0.5, 1, 1, 1),
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    minHeight: 120,
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
      width: 0,
      height: 0,
    },
  },
  card: {
    position: 'relative',
    margin: theme.spacing(0.75, 0.5),
    borderRadius: 8,
    border: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E5E7EB',
    boxShadow: theme.palette.type === 'dark' ? '0 2px 8px rgba(0,0,0,0.35)' : '0 1px 2px rgba(15,23,42,0.05)',
    cursor: 'pointer',
    minHeight: 96,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor:
      theme.palette.type === 'dark'
        ? theme.palette.dashboardCard || '#353538'
        : '#fff',
    '&:hover': {
      boxShadow: theme.palette.type === 'dark' ? '0 4px 14px rgba(0,0,0,0.45)' : '0 3px 8px rgba(0,0,0,0.12)',
      '& $cardDeleteBtn': {
        opacity: 1,
        transform: 'scale(1)'
      }
    },
  },
  cardAccent: {
    height: 3,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  cardTitle: {
    fontWeight: 400,
    color: theme.palette.type === 'dark' ? '#f4f4f5' : '#111827',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    marginBottom: theme.spacing(1),
  },
  cardMeta: {
    color: theme.palette.type === 'dark' ? '#94a3b8' : '#6B7280'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(1),
  },
  cardFooterDot: {
    width: 8,
    height: 8,
    borderRadius: '50%'
  },
  cardDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    minWidth: 22,
    padding: 0,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(0,0,0,0.92)' : '#ffffffEE',
    border: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E5E7EB',
    borderRadius: 6,
    color: theme.palette.type === 'dark' ? '#94a3b8' : '#9CA3AF',
    opacity: 0,
    transform: 'scale(0.92)',
    transition: 'all 120ms ease',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? theme.palette.inputBackground : '#fff'
    }
  },
  cardLinkIcon: {
    fontSize: 14,
    opacity: 0.9,
    cursor: 'default',
    color: theme.palette.type === 'dark' ? '#93c5fd' : '#0D47A1',
  },
  cardDivider: {
    height: 1,
    opacity: 0.8,
    margin: '6px 0',
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
  },
  cardAvatarSm: {
    width: 22,
    height: 22,
    fontSize: 11,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
    color: theme.palette.type === 'dark' ? '#f4f4f5' : '#111827',
  },
  calendarIconSm: {
    fontSize: 12,
    color: theme.palette.type === 'dark' ? '#94a3b8' : '#6B7280',
  },
  addButton: {
    margin: theme.spacing(1, 1.5, 1.5),
    textTransform: 'none',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: theme.palette.type === 'dark' ? '1px dashed rgba(255,255,255,0.2)' : '1px dashed #CBD5E1',
    color: theme.palette.type === 'dark' ? '#cbd5e1' : '#6B7280',
    fontSize: '0.85rem',
    fontWeight: 500,
    borderRadius: 8,
    padding: theme.spacing(0.75, 0),
    minHeight: 36,
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#F9FAFB'
    }
  }
}));

const withAlpha = (hex, alpha) => {
  const c = (hex || '').replace('#', '');
  if (c.length !== 6) return hex;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ProjectKanbanBoard = ({ projects, columns: columnsProp, onProjectClick, onAdd, onMove, onDelete, users = [] }) => {
  const { t, i18n } = useAppTranslation();
  const classes = useStyles();
  const { user: authUser } = useContext(AuthContext) || {};
  const backendUrl = getBackendUrl && getBackendUrl();
  const boardRef = useRef(null);
  const isPanningRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [colPx, setColPx] = useState(0);

  const defaultColumns = useMemo(() => ([
    { id: 'backlog', title: t('modules.projects.stages.backlog'), color: '#6b7280' },
    { id: 'pending', title: t('modules.projects.stages.pending'), color: '#f59e0b' },
    { id: 'in_progress', title: t('modules.projects.stages.inProgress'), color: '#2563eb' },
    { id: 'completed', title: t('modules.projects.stages.completed'), color: '#10B981' }
  ]), [t]);

  const columns = Array.isArray(columnsProp) && columnsProp.length
    ? columnsProp
    : defaultColumns;

  const getColumnId = useCallback((status) => {
    const s = String(status || '').toLowerCase();
    if (['backlog'].includes(s)) return 'backlog';
    if (['pending', 'pendente'].includes(s)) return 'pending';
    if (['in_progress', 'em progresso', 'active', 'ativo'].includes(s)) return 'in_progress';
    if (['completed', 'concluído', 'concluido'].includes(s)) return 'completed';
    return 'backlog';
  }, []);

  const projectsByColumn = useMemo(() => {
    const grouped = {};
    for (const col of (columns || [])) grouped[col.id] = [];
    for (const project of (projects || [])) {
      const colId = getColumnId(project.status);
      if (grouped[colId]) grouped[colId].push(project);
      else if (columns.length) grouped[columns[0].id].push(project);
    }
    return grouped;
  }, [projects, columns, getColumnId]);

  const resolveUserById = (id) => {
    if (!id || !Array.isArray(users)) return null;
    const uid = Number(id);
    return users.find(u => Number(u.id) === uid) || null;
  };

  const avatarSrcForUser = (u) => {
    if (!u) return undefined;
    const img = u.profileImage || u.avatar || u.picture || null;
    if (!img) return undefined;
    if (String(img).startsWith('http')) return img;
    const companyId = u.companyId || (authUser && authUser.companyId);
    if (!backendUrl || !companyId) return undefined;
    return `${backendUrl}/public/company${companyId}/user/${img}`;
  };

  const formatDate = (value) => {
    if (!value) return t('modules.common.noDate');
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      const locale = String(i18n.language || 'pt').startsWith('en') ? 'en-US' : (String(i18n.language || 'pt').startsWith('es') ? 'es-ES' : 'pt-BR');
      return d.toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(value);
    }
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (onMove) {
      const projectId = draggableId;
      onMove(projectId, source.droppableId, destination.droppableId, destination.index);
    }
  };

  useEffect(() => {
    const calc = () => {
      const el = boardRef.current;
      if (!el) return;
      const style = window.getComputedStyle(el);
      const paddingLeft = parseFloat(style.paddingLeft || '16') || 16;
      const paddingRight = parseFloat(style.paddingRight || '16') || 16;
      const gap = parseFloat(style.columnGap || style.gap || '16') || 16;
      const totalGap = gap * 3;
      const inner = el.clientWidth - paddingLeft - paddingRight - totalGap;
      const w = inner > 0 ? Math.floor(inner / 4) : 240;
      setColPx(w);
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (boardRef.current) ro.observe(boardRef.current);
    window.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('resize', calc);
      ro.disconnect();
    };
  }, []);

  const needsPan = (columns || []).length > 4;

  const onMouseDown = (e) => {
    if (!needsPan) return;
    isPanningRef.current = true;
    startXRef.current = e.pageX - (boardRef.current?.offsetLeft || 0);
    scrollLeftRef.current = boardRef.current?.scrollLeft || 0;
  };
  const onMouseLeave = () => { if (needsPan) isPanningRef.current = false; };
  const onMouseUp = () => { if (needsPan) isPanningRef.current = false; };
  const onMouseMove = (e) => {
    if (!needsPan || !isPanningRef.current || !boardRef.current) return;
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - startXRef.current) * -1;
    boardRef.current.scrollLeft = scrollLeftRef.current + walk;
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className={classes.root}
        data-kanban-scroll="true"
        ref={boardRef}
        {...(needsPan ? {
          onMouseDown,
          onMouseLeave,
          onMouseUp,
          onMouseMove,
        } : {})}
        style={{
          gridTemplateColumns: colPx ? `repeat(4, ${colPx}px)` : undefined,
          gridAutoColumns: colPx ? `${colPx}px` : undefined,
          cursor: needsPan ? (isPanningRef.current ? 'grabbing' : 'grab') : 'default',
          userSelect: isPanningRef.current ? 'none' : 'auto'
        }}
      >
        {columns.map((column) => (
          <div key={column.id} className={classes.column}>
            <div className={classes.columnHeaderRow}>
              <div className={classes.columnHeaderLeft}>
                <span className={classes.columnDot} style={{ backgroundColor: column.color }} />
                <Typography className={classes.columnTitle}>{column.title}</Typography>
              </div>
              <span
                className={classes.countBadge}
                style={{ backgroundColor: withAlpha(column.color, 0.16), color: column.color }}
              >
                {(projectsByColumn[column.id] || []).length}
              </span>
            </div>
            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  className={classes.columnContent}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {(projectsByColumn[column.id] || []).map((project, index) => (
                    <Draggable draggableId={String(project.id)} index={index} key={project.id}>
                      {(providedDraggable, snapshot) => (
                        <div
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          {...providedDraggable.dragHandleProps}
                          className={classes.card}
                          onClick={() => onProjectClick && onProjectClick(project)}
                          style={{
                            ...providedDraggable.draggableProps.style,
                            ...(snapshot.isDragging ? { boxShadow: '0 8px 24px rgba(0,0,0,0.25)', opacity: 0.95 } : {}),
                          }}
                        >
                          {onDelete && (
                            <IconButton
                              className={classes.cardDeleteBtn}
                              size="small"
                              aria-label="Excluir projeto"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(project);
                              }}
                            >
                              <DeleteIcon style={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                          <div className={classes.cardAccent} style={{ backgroundColor: column.color }} />
                          <div style={{ padding: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 4 }}>
                              <Typography variant="body2" className={classes.cardTitle} style={{ margin: 0, flex: 1, minWidth: 0 }}>
                                {project.name || "Sem nome"}
                              </Typography>
                              
                              <Tooltip
                                title={(project.company && (project.company.name || project.company.title)) || (project.companyId ? `Empresa #${project.companyId}` : 'Sem empresa')}
                                placement="top"
                                arrow
                              >
                                <ArrowIcon className={classes.cardLinkIcon} />
                              </Tooltip>
                            </div>

                            {(() => {
                              const responsibleId = project.userId || (project.user && project.user.id) || null;
                              const responsibleUser = resolveUserById(responsibleId);
                              if (!responsibleUser) return null;
                              const ownerName = responsibleUser.name || responsibleUser.fullName || responsibleUser.email;
                              const initials = String(ownerName).split(" ").slice(0,2).map(p => p[0]).join("").toUpperCase();
                              const src = avatarSrcForUser(responsibleUser);
                              return (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <Avatar src={src} className={classes.cardAvatarSm}>
                                        {!src && initials}
                                      </Avatar>
                                      <Typography variant="caption" className={classes.cardMeta} style={{ fontSize: 12 }}>
                                        {ownerName}
                                      </Typography>
                                    </div>
                                  </div>
                                  <div style={{ height: 1, background: '#E5E7EB', opacity: 0.8, margin: '6px 0' }} />
                                </>
                              );
                            })()}

                            <Typography variant="caption" className={classes.cardMeta} display="block">
                              {project.description ? (project.description.length > 38 ? project.description.substring(0, 38) + '...' : project.description) : t('modules.common.noDescription')}
                            </Typography>

                            <div className={classes.cardFooter}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CalendarIcon className={classes.calendarIconSm} />
                                <Typography variant="caption" className={classes.cardMeta}>
                                  {formatDate(project.createdAt || project.deadlineAt)}
                                </Typography>
                              </div>
                              {(() => {
                                const avatarUser = resolveUserById(project.createdById || project.creatorId || project.userId) || authUser || null;
                                const src = avatarSrcForUser(avatarUser);
                                const initials = avatarUser && (avatarUser.name || avatarUser.fullName || avatarUser.email)
                                  ? String(avatarUser.name || avatarUser.fullName || avatarUser.email).charAt(0).toUpperCase()
                                  : 'U';
                                return (
                                  <Avatar src={src} style={{ width: 18, height: 18 }}>
                                    {!src && initials}
                                  </Avatar>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {onAdd && (
                    <Button
                      fullWidth
                      size="small"
                      variant="text"
                      className={classes.addButton}
                      startIcon={<AddIcon />}
                      onClick={() => onAdd(column.id)}
                    >
                      {t('modules.projects.addProject')}
                    </Button>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default ProjectKanbanBoard;
