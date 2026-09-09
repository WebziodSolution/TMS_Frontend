import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faClose } from '@fortawesome/free-solid-svg-icons';
import KanbanCard from './KanbanCard';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PermissionWrapper from '../../components/permissionWrapper/PermissionWrapper';

const getStatusIcon = (statusName) => {
    const name = statusName?.toLowerCase() || '';
    if (name.includes('done') || name.includes('complete')) return faCheck;
};

const KanbanColumn = ({
    status,
    tickets,
    onUpdateTitle,
    fetchTickets,
    selectedTicketIds = [],
    onToggleSelect,
    onBulkClose
}) => {
    const [bulkCloseConfirmOpen, setBulkCloseConfirmOpen] = useState(false);

    const selectedInColumn = tickets.filter(t => selectedTicketIds.includes(t.id));

    return (
        <Box
            sx={{
                flex: '0 0 300px', // Fixed width for each column
                height: '100%',
                minHeight: '300px',
                backgroundColor: '#F4F5F7',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                marginRight: '12px',
                '@media (max-width: 768px)': {
                    flex: '0 0 280px',
                    minWidth: '260px'
                }
            }}
        >
            <Box sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                        variant="overline"
                        sx={{
                            fontWeight: 700,
                            color: '#5E6C84',
                            fontSize: '12px',
                            letterSpacing: '0.05em'
                        }}
                    >
                        {status.name}
                    </Typography>
                    <Box sx={{
                        backgroundColor: '#EBECF0',
                        borderRadius: '4px',
                        p: 0.25,
                        minWidth: '20px',
                        textAlign: 'center'
                    }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#42526E' }}>
                            {tickets.length}
                        </Typography>
                    </Box>

                    {/* Show Close Ticket icon beside count when any ticket in this column is selected */}
                    {selectedInColumn.length > 0 && status.name?.toLowerCase() !== 'close' && (
                        <PermissionWrapper
                            functionalityName="manage tickets"
                            moduleName="Tickets"
                            actionId={3}
                            component={
                                <Tooltip title={`Close ${selectedInColumn.length} selected ticket${selectedInColumn.length > 1 ? 's' : ''}`} arrow placement="bottom">
                                    <IconButton
                                        size="small"
                                        onClick={() => setBulkCloseConfirmOpen(true)}
                                        sx={{
                                            padding: '2px',
                                            color: '#DE350B',
                                            '&:hover': { backgroundColor: 'rgba(222, 53, 11, 0.1)' }
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faClose} size="xs" />
                                    </IconButton>
                                </Tooltip>
                            }
                        />
                    )}
                </Box>
                {/* Visual indicator / Icon for the status */}
                <Box sx={{ color: '#016630' }}>
                    <FontAwesomeIcon icon={getStatusIcon(status.name)} size="sm" />
                </Box>
            </Box>

            <Droppable droppableId={String(status.id)}>
                {(provided, snapshot) => (
                    <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                            flexGrow: 1,
                            minHeight: '20px',
                            overflowY: 'auto',
                            transition: 'background-color 0.2s ease',
                            backgroundColor: snapshot.isDraggingOver ? '#EBECF0' : 'transparent',
                            borderRadius: '4px',
                            padding: '4px',
                            '&::-webkit-scrollbar': {
                                width: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: '#DFE1E6',
                                borderRadius: '3px',
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                background: '#C1C7D0',
                            },
                        }}
                    >
                        {tickets.map((ticket, index) => (
                            <KanbanCard
                                key={ticket.id}
                                ticket={ticket}
                                index={index}
                                onUpdateTitle={onUpdateTitle}
                                fetchTickets={fetchTickets}
                                isSelected={selectedTicketIds.includes(ticket.id)}
                                onToggleSelect={onToggleSelect}
                            />
                        ))}
                        {provided.placeholder}
                    </Box>
                )}
            </Droppable>

            <ConfirmDialog
                open={bulkCloseConfirmOpen}
                onClose={() => setBulkCloseConfirmOpen(false)}
                onConfirm={() => {
                    const ids = selectedInColumn.map(t => t.id);
                    if (onBulkClose) {
                        onBulkClose(ids, status.name);
                    }
                    setBulkCloseConfirmOpen(false);
                }}
                title="Close Tickets"
                description={`Are you sure you want to close the selected ${selectedInColumn.length} ticket${selectedInColumn.length > 1 ? 's' : ''} in "${status.name}"?`}
                confirmText="Close Tickets"
                isDestructive={true}
            />
        </Box>
    );
};

export default KanbanColumn;