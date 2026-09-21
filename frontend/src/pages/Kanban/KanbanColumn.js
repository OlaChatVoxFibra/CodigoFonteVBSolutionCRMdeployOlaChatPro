/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import KanbanCard from './KanbanCard';
import { Typography, IconButton } from '@material-ui/core';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';

const useStyles = makeStyles(theme => ({
  column: props => ({
    backgroundColor: props.color || '#ebecf0',
    borderRadius: 8,
    minWidth: 272,
    maxWidth: 272,
    padding: theme.spacing(1),
    marginRight: theme.spacing(1),
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  }),
  columnTitle: {
    marginBottom: theme.spacing(1),
    fontWeight: 'bold',
    fontSize: '1rem',
    color: "#D6D6D6",
  },
  cardList: {
    flexGrow: 1,
    overflowY: 'auto',
    ...theme.scrollbarStyles,
    maxHeight: 'calc(100vh - 200px)',
  },
  totalValue: {
    fontSize: '1rem',
    color: "#D6D6D6",
    fontWeight: 'bold',
  },
  columnHeader: {
    marginBottom: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dragHandle: {
    cursor: 'grab',
    color: 'rgba(255, 255, 255, 0.7)',
    padding: theme.spacing(0.5),
    '&:hover': {
      color: 'rgba(255, 255, 255, 1)',
    },
  },
  columnContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
}));

const KanbanColumn = ({ id, title, tickets, color, index, updateTicket, isAdmin }) => {
  const classes = useStyles({ color });

  const totalValue = tickets.reduce((acc, ticket) => {
    const customFields = ticket.contact.extraInfo || [];
    const valueField = customFields.find(field => field.name === 'valor');
    const opportunityValue = valueField ? parseFloat(valueField.value) : 0;
    return acc + opportunityValue;
  }, 0);

  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => (
        <div
          className={classes.column}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div className={classes.columnHeader}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {isAdmin && (
                <div
                  {...provided.dragHandleProps}
                  className={classes.dragHandle}
                >
                  <DragIndicatorIcon fontSize="small" />
                </div>
              )}
              <Typography className={classes.columnTitle}>{title}</Typography>
            </div>
            <Typography className={classes.totalValue}>
              Total: R$ {totalValue.toFixed(2)}
            </Typography>
          </div>
          <Droppable droppableId={id} type="CARD">
            {(provided, snapshot) => (
              <div
                className={classes.cardList}
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {tickets.map((ticket, index) => (
                  <KanbanCard
                    key={ticket.id}
                    ticket={ticket}
                    index={index}
                    updateTicket={updateTicket}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanColumn;
