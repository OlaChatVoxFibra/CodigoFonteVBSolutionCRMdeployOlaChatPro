/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import api from '../../services/api';
import { AuthContext } from '../../context/Auth/AuthContext';
import { toast } from 'react-toastify';
import { i18n } from '../../translate/i18n';
import { useHistory } from 'react-router-dom';
import { setKanbanLaneOrder, getKanbanLaneOrder } from '../../services/companyKanbanService';
import { Button, TextField, Paper, FormControl, InputLabel, Select, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemIcon, ListItemText, IconButton } from '@material-ui/core';
import { format } from 'date-fns';
import { Can } from '../../components/Can';
import MainContainer from '../../components/MainContainer';
import MainHeader from '../../components/MainHeader';
import MainHeaderButtonsWrapper from '../../components/MainHeaderButtonsWrapper';
import Title from '../../components/Title';
import KanbanBoard from './KanbanBoard';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';
import CloseIcon from '@material-ui/icons/Close';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    display: 'flex',
    padding: theme.spacing(1),
    overflowX: 'auto',
    ...theme.scrollbarStyles,
    borderRadius: '10px',
    backgroundColor: theme.palette.listScrollArea,
    maxWidth: 1200,
    margin: '0 auto',
  },
  button: {
    borderRadius: '10px',
  },
  dateInput: {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
    },
    marginRight: theme.spacing(1),
  },
  sortSelect: {
    minWidth: 150,
    marginRight: theme.spacing(1),
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
    },
  },
}));

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user, socket } = useContext(AuthContext);
  const [tags, setTags] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [lanes, setLanes] = useState([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queueIds = user.queues.map(queue => queue.UserQueue.queueId);

  const [sortOrder, setSortOrder] = useState(() => {
    return localStorage.getItem('sortOrder') || 'ticketNumber';
  });

  const [laneOrder, setLaneOrder] = useState(null);
  const [loadingLaneOrder, setLoadingLaneOrder] = useState(true);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [pipelineItems, setPipelineItems] = useState([]);

  useEffect(() => {
    localStorage.setItem('sortOrder', sortOrder);
  }, [sortOrder]);

  // Carregar ordem das lanes do banco de dados
  useEffect(() => {
    const loadLaneOrder = async () => {
      try {
        const savedOrder = await getKanbanLaneOrder();
        setLaneOrder(savedOrder);
      } catch (error) {
        console.error('Erro ao carregar ordem das lanes:', error);
      } finally {
        setLoadingLaneOrder(false);
      }
    };

    if (user && user.id) {
      loadLaneOrder();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTags = async () => {
    try {
      const response = await api.get('/tag/kanban/');
      const fetchedTags = response.data.lista || [];
      setTags(fetchedTags);
      fetchTickets(fetchedTags);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTickets = async (fetchedTags = tags) => {
    try {
      const { data } = await api.get('/ticket/kanban', {
        params: {
          queueIds: JSON.stringify(queueIds),
          startDate: startDate,
          endDate: endDate,
        },
      });
      setTickets(data.tickets);
      organizeLanes(fetchedTags, data.tickets);
    } catch (err) {
      console.log(err);
      setTickets([]);
    }
  };

  useEffect(() => {
    if (!socket || !user?.companyId) return;
    const companyId = user.companyId;

    const onAppMessage = data => {
      if (['create', 'update', 'delete'].includes(data.action)) {
        fetchTickets();
      }
    };

    socket.on(`company-${companyId}-ticket`, onAppMessage);
    socket.on(`company-${companyId}-appMessage`, onAppMessage);

    return () => {
      socket.off(`company-${companyId}-ticket`, onAppMessage);
      socket.off(`company-${companyId}-appMessage`, onAppMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user.companyId]);

  const handleSearchClick = () => {
    fetchTickets();
  };

  const handleStartDateChange = event => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = event => {
    setEndDate(event.target.value);
  };

  const updateTicket = updatedTicket => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    );
  };

  const getOpportunityValue = (ticket) => {
    const customFields = ticket.contact.extraInfo || [];
    const valueField = customFields.find(field => field.name === 'valor');
    const opportunityValue = valueField ? parseFloat(valueField.value) : 0;
    return opportunityValue;
  };

  const organizeLanes = (fetchedTags = tags, fetchedTickets = tickets) => {
    const sortedTickets = [...fetchedTickets];

    if (sortOrder === 'ticketNumber') {
      sortedTickets.sort((a, b) => a.id - b.id);
    } else if (sortOrder === 'lastMessageTime') {
      sortedTickets.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    } else if (sortOrder === 'valorDesc') {
      sortedTickets.sort((a, b) => {
        const valorA = getOpportunityValue(a);
        const valorB = getOpportunityValue(b);
        return valorB - valorA;
      });
    }

    const defaultTickets = sortedTickets.filter(
      ticket => ticket.tags.length === 0
    );

    const lanesData = [
      {
        id: 'lane0',
        title: i18n.t('tagsKanban.laneDefault'),
        tickets: defaultTickets,
        color: '#757575',
      },
      ...fetchedTags.map(tag => {
        const taggedTickets = sortedTickets.filter(ticket =>
          ticket.tags.some(t => t.id === tag.id)
        );
        return {
          id: tag.id.toString(),
          title: tag.name,
          tickets: taggedTickets,
          color: tag.color || '#757575',
        };
      }),
    ];

    // Aplicar ordem personalizada se existir
    if (laneOrder && laneOrder.length > 0) {
      const orderedLanes = [];
      const laneMap = new Map(lanesData.map(lane => [lane.id, lane]));
      
      // Adicionar lanes na ordem salva
      laneOrder.forEach(laneId => {
        if (laneMap.has(laneId)) {
          orderedLanes.push(laneMap.get(laneId));
          laneMap.delete(laneId);
        }
      });
      
      // Adicionar lanes restantes (novas lanes que não estavam na ordem salva)
      laneMap.forEach(lane => orderedLanes.push(lane));
      
      setLanes(orderedLanes);
    } else {
      setLanes(lanesData);
    }
  };

  useEffect(() => {
    if (!loadingLaneOrder) {
      organizeLanes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, tickets, sortOrder, laneOrder, loadingLaneOrder]);

  const openPipelineModal = () => {
    // Montar lista local com {id, title}
    const items = lanes.map(l => ({ id: l.id, title: l.title }));
    setPipelineItems(items);
    setPipelineModalOpen(true);
  };

  const closePipelineModal = () => setPipelineModalOpen(false);

  const handlePipelineDragEnd = (result) => {
    if (!result.destination) return;
    const src = result.source.index;
    const dst = result.destination.index;
    if (src === dst) return;
    const next = Array.from(pipelineItems);
    const [moved] = next.splice(src, 1);
    next.splice(dst, 0, moved);
    setPipelineItems(next);
  };

  const handleSavePipelineOrder = () => {
    const newOrder = pipelineItems.map(i => i.id);
    // Otimista: aplica imediatamente e fecha modal; salva em background
    setLaneOrder(newOrder);
    const laneMap = new Map(lanes.map(l => [l.id, l]));
    const newLanes = [];
    newOrder.forEach(id => {
      if (laneMap.has(id)) {
        newLanes.push(laneMap.get(id));
        laneMap.delete(id);
      }
    });
    laneMap.forEach(l => newLanes.push(l));
    setLanes(newLanes);
    closePipelineModal();
    // Salvar no backend sem bloquear a UI
    setKanbanLaneOrder(newOrder)
      .then(() => {
        toast.success('Ordem da pipeline salva');
      })
      .catch((e) => {
        console.error(e);
        toast.error('Erro ao salvar a ordem da pipeline');
      });
  };

  const handleCardMove = async (ticketId, targetLaneId) => {
    ticketId = parseInt(ticketId, 10);
    try {
      await api.delete(`/ticket-tags/${ticketId}`);

      if (targetLaneId !== 'lane0') {
        await api.put(`/ticket-tags/${ticketId}/${targetLaneId}`);
        toast.success('Ticket Tag atualizado com sucesso!');
      } else {
        toast.success('Ticket Tag removido!');
      }

      fetchTickets();
    } catch (err) {
      console.log(err);
    }
  };

  const handleAddColumnClick = () => {
    history.push('/tagsKanban');
  };

  const handleSortOrderChange = event => {
    setSortOrder(event.target.value);
  };

  const handleLaneReorder = async (sourceIndex, destinationIndex) => {
    // Verificar se o usuário é admin
    if (user.profile !== 'admin') {
      toast.error('Apenas administradores podem reordenar as lanes do Kanban');
      return;
    }

    const newLanes = Array.from(lanes);
    const [reorderedLane] = newLanes.splice(sourceIndex, 1);
    newLanes.splice(destinationIndex, 0, reorderedLane);
    
    setLanes(newLanes);
    
    // Salvar nova ordem no banco de dados
    const newLaneOrder = newLanes.map(lane => lane.id);
    setLaneOrder(newLaneOrder);
    
    try {
      await setKanbanLaneOrder(newLaneOrder);
      toast.success('Ordem das lanes atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao salvar ordem das lanes:', error);
      toast.error('Erro ao salvar ordem das lanes');
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t('Kanban')}</Title>
        <MainHeaderButtonsWrapper>
          <FormControl
            variant="outlined"
            size="small"
            className={classes.sortSelect}
          >
            <InputLabel htmlFor="sort-order-select">Ordenar por</InputLabel>
            <Select
              native
              value={sortOrder}
              onChange={handleSortOrderChange}
              label="Ordenar por"
              inputProps={{
                name: 'sortOrder',
                id: 'sort-order-select',
              }}
            >
              <option value="ticketNumber">Número do Ticket</option>
              <option value="lastMessageTime">Última Mensagem</option>
              <option value="valorDesc">Valor (maior para menor)</option>
            </Select>
          </FormControl>
          <TextField
            label="Data de início"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            InputLabelProps={{
              shrink: true,
            }}
            variant="outlined"
            className={classes.dateInput}
            size="small"
          />
          <TextField
            label="Data de fim"
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            InputLabelProps={{
              shrink: true,
            }}
            variant="outlined"
            className={classes.dateInput}
            size="small"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearchClick}
            className={classes.button}
          >
            Buscar
          </Button>
          {user.profile === 'admin' && (
            <Button
              variant="contained"
              color="primary"
              onClick={openPipelineModal}
              className={classes.button}
            >
              Configurar Pipeline
            </Button>
          )}
          <Can
            role={user.profile}
            perform="dashboard:view"
            yes={() => (
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddColumnClick}
                className={classes.button}
              >
                + Adicionar colunas
              </Button>
            )}
          />
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" className={classes.mainPaper}>
        <KanbanBoard
          lanes={lanes}
          onCardMove={handleCardMove}
          onLaneReorder={handleLaneReorder}
          updateTicket={updateTicket}
          isAdmin={user.profile === 'admin'}
        />
      </Paper>

      {/* Modal de Configuração da Pipeline (reordenar etapas) */}
      <Dialog open={pipelineModalOpen} onClose={closePipelineModal} maxWidth="xs" fullWidth>
        <DialogTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Configure sua Pipeline
          <IconButton onClick={closePipelineModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
            Arraste o ícone para reordenar as etapas (colunas).
          </div>
          <DragDropContext onDragEnd={handlePipelineDragEnd}>
            <Droppable droppableId="pipeline-list" type="ROW">
              {(provided) => (
                <List ref={provided.innerRef} {...provided.droppableProps} dense>
                  {pipelineItems.map((item, index) => (
                    <Draggable draggableId={String(item.id)} index={index} key={String(item.id)}>
                      {(prov, snapshot) => (
                        <ListItem
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          style={{
                            ...prov.draggableProps.style,
                            border: '1px solid #e0e0e0',
                            borderRadius: 8,
                            marginBottom: 8,
                            background: snapshot.isDragging ? '#f5f5f5' : '#fff'
                          }}
                        >
                          <ListItemIcon {...prov.dragHandleProps}>
                            <DragIndicatorIcon style={{ cursor: 'grab' }} />
                          </ListItemIcon>
                          <ListItemText primary={item.title} />
                        </ListItem>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </List>
              )}
            </Droppable>
          </DragDropContext>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePipelineModal}>Cancelar</Button>
          <Button color="primary" variant="contained" onClick={handleSavePipelineOrder}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default Kanban;
