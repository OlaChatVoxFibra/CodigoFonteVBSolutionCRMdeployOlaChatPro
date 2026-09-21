/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useRef, useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Grid,
  Paper,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Button,
  Tooltip
} from '@material-ui/core';
import { MoreVert as MoreVertIcon, Add as AddIcon, DeleteOutline as DeleteIcon, CalendarTodayOutlined as CalendarIcon, AssignmentOutlined as AssignmentIcon, PhoneOutlined as PhoneIcon, MailOutline as MailIcon, EventOutlined as MeetingIcon, ChevronRightOutlined as ArrowIcon } from '@material-ui/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { AuthContext } from '../../context/Auth/AuthContext';
import { getBackendUrl } from '../../config';
import { activityDescriptionPreview } from '../../utils/cleanActivityDescription';

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
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(22,22,22,0.95)' : '#ffffffEE',
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

const KanbanBoard = ({ activities, onActivityClick, onAdd, onMove, onDelete, columns: columnsProp, statusResolver, users = [] }) => {
  const classes = useStyles();
  const boardRef = useRef(null);
  const isPanningRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [colPx, setColPx] = useState(0);
  const { user: authUser } = useContext(AuthContext) || {};
  const backendUrl = getBackendUrl && getBackendUrl();

  const columns = columnsProp || [
    { id: 'backlog', title: 'Backlog', color: '#4B5563' },
    { id: 'pending', title: 'Pendente', color: '#4B5563' },
    { id: 'in_progress', title: 'Em Progresso', color: '#F97316' },
    { id: 'completed', title: 'Concluído', color: '#10B981' }
  ];

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
      const w = inner > 0 ? Math.floor(inner / 4) : 260;
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

  // Função auxiliar para mapear status do backend para colunas
  const defaultStatusToColumn = (status) => {
    const s = String(status || '').toLowerCase();
    if (['backlog'].includes(s)) return 'backlog';
    if (['pendente','pending','a fazer','a_fazer'].includes(s)) return 'pending';
    if (['em progresso','in_progress','em_progresso','concluindo','concluding'].includes(s)) return 'in_progress';
    if (['concluído','concluido','completed','finalizado','finalizada'].includes(s)) return 'completed';
    return 'pending';
  };

  const getColumnId = useCallback((status) => {
    if (typeof statusResolver === 'function') {
      return statusResolver(status);
    }
    return defaultStatusToColumn(status);
  }, [statusResolver]);

  const activitiesByColumn = useMemo(() => {
    const grouped = {};
    const cols = Array.isArray(columns) ? columns : [];
    for (const col of cols) {
      const id = col?.id != null && String(col.id) !== "" ? String(col.id) : null;
      if (id) grouped[id] = [];
    }
    const fallbackCol =
      Object.keys(grouped)[0] ||
      (cols[0]?.id != null ? String(cols[0].id) : null);

    for (const activity of activities || []) {
      const colId = String(getColumnId(activity.status) || "");
      if (grouped[colId]) {
        grouped[colId].push(activity);
      } else if (fallbackCol && grouped[fallbackCol]) {
        grouped[fallbackCol].push(activity);
      }
    }
    return grouped;
  }, [activities, columns, getColumnId]);

  const formatDate = (value) => {
    if (!value) return 'Sem data';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      const monthsPtShort = ["jan.","fev.","mar.","abr.","mai.","jun.","jul.","ago.","set.","out.","nov.","dez."];
      const dd = String(d.getDate()).padStart(2, '0');
      const monthName = monthsPtShort[d.getMonth()] || '';
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${dd} de ${monthName}, ${hh}:${mi}`;
    } catch {
      return String(value);
    }
  };

  const renderTypeIcon = (type) => {
    const t = String(type || '').toLowerCase();
    const commonStyle = { fontSize: 16, color: '#6B7280' };
    if (t === 'task') return <AssignmentIcon style={commonStyle} />;
    if (t === 'call') return <PhoneIcon style={commonStyle} />;
    if (t === 'email') return <MailIcon style={commonStyle} />;
    if (t === 'meeting') return <MeetingIcon style={commonStyle} />;
    return <AssignmentIcon style={commonStyle} />;
  };

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

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (onMove) {
      const activityId = draggableId;
      onMove(activityId, source.droppableId, destination.droppableId, destination.index);
    }
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
                {(activitiesByColumn[column.id] || []).length}
              </span>
            </div>
            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  className={classes.columnContent}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {(activitiesByColumn[column.id] || []).map((activity, index) => (
                    <Draggable draggableId={String(activity.id)} index={index} key={activity.id}>
                      {(providedDraggable, snapshot) => (
                        <div
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          {...providedDraggable.dragHandleProps}
                          className={classes.card}
                          onClick={() => onActivityClick && onActivityClick(activity)}
                          style={{
                            ...providedDraggable.draggableProps.style,
                            ...(snapshot.isDragging ? { boxShadow: '0 8px 24px rgba(0,0,0,0.25)', opacity: 0.95 } : {}),
                          }}
                        >
                          {onDelete && (
                            <IconButton
                              className={classes.cardDeleteBtn}
                              size="small"
                              aria-label="Excluir atividade"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(activity);
                              }}
                            >
                              <DeleteIcon style={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                          <div className={classes.cardAccent} style={{ backgroundColor: column.color }} />
                          <div style={{ padding: 10 }}>
                            {(() => {
                              const projectObj = activity && activity.project;
                              const projectLabelFromObj = projectObj && typeof projectObj === 'object'
                                ? (projectObj.name || projectObj.title || '')
                                : '';
                              const projectLabel =
                                (activity && activity.projectName) ||
                                projectLabelFromObj ||
                                '';
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 4 }}>
                                  <Typography variant="body2" className={classes.cardTitle} style={{ margin: 0, flex: 1, minWidth: 0 }}>
                                    {activity.title || "Sem título"}
                                  </Typography>
                                  
                                  <Tooltip
                                    title={projectLabel || 'Sem projeto'}
                                    placement="top"
                                    arrow
                                  >
                                    <ArrowIcon className={classes.cardLinkIcon} />
                                  </Tooltip>
                                </div>
                              );
                            })()}
                            
                            {(() => {
                              const responsibleUser = resolveUserById(activity.userId);
                              if (!responsibleUser) return null;
                              const ownerName = (responsibleUser.name || responsibleUser.fullName || responsibleUser.email);
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
                                    <div style={{ marginLeft: 8 }}>
                                      {renderTypeIcon(activity.type)}
                                    </div>
                                  </div>
                                  <div className={classes.cardDivider} />
                                </>
                              );
                            })()}

                            <Typography variant="caption" className={classes.cardMeta} display="block">
                              {activityDescriptionPreview(activity.description)}
                            </Typography>

                            <div className={classes.cardFooter}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CalendarIcon className={classes.calendarIconSm} />
                                <Typography variant="caption" className={classes.cardMeta}>
                                  {formatDate(activity.date)}
                                </Typography>
                              </div>
                              {(() => {
                                const creatorId = activity.createdById || activity.creatorId || null;
                                const creatorUser = resolveUserById(creatorId) || authUser || null;
                                const src = avatarSrcForUser(creatorUser);
                                const initials = creatorUser && (creatorUser.name || creatorUser.fullName || creatorUser.email)
                                  ? String(creatorUser.name || creatorUser.fullName || creatorUser.email).charAt(0).toUpperCase()
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
                      Adicionar Tarefa
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

export default KanbanBoard;
