import { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { Box, Typography, Button } from '@mui/material';
import { connect } from 'react-redux';
import { useForm } from 'react-hook-form';
import { getAllStatuses } from '../../services/statusService';
import { updateTicket, updateTicketStatus, updateTicketTitle } from '../../services/ticketService';
import { setAlert } from '../../redux/commonReducers/commonReducers';
import KanbanColumn from './KanbanColumn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import StatusFormDialog from '../Status/StatusFormDialog';
import PermissionWrapper from '../../components/permissionWrapper/PermissionWrapper';
import { getUserDetails } from '../../utils/getUserDetails';
import CustomModalWrapper from '../../components/common/CustomModalWrapper';
import CustomCheckbox from '../../components/common/CustomCheckbox';
import { TICKET_VARIFICATION } from '../../utils/constants';
import { createTicketLog } from '../../services/ticketLogService';

const KanbanBoard = ({ tickets, fetchTickets, setAlert, onAddTicket }) => {
    const userData = getUserDetails();
    const [statuses, setStatuses] = useState([]);
    const [boardData, setBoardData] = useState({});
    const [openDialog, setOpenDialog] = useState(false);

    // Verification Modal States
    const [openVerificationModal, setOpenVerificationModal] = useState(false);
    const [isSavingVerification, setIsSavingVerification] = useState(false);
    const [pendingDragResult, setPendingDragResult] = useState(null);

    const verificationForm = useForm({
        defaultValues: {
            varification: []
        }
    });

    const handleOpen = () => {
        setOpenDialog(true);
    };

    const handleClose = () => {
        setOpenDialog(false);
    };

    const loadStatuses = async () => {
        try {
            const res = await getAllStatuses();
            // Assumes res.result is an array of statuses
            setStatuses(res.result?.reverse() || []);
        } catch (err) {
            setAlert({ open: true, message: "Failed to load statuses", type: "error" });
        }
    };

    useEffect(() => {
        loadStatuses();
    }, [setAlert]);

    useEffect(() => {
        if (statuses.length > 0) {
            const grouped = {};
            statuses.forEach(status => {
                grouped[status.id] = tickets.filter(t => t.status_id === status.id);
            });
            setBoardData(grouped);
        }
    }, [tickets, statuses]);

    const executeStatusUpdate = async (ticketId, destinationStatusId, sourceStatusId, sourceIndex, destinationIndex, internalQa = null) => {
        // Optimistic UI update
        const newBoardData = { ...boardData };
        const sourceColumn = [...newBoardData[sourceStatusId]];
        const [movedTicket] = sourceColumn.splice(sourceIndex, 1);

        const destinationColumn = [...newBoardData[destinationStatusId]];
        destinationColumn.splice(destinationIndex, 0, { ...movedTicket, status_id: parseInt(destinationStatusId) });

        newBoardData[sourceStatusId] = sourceColumn;
        newBoardData[destinationStatusId] = destinationColumn;

        setBoardData(newBoardData);

        // API Call
        try {
            const res = await updateTicketStatus(ticketId, parseInt(destinationStatusId), internalQa);
            if (res.status !== 200) {
                throw new Error(res.message || "Failed to update status");
            }
            fetchTickets(); // Refresh to ensure sync
        } catch (err) {
            setAlert({ open: true, message: err.message, type: "error" });
            fetchTickets(); // Rollback UI by re-fetching
        }
    };

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const sourceStatusId = source.droppableId;
        const destinationStatusId = destination.droppableId;
        const ticketId = draggableId;

        const destinationStatusObj = statuses.find(s => String(s.id) === String(destinationStatusId));
        const destinationStatusName = destinationStatusObj ? destinationStatusObj.name : "";
        const normalizedStatusName = destinationStatusName.trim().toLowerCase();

        const isAdmin = userData?.rolename === "Administrator" || userData?.rolename === "Admin" || userData?.role_id === 1;
        const requiresVerification = !isAdmin && (normalizedStatusName === 'done' || normalizedStatusName === 'client review');

        if (requiresVerification) {
            setPendingDragResult({ ticketId, destinationStatusId, sourceStatusId, sourceIndex: source.index, destinationIndex: destination.index });
            const initialVerif = {};
            TICKET_VARIFICATION.forEach(item => {
                initialVerif[`verif_${item.value}`] = false;
            });
            verificationForm.reset(initialVerif);
            setOpenVerificationModal(true);
            return;
        }

        await executeStatusUpdate(ticketId, destinationStatusId, sourceStatusId, source.index, destination.index);
    };

    const handleVerificationSubmit = async (verifData) => {
        const selectedLabels = TICKET_VARIFICATION
            .filter(item => verifData[`verif_${item.value}`])
            .map(item => item.label);

        if (selectedLabels.length === 0) {
            setAlert({ open: true, message: "Please select at least one verification check.", type: "warning" });
            return;
        }

        setIsSavingVerification(true);
        try {
            setOpenVerificationModal(false);
            if (pendingDragResult) {
                await executeStatusUpdate(
                    pendingDragResult.ticketId,
                    pendingDragResult.destinationStatusId,
                    pendingDragResult.sourceStatusId,
                    pendingDragResult.sourceIndex,
                    pendingDragResult.destinationIndex,
                    selectedLabels
                );
            }
        } catch (err) {
            console.error(err);
            setAlert({ open: true, message: err.message || "Error storing verification.", type: "error" });
        } finally {
            setIsSavingVerification(false);
        }
    };

    const handleCloseVerificationModal = () => {
        setOpenVerificationModal(false);
        setPendingDragResult(null);
    };

    const handleUpdateTitle = async (ticketId, newTitle) => {
        try {
            const res = await updateTicketTitle(ticketId, newTitle);
            if (res.status === 200) {
                fetchTickets();
            } else {
                setAlert({ open: true, message: res.message || "Failed to update title", type: "error" });
            }
        } catch (err) {
            setAlert({ open: true, message: "Error updating title", type: "error" });
        }
    };

    return (
        <Box
            sx={{
                overflowX: 'auto',
                overflowY: 'hidden',
                paddingBottom: '10px',
                height: 'calc(100vh - 200px)',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <DragDropContext onDragEnd={onDragEnd}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'stretch',
                        padding: '4px',
                        height: '100%'
                    }}
                >
                    {statuses?.map(status => (
                        <KanbanColumn
                            key={status.id}
                            status={status}
                            tickets={boardData[status.id] || []}
                            onUpdateTitle={handleUpdateTitle}
                            fetchTickets={fetchTickets}
                        />
                    ))}

                    {/* Add Column button placeholder if needed or just padding */}
                    <PermissionWrapper
                        functionalityName="manage ticket status"
                        moduleName="Status"
                        actionId={1}
                        component={
                            <Box
                                sx={{
                                    flex: '0 0 280px',
                                    padding: '12px',
                                    cursor: 'pointer',
                                    alignSelf: 'flex-start',
                                    color: '#5E6C84',
                                    '&:hover': { color: '#172B4D', backgroundColor: 'rgba(9, 30, 66, 0.08)', borderRadius: '8px' }
                                }}
                                onClick={() => handleOpen()}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FontAwesomeIcon icon={faPlus} size="sm" />
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Add Column</Typography>
                                </Box>
                            </Box>
                        }
                    />
                </Box>
            </DragDropContext>
            <StatusFormDialog
                open={openDialog}
                onClose={handleClose}
                onSuccess={() => {
                    loadStatuses();
                    handleClose();
                }}
            />

            {/* Ticket Verification Modal */}
            <CustomModalWrapper
                open={openVerificationModal}
                onClose={handleCloseVerificationModal}
                title="Ticket Verification"
                onSubmit={verificationForm.handleSubmit(handleVerificationSubmit)}
                isSubmitting={isSavingVerification}
                submitText="Submit & Save Ticket"
                maxWidth="md"
            >
                <div className="space-y-4">
                    <p className="text-slate-600 mb-4 font-medium text-sm">
                        Please select the verification checks performed for this ticket before status update.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
                        {TICKET_VARIFICATION.map((item) => (
                            <CustomCheckbox
                                key={item.value}
                                name={`verif_${item.value}`}
                                control={verificationForm.control}
                                label={item.label}
                            />
                        ))}
                    </div>
                </div>
            </CustomModalWrapper>
        </Box>
    );
};

const mapDispatchToProps = {
    setAlert
};

export default connect(null, mapDispatchToProps)(KanbanBoard);