/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import KanbanColumn from './KanbanColumn';

const useStyles = makeStyles(theme => ({
  board: {
    display: 'flex',
    overflowX: 'auto',
    ...theme.scrollbarStyles,
    padding: theme.spacing(1),
  },
}));

const KanbanBoard = ({ lanes, onCardMove, onLaneReorder, updateTicket, isAdmin }) => {
  const classes = useStyles();

  const handleDragEnd = result => {
    if (!result.destination) return;

    const { source, destination, draggableId, type } = result;

    // Se for reordenação de lane
    if (type === 'LANE') {
      if (source.index !== destination.index) {
        onLaneReorder(source.index, destination.index);
      }
      return;
    }

    // Se for movimentação de card
    if (
      source.droppableId !== destination.droppableId ||
      source.index !== destination.index
    ) {
      onCardMove(
        draggableId,
        destination.droppableId,
        source.droppableId,
        source.index,
        destination.index
      );
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="lanes" direction="horizontal" type="LANE">
        {(provided, snapshot) => (
          <div 
            className={classes.board}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {lanes.map((lane, index) => (
              <KanbanColumn
                key={lane.id}
                id={lane.id}
                title={lane.title}
                tickets={lane.tickets}
                color={lane.color}
                index={index}
                updateTicket={updateTicket}
                isAdmin={isAdmin}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default KanbanBoard;
