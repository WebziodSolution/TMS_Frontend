import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, Paper, Avatar, AvatarGroup, Divider,
    CircularProgress, Tooltip, IconButton, FormControlLabel, Radio, RadioGroup,
    Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faCalendarAlt, faClock, faFolder, faBuilding,
    faUser, faUsers, faTag, faDownload, faFileAlt, faComments,
    faPaperclip, faExclamationTriangle, faLink, faCheck, faInfoCircle,
    faEdit, faSave, faPlay, faPause, faTasks, faHistory
} from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getTicketById, updateTicket, updateAssigneeSendMail, getTicketsByProjectId } from '../../services/ticketService';
import { getTicketComments } from '../../services/ticketCommentService';
import { updateTicketAssignees } from '../../services/assignedTicketService';
import { getAllProjects } from '../../services/projectService';
import { getAllDepartments, getDepartmentHierarchy } from '../../services/departmentService';
import CommentSection from '../../components/common/CommentSection/CommentSection';
import { connect } from 'react-redux';
import { setAlert } from '../../redux/commonReducers/commonReducers';
import { getUserDetails } from '../../utils/getUserDetails';
import PermissionWrapper from '../../components/permissionWrapper/PermissionWrapper';
import { TICKET_TYPES } from '../../utils/constants';

import { useForm, Controller } from 'react-hook-form';
import CustomInput from '../../components/common/CustomInput';
import CustomSelect from '../../components/common/CustomSelect';
import RichTextEditor from '../../components/common/RichTextEditor';
import DragDropAttachmentUpload from '../../components/common/DragDropAttachmentUpload';
import HierarchySelect from '../../components/common/HierarchySelect';
import DatePickerComponent from '../../components/common/datePickerComponent';
import { getUserHierarchy, getAllUsers, getCustomers } from '../../services/userService';
import { getAllStatuses } from '../../services/statusService';
import { deleteTicketAttachment, uploadTicketAttachment } from '../../services/ticketAttachmentService';
import { upsertTodayTicketWork, getTodayTicketWork } from '../../services/todayTicketWorkService';
import { checkCurrentWork, executeTicketLogAction, getActiveTicketLogs, getTicketLogHistory } from '../../services/ticketLogService';
import ReasonModal from './ReasonModal';

dayjs.extend(relativeTime);

const TimerDisplay = ({ timerState, initialSeconds, activeLog, clockOffset }) => {
    const [seconds, setSeconds] = useState(initialSeconds);

    useEffect(() => {
        setSeconds(initialSeconds);
    }, [initialSeconds]);

    useEffect(() => {
        if (timerState !== 'running' || !activeLog) {
            return;
        }

        const startTime = dayjs(activeLog.start_time);
        const updateTimer = () => {
            const adjustedNow = dayjs(new Date().getTime() + clockOffset);
            const diff = adjustedNow.diff(startTime, 'second');
            setSeconds(Math.max(0, initialSeconds + diff));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [timerState, activeLog, clockOffset, initialSeconds]);

    const formatTime = (totalSecs) => {
        const secs = Math.max(0, totalSecs);
        const hrs = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return [hrs, mins, s].map(v => v < 10 ? "0" + v : v).join(":");
    };

    return (
        <div className="font-mono text-3xl font-bold tracking-wider text-slate-800 select-none">
            {formatTime(seconds)}
        </div>
    );
};

const TicketViewPage = ({ setAlert }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const userData = getUserDetails();

    // Today's Work State
    const [workHours, setWorkHours] = useState('0');
    const [workMinutes, setWorkMinutes] = useState('00');
    const [workNote, setWorkNote] = useState('');
    const [isSavingWork, setIsSavingWork] = useState(false);

    // Time Tracker States
    const [timerLogs, setTimerLogs] = useState([]);
    const [timerState, setTimerState] = useState('stopped'); // 'stopped', 'running', 'paused'
    const [accumulatedSeconds, setAccumulatedSeconds] = useState(0);
    const [activeTimerLog, setActiveTimerLog] = useState(null);
    const [isTimerActionLoading, setIsTimerActionLoading] = useState(false);
    const [disabledStartButton, setDisabledStartButton] = useState(false)

    // Reason Modal States
    const [openReasonModal, setOpenReasonModal] = useState(false);
    const [reasonModalConfig, setReasonModalConfig] = useState({
        title: '',
        description: '',
        submitText: '',
        action: ''
    });

    // Timer History States
    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const clockOffsetRef = useRef(0);

    const formatTime = (seconds) => {
        const totalSecs = Math.max(0, seconds);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        return [hrs, mins, secs].map(v => v < 10 ? "0" + v : v).join(":");
    };

    const getLogDuration = (log) => {
        if (log.status === 1) {
            const start = dayjs(log.start_time);
            const adjustedNow = dayjs(new Date().getTime() + clockOffsetRef.current);
            const diffSecs = adjustedNow.diff(start, 'second');
            return formatTime(diffSecs);
        } else if (log.start_time && log.end_time) {
            const start = dayjs(log.start_time);
            const end = dayjs(log.end_time);
            const diffSecs = end.diff(start, 'second');
            return formatTime(diffSecs);
        }
        return "-";
    };

    const formatDateTime = (dtStr) => {
        if (!dtStr) return '-';
        return dayjs(dtStr).format('DD-MMM-YYYY hh:mm:ss A');
    };

    const fetchHistoryLogs = async () => {
        if (!id || !userData?.id) return;
        setIsHistoryLoading(true);
        try {
            const res = await getTicketLogHistory(id);
            if (res.status === 200) {
                setHistoryLogs(res.result || []);
            } else {
                setAlert({ message: "Failed to fetch timer history", severity: "error" });
            }
        } catch (err) {
            console.error("Failed to load history logs", err);
            setAlert({ message: "Failed to load timer history", severity: "error" });
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleOpenHistoryModal = () => {
        setOpenHistoryModal(true);
        fetchHistoryLogs();
    };

    const groupLogsByDate = (logs) => {
        const groups = {};
        logs.forEach(log => {
            if (!log.start_time) return;
            const localDateStr = dayjs(log.start_time).format('YYYY-MM-DD');
            if (!groups[localDateStr]) {
                groups[localDateStr] = {
                    date: localDateStr,
                    logs: [],
                    totalSeconds: 0
                };
            }
            groups[localDateStr].logs.push(log);

            // Calculate duration in seconds
            let seconds = 0;
            if (log.status === 1) {
                const start = dayjs(log.start_time);
                const adjustedNow = dayjs(new Date().getTime() + clockOffsetRef.current);
                seconds = adjustedNow.diff(start, 'second');
            } else if (log.start_time && log.end_time) {
                const start = dayjs(log.start_time);
                const end = dayjs(log.end_time);
                seconds = end.diff(start, 'second');
            }
            groups[localDateStr].totalSeconds += Math.max(0, seconds);
        });

        return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
    };

    const fetchTimerLogs = async () => {
        if (!id || !userData?.id) return;
        try {
            const res = await getActiveTicketLogs(id);
            if (res.status === 200) {
                const logs = res.result?.logs || [];
                const serverTimeStr = res.result?.server_time;
                setTimerLogs(logs);

                if (serverTimeStr) {
                    const serverTime = new Date(serverTimeStr).getTime();
                    const clientTime = new Date().getTime();
                    clockOffsetRef.current = serverTime - clientTime;
                }

                let total = 0;
                let activeLog = null;

                logs.forEach(log => {
                    if (log.status === 2) {
                        const start = dayjs(log.start_time);
                        const end = dayjs(log.end_time);
                        total += end.diff(start, 'second');
                    } else if (log.status === 1) {
                        activeLog = log;
                    }
                });

                setAccumulatedSeconds(total);
                setActiveTimerLog(activeLog);

                if (activeLog) {
                    setTimerState('running');
                } else if (logs.length > 0) {
                    setTimerState('paused');
                } else {
                    setTimerState('stopped');
                }
            }
        } catch (err) {
            console.error("Failed to load timer logs", err);
        }
    };

    const handleStartTimer = async () => {
        setIsTimerActionLoading(true);
        try {
            const res = await executeTicketLogAction(parseInt(id, 10), 'start');
            if (res.status === 200) {
                setAlert({ open: true, message: "Timer started!", type: "success" });
                await fetchTimerLogs();
            } else {
                setAlert({ open: true, message: res.message || "Failed to start timer", type: "error" });
            }
        } catch (err) {
            setAlert({ open: true, message: "Error starting timer", type: "error" });
        } finally {
            setIsTimerActionLoading(false);
        }
    };

    const handlePauseTimerClick = () => {
        setReasonModalConfig({
            title: "Pause Session",
            description: "Enter a reason/note to pause this work session.",
            submitText: "Pause",
            action: "pause"
        });
        setOpenReasonModal(true);
    };

    const handleResumeTimer = async () => {
        setIsTimerActionLoading(true);
        try {
            const res = await executeTicketLogAction(parseInt(id, 10), 'resume');
            if (res.status === 200) {
                setAlert({ open: true, message: "Timer resumed!", type: "success" });
                await fetchTimerLogs();
            } else {
                setAlert({ open: true, message: res.message || "Failed to resume timer", type: "error" });
            }
        } catch (err) {
            setAlert({ open: true, message: "Error resuming timer", type: "error" });
        } finally {
            setIsTimerActionLoading(false);
        }
    };

    const handleCompleteTimerClick = () => {
        setReasonModalConfig({
            title: "Complete Session",
            description: "Enter a reason/note to save and complete this work session.",
            submitText: "Complete",
            action: "complete"
        });
        setOpenReasonModal(true);
    };

    const handleReasonSubmit = async (reason) => {
        setIsTimerActionLoading(true);
        try {
            const res = await executeTicketLogAction(
                parseInt(id, 10),
                reasonModalConfig.action,
                reason
            );
            if (res.status === 200) {
                setAlert({ open: true, message: `Session '${reasonModalConfig.action}' successfully!`, type: "success" });
                setOpenReasonModal(false);
                await fetchTimerLogs();
                await handleCheckCurrentWork();
            } else {
                setAlert({ open: true, message: res.message || "Action failed", type: "error" });
            }
        } catch (err) {
            setAlert({ open: true, message: "Error performing timer action", type: "error" });
        } finally {
            setIsTimerActionLoading(false);
        }
    };

    const handleCheckCurrentWork = async () => {
        try {
            const res = await checkCurrentWork();
            if (res.status === 200 && res.result) {
                setDisabledStartButton(res.result)
            } else {
                setDisabledStartButton(res.result)
            }
        } catch (err) {
            setDisabledStartButton(res.result)
            setAlert({ open: true, message: "Error fetching current work", type: "error" });
        }
    };

    const hourOptions = Array.from({ length: 11 }, (_, i) => String(i));
    const minuteOptions = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

    const fetchTodayWork = async () => {
        if (!userData?.id || !id) return;
        try {
            const todayStr = dayjs().format('YYYY-MM-DD');
            const res = await getTodayTicketWork(userData.id, id, todayStr);
            if (res.status === 200 && res.result && res.result.length > 0) {
                const log = res.result[0];
                setWorkHours(log.hours || '0');
                setWorkMinutes(log.minutes || '00');
                setWorkNote(log.note || '');
            } else {
                setWorkHours('0');
                setWorkMinutes('00');
                setWorkNote('');
            }
        } catch (err) {
            console.error("Failed to load today's work details", err);
        }
    };

    const handleSaveTodayWork = async () => {
        if (!id || !userData?.id) return;

        if (parseInt(workHours, 10) === 0 && parseInt(workMinutes, 10) === 0) {
            setAlert({ open: true, message: "Please specify work duration.", type: "warning" });
            return;
        }

        setIsSavingWork(true);
        try {
            const todayStr = dayjs().format('YYYY-MM-DD');
            const payload = {
                ticket_id: parseInt(id, 10),
                date: todayStr,
                hours: workHours,
                minutes: workMinutes,
                note: workNote
            };
            const res = await upsertTodayTicketWork(payload);
            if (res.status === 200) {
                setAlert({ open: true, message: "Today's work saved successfully!", type: "success" });
                fetchTodayWork();
            } else {
                setAlert({ open: true, message: res.message || "Failed to save work.", type: "error" });
            }
        } catch (err) {
            console.error("Error saving today's work:", err);
            setAlert({ open: true, message: err.message || "Error saving today's work.", type: "error" });
        } finally {
            setIsSavingWork(false);
        }
    };

    useEffect(() => {
        if (id && userData?.id) {
            handleCheckCurrentWork()
            fetchTodayWork();
            fetchTimerLogs();
        }
    }, [id, userData?.id]);

    // Core data state
    const [ticket, setTicket] = useState(null);
    const [commentsCount, setCommentsCount] = useState(0);
    const [projects, setProjects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [departmentHierarchy, setDepartmentHierarchy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);

    // React Hook Form initialization
    const { control, handleSubmit, reset, watch, setValue } = useForm({
        defaultValues: {
            project_id: null,
            parent_ticket_id: null,
            department_id: null,
            title: '',
            description: '',
            priority: 'low',
            due_date: null,
            working_hours: null,
            user_type: 'as_customer',
            assignees: [],
            clients: [],
            status_id: '',
            owner_id: null,
            type: 1
        }
    });

    // Inline edit states
    const [isEditing, setIsEditing] = useState(false);
    const [statusesList, setStatusesList] = useState([]);
    const [hierarchyData, setHierarchyData] = useState([]);
    const [editAttachments, setEditAttachments] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const attachmentRef = useRef(null);

    const [sendMailSettings, setSendMailSettings] = useState({});
    const [projectTickets, setProjectTickets] = useState([]);
    const [loadingProjectTickets, setLoadingProjectTickets] = useState(false);
    const [isSavingAssignees, setIsSavingAssignees] = useState(false);
    const [clientsList, setClientsList] = useState([]);

    const selectedAssigneeIds = watch('assignees') || [];
    const selectedClientIds = watch('clients') || [];
    const combinedWatchlistIds = Array.from(new Set([...selectedAssigneeIds, ...selectedClientIds]));
    const selectedProjectId = watch('project_id');
    const prevProjectIdRef = useRef(null);

    useEffect(() => {
        if (prevProjectIdRef.current !== null && prevProjectIdRef.current !== selectedProjectId) {
            setValue('parent_ticket_id', null);
        }
        prevProjectIdRef.current = selectedProjectId;
    }, [selectedProjectId]);

    useEffect(() => {
        const fetchProjectTickets = async () => {
            if (selectedProjectId) {
                setLoadingProjectTickets(true);
                try {
                    const res = await getTicketsByProjectId(selectedProjectId);
                    if (res.status === 200) {
                        let tickets = res.result || [];
                        if (id) {
                            tickets = tickets.filter(t => t.id !== parseInt(id, 10));
                        }
                        const options = tickets.map(t => ({
                            label: `${t.ticket_no} - ${t.title}`,
                            value: t.id
                        }));
                        setProjectTickets(options);
                    }
                } catch (err) {
                    console.error("Failed to load project tickets", err);
                } finally {
                    setLoadingProjectTickets(false);
                }
            } else {
                setProjectTickets([]);
            }
        };
        fetchProjectTickets();
    }, [selectedProjectId, id]);

    useEffect(() => {
        if (selectedAssigneeIds.length > 0 || selectedClientIds.length > 0) {
            setSendMailSettings(prev => {
                const updated = { ...prev };
                let changed = false;
                selectedAssigneeIds.forEach(id => {
                    if (updated[id] === undefined) {
                        updated[id] = 'Y';
                        changed = true;
                    }
                });
                selectedClientIds.forEach(id => {
                    if (updated[id] === undefined) {
                        updated[id] = 'N';
                        changed = true;
                    }
                });
                return changed ? updated : prev;
            });
        }
    }, [selectedAssigneeIds, selectedClientIds]);

    const getUsersByCompanyId = async () => {
        try {
            const projId = watch('project_id');
            const selectedCompanyId = projects.find(p => p.id === projId)?.company_id;
            if (selectedCompanyId) {
                const res = await getAllUsers(selectedCompanyId);
                const options = res.result?.map(u => ({ label: `${u.first_name} ${u.last_name}`, value: u.id }));
                setUsers(options || []);
            } else {
                setUsers([]);
            }
        } catch (err) {
            console.error("Failed to load users", err);
        }
    };
    const handleGetAllCustomer = async () => {
        const custRes = await getCustomers();
        const clientOpts = (custRes.result || []).map(u => ({ label: `${u.first_name} ${u.last_name}`, value: u.id }));
        setClientsList(clientOpts);
    }
    useEffect(() => {
        getUsersByCompanyId();
    }, [watch('project_id'), projects]);

    const getUserNameById = (id) => {
        const findName = (nodes) => {
            for (const node of nodes) {
                if (String(node.id) === String(id)) {
                    return node.name;
                }
                if (node.data && node.data.length > 0) {
                    const found = findName(node.data);
                    if (found) return found;
                }
            }
            return null;
        };
        const nameFromHierarchy = findName(hierarchyData);
        if (nameFromHierarchy) return nameFromHierarchy;
        const clientObj = clientsList.find(c => String(c.value) === String(id));
        if (clientObj) return clientObj.label;
        const userObj = users.find(u => String(u.value) === String(id));
        if (userObj) return userObj.label;
        return `User ${id}`;
    };

    const fetchUsers = async () => {
        try {
            const res = await getUserHierarchy();
            setHierarchyData(res.result || []);
        } catch (err) {
            console.error("Failed to load users", err);
        }
    };

    const fetchStatuses = async () => {
        try {
            const res = await getAllStatuses();
            if (res.status === 200) {
                const formattedConfigs = res.result?.map(s => ({ value: s.id, label: s.name })) || [];
                setStatusesList(formattedConfigs?.reverse());
            }
        } catch (err) {
            console.error("Failed to fetch statuses", err);
        }
    };

    const handleStartEdit = async () => {
        if (!ticket) return;

        if (hierarchyData.length === 0) {
            await fetchUsers();
        }
        if (statusesList.length === 0) {
            await fetchStatuses();
        }

        const formattedDate = ticket.due_date ? dayjs(ticket.due_date) : null;
        const formattedAssignees = [];
        const formattedClients = [];
        const initialSendMail = {};
        (ticket.assignees || []).forEach(a => {
            const isObj = typeof a === 'object';
            const id = isObj ? a.id : a;
            const isClient = isObj ? !!a.is_client : false;
            const sendMail = isObj ? (a.send_mail || (isClient ? 'N' : 'Y')) : 'Y';
            initialSendMail[id] = sendMail;
            if (isClient) {
                formattedClients.push(id);
            } else {
                formattedAssignees.push(id);
            }
        });
        setSendMailSettings(initialSendMail);

        reset({
            project_id: ticket.project_id || null,
            parent_ticket_id: ticket.parent_ticket_id || null,
            department_id: ticket.department_id || null,
            title: ticket.title || '',
            description: ticket.description || '',
            priority: ticket.priority || 'low',
            due_date: formattedDate,
            working_hours: ticket.working_hours || null,
            // user_type: isForCustomer ? 'for_customer' : 'as_customer',
            assignees: formattedAssignees,
            clients: formattedClients,
            status_id: ticket.status_id || '',
            owner_id: ticket.owner_id || ticket.created_by || null,
            type: TICKET_TYPES?.find(t => t.label === ticket?.type)?.value || 1
        });

        if (userData?.rolename === "Customer") {
            setValue("user_type", "for_customer");
        }

        setEditAttachments(ticket.attachments || []);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleUploadSuccess = (response) => {
        setEditAttachments(prev => [...prev, {
            id: response.id,
            file_name: response.file_name,
            file_URL: response.file_URL
        }]);
    };

    const handleDeleteAttachment = async (attId) => {
        try {
            await deleteTicketAttachment(ticket.id, attId);
            setEditAttachments(prev => prev.filter(a => a.id !== attId));
        } catch (error) {
            setAlert({ open: true, message: "Failed to delete attachment.", type: "error" });
        }
    };

    const handleFormSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...data,
                type: TICKET_TYPES?.find(t => t.value === data?.type)?.label || "New Feature"
            };

            const assigneeMap = new Map();
            (data.assignees || []).forEach(id => {
                let cleanId = id;
                if (typeof id === 'string' && id.startsWith('u-')) {
                    cleanId = parseInt(id.substring(2), 10);
                }
                assigneeMap.set(cleanId, {
                    id: cleanId,
                    send_mail: sendMailSettings[id] || 'Y',
                    is_client: false
                });
            });
            (data.clients || []).forEach(id => {
                let cleanId = id;
                if (typeof id === 'string' && id.startsWith('u-')) {
                    cleanId = parseInt(id.substring(2), 10);
                }
                assigneeMap.set(cleanId, {
                    id: cleanId,
                    send_mail: sendMailSettings[id] || 'N',
                    is_client: true
                });
            });
            payload.assignees = Array.from(assigneeMap.values());
            delete payload.clients;

            if (payload.due_date) {
                payload.due_date = payload.due_date.format('YYYY-MM-DD');
            } else {
                payload.due_date = null;
            }

            if (payload.owner_id) {
                payload.for_customer = true;
                payload.as_customer = false;
            } else {
                payload.as_customer = true;
                payload.for_customer = false;
            }
            delete payload.user_type;

            const selectedProject = projects.find(p => p.id === data.project_id);
            payload.project_name = selectedProject ? selectedProject.name : "";

            const res = await updateTicket(ticket.id, payload);
            if (res.status !== 200) {
                setAlert({ open: true, message: res.message || "Failed to update ticket.", type: "error" });
                setIsSubmitting(false);
                return;
            }

            setIsUploadingFiles(true);
            if (attachmentRef.current) {
                await attachmentRef.current.uploadPendingFiles(ticket.id);
            }
            setIsUploadingFiles(false);

            setAlert({ open: true, message: "Ticket updated successfully!", type: "success" });
            setIsEditing(false);
            fetchData(true);
        } catch (err) {
            console.error(err);
            setAlert({ open: true, message: err.message || "Failed to save ticket.", type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveAssigneesOnly = async () => {
        const selectedAssignees = watch('assignees') || [];
        const selectedClients = watch('clients') || [];

        setIsSavingAssignees(true);
        try {
            const assigneeMap = new Map();
            selectedAssignees.forEach(id => {
                let cleanId = id;
                if (typeof id === 'string' && id.startsWith('u-')) {
                    cleanId = parseInt(id.substring(2), 10);
                }
                assigneeMap.set(cleanId, {
                    id: cleanId,
                    send_mail: sendMailSettings[id] || 'Y',
                    is_client: false
                });
            });
            selectedClients.forEach(id => {
                let cleanId = id;
                if (typeof id === 'string' && id.startsWith('u-')) {
                    cleanId = parseInt(id.substring(2), 10);
                }
                assigneeMap.set(cleanId, {
                    id: cleanId,
                    send_mail: sendMailSettings[id] || 'N',
                    is_client: true
                });
            });

            const payload = {
                assignees: Array.from(assigneeMap.values())
            };

            const res = await updateTicketAssignees(ticket.id, payload);
            if (res.status === 200) {
                setAlert({ open: true, message: "Assignees updated successfully!", type: "success" });
                // Refresh ticket details
                fetchData(false);
            } else {
                setAlert({ open: true, message: res.message || "Failed to update assignees.", type: "error" });
            }
        } catch (err) {
            console.error(err);
            setAlert({ open: true, message: err.message || "Failed to update assignees.", type: "error" });
        } finally {
            setIsSavingAssignees(false);
        }
    };

    // Copy to clipboard state
    const [copied, setCopied] = useState(false);

    const fetchData = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const [ticketRes, commentsRes, projectsRes, departmentsRes, hierarchyRes] = await Promise.all([
                getTicketById(id),
                getTicketComments(id),
                getAllProjects(),
                getAllDepartments(),
                getDepartmentHierarchy()
            ]);

            setTicket(ticketRes.result);
            setCommentsCount(commentsRes.result?.length || 0);
            setProjects(projectsRes.result || []);
            setDepartments(departmentsRes.result || []);
            setDepartmentHierarchy(hierarchyRes.result || []);
        } catch (err) {
            console.error(err);
            setAlert({ open: true, message: "Failed to load ticket details.", type: "error" });
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchData();
            handleGetAllCustomer()
        }
    }, [id]);

    const getProjectName = (projId) => {
        const found = projects.find(p => p.id === projId);
        return found ? found.name : "-";
    };

    const getDepartmentName = (deptId) => {
        if (!deptId) return "-";
        const path = [];
        let currentId = deptId;
        const visited = new Set();
        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const found = departments.find(d => d.id === currentId);
            if (found) {
                path.unshift(found.name);
                currentId = found.parent_department_id;
            } else {
                break;
            }
        }
        return path.length > 0 ? path.join(' > ') : "-";
    };

    const getAbsoluteUrl = (url) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `${import.meta.env.REACT_APP_MAIN_SITE_URL || ''}${url}`;
    };

    const handleDownload = (url, fileName) => {
        const a = document.createElement('a');
        a.href = getAbsoluteUrl(url);
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleCopyLink = () => {
        const link = window.location.href;
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            setAlert({ open: true, message: "Ticket link copied to clipboard!", type: "success" });
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const getStatusColorClass = (statusName) => {
        const name = statusName?.toLowerCase() || '';
        if (name === 'done') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (name === 'in progress') return 'bg-blue-50 text-blue-700 border-blue-200';
        if (name === 'todo') return 'bg-violet-50 text-violet-700 border-violet-200';
        if (name === 'in review') return 'bg-violet-50 text-violet-700 border-violet-200';
        return 'bg-slate-50 text-slate-700 border-slate-200';
    };

    const getStatusDotColor = (statusName) => {
        const name = statusName?.toLowerCase() || '';
        if (name === 'done') return 'bg-emerald-500';
        if (name === 'in progress') return 'bg-blue-500';
        if (name === 'todo') return 'bg-violet-500';
        if (name === 'in review') return 'bg-violet-500';
        return 'bg-slate-500';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <CircularProgress size={45} sx={{ color: '#337fff' }} />
                <Typography variant="body2" className="text-gray-500 font-medium">
                    Loading ticket details...
                </Typography>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Button
                    startIcon={<FontAwesomeIcon icon={faArrowLeft} />}
                    onClick={() => navigate('/dashboard/manage-tickets')}
                    className="text-gray-600 mb-6 hover:text-gray-900 normal-case"
                >
                    Back to Tickets
                </Button>
                <Paper className="p-8 text-center border border-gray-200 rounded-2xl shadow-sm">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-5xl mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Ticket Not Found</h3>
                    <p className="text-gray-500">The ticket you are trying to view does not exist or you do not have permission to view it.</p>
                </Paper>
            </div>
        );
    }

    const ticketDate = ticket.due_date ? dayjs(ticket.due_date.split('T')[0]) : null;
    const today = dayjs().startOf('day');
    const isOverdue = ticketDate && ticketDate.isBefore(today, 'day');
    const isToday = ticketDate && ticketDate.isSame(today, 'day');
    const relativeDueDate = ticketDate
        ? (isToday ? 'Today' : ticketDate.from(today))
        : null;
    const formattedDueDate = ticketDate ? ticketDate.format('MMM D, YYYY') : "-";
    const isClosed = ticket?.status_name?.toLowerCase() === 'close';

    return (
        <div className="max-w-full mx-auto px-4 space-y-4 animate-fade-in font-sans text-slate-800">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<FontAwesomeIcon icon={faArrowLeft} />}
                        onClick={() => navigate('/dashboard/manage-tickets')}
                        className="normal-case text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        sx={{ borderRadius: '8px', padding: '5px 12px', fontSize: '0.825rem' }}
                    >
                        Back
                    </Button>
                </div>
                {!isClosed && (
                    <PermissionWrapper
                        functionalityName="manage tickets"
                        moduleName="Tickets"
                        actionId={2}
                        component={
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={handleCancelEdit}
                                            className="normal-case text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                            sx={{ borderRadius: '8px', padding: '5px 12px', fontSize: '0.825rem' }}
                                            disabled={isSubmitting || isUploadingFiles}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={handleSubmit(handleFormSubmit)}
                                            className="normal-case bg-[#0052CC] hover:bg-[#0747A6] text-white font-medium shadow-sm transition-all"
                                            sx={{ borderRadius: '8px', padding: '5px 14px', fontSize: '0.825rem' }}
                                            disabled={isSubmitting || isUploadingFiles}
                                            startIcon={(isSubmitting || isUploadingFiles) ? <CircularProgress size={14} color="inherit" /> : null}
                                        >
                                            {isSubmitting ? "Saving..." : "Save Changes"}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<FontAwesomeIcon icon={faEdit} />}
                                        onClick={handleStartEdit}
                                        className="normal-case bg-[#0052CC] hover:bg-[#0747A6] text-white font-medium shadow-sm transition-all"
                                        sx={{ borderRadius: '8px', padding: '5px 14px', fontSize: '0.825rem' }}
                                    >
                                        Edit Ticket
                                    </Button>
                                )}
                            </div>
                        }
                    />
                )}
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

                {/* Main Column */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Title Block */}
                    <div className="bg-white p-4 border-t-2 border-t-[#0052CC] border-x border-b border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_20px_-10px_rgba(0,0,0,0.04)] rounded-xl space-y-2.5 hover:shadow-md transition-all duration-300">
                        {isEditing ? (
                            <div className="space-y-3">
                                <CustomInput
                                    name="title"
                                    control={control}
                                    label="Ticket Title"
                                    rules={{ required: "Ticket title is required" }}
                                />
                            </div>
                        ) : (
                            <>
                                {/* {ticket.parent_ticket_id && (
                                    <div
                                        className="text-xs font-semibold text-[#0052CC] hover:underline cursor-pointer mb-1 flex items-center gap-1.5 select-none"
                                        onClick={() => navigate(`/dashboard/manage-tickets/view/${ticket.parent_ticket_id}`)}
                                    >
                                        <FontAwesomeIcon icon={faFolder} size="xs" />
                                        <span>Parent Ticket: {ticket.parent_ticket_no ? `[${ticket.parent_ticket_no}] ` : ''}{ticket.parent_ticket_title}</span>
                                    </div>
                                )} */}
                                <div className="flex items-start justify-between gap-4 py-0.5">
                                    <Typography variant="h5" className="font-bold text-slate-900 tracking-tight leading-tight select-none flex items-center gap-2 flex-wrap">
                                        {ticket.ticket_no && (
                                            <span className="bg-blue-50 text-[#0052CC] px-2 py-0.5 rounded text-xs font-mono font-bold border border-blue-100 shadow-sm">
                                                {ticket.ticket_no}
                                            </span>
                                        )}
                                        <span>{ticket.title}</span>
                                    </Typography>
                                </div>
                                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 pt-2.5 mt-2 border-t border-slate-50">
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100/80 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors select-none">
                                        <FontAwesomeIcon icon={faUser} className="text-slate-400" />
                                        <span>Opened by <span className="font-medium text-slate-700">{ticket.created_by_name || 'System'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100/80 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors select-none">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-slate-400" />
                                        <span>Created {dayjs(ticket.created_date).format("MMMM D, YYYY")}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100/80 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors select-none">
                                        <FontAwesomeIcon icon={faComments} className="text-slate-400" />
                                        <span>{commentsCount} comment{commentsCount !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Description & Attachments Block */}
                    <Paper className="p-4 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_20px_-10px_rgba(0,0,0,0.04)] rounded-xl bg-white space-y-3 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <div className="w-6.5 h-6.5 rounded-lg bg-blue-50/80 text-[#0052CC] flex items-center justify-center flex-shrink-0">
                                <FontAwesomeIcon icon={faFileAlt} size="xs" />
                            </div>
                            <span className="font-semibold text-slate-800 text-xs tracking-wider uppercase select-none">
                                Description
                                {/* & Attachments */}
                            </span>
                        </div>

                        <div className="pt-0.5 space-y-4">
                            {isEditing ? (
                                <>
                                    <RichTextEditor
                                        name="description"
                                        control={control}
                                        minimal={false}
                                    />
                                    {/* <div className="mt-6 pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-3 select-none">
                                            <FontAwesomeIcon icon={faPaperclip} className="text-slate-400" size="sm" />
                                            <span className="font-semibold text-slate-700 text-xs tracking-wider uppercase">
                                                Attachments ({editAttachments?.length || 0})
                                            </span>
                                        </div>
                                        <DragDropAttachmentUpload
                                            ref={attachmentRef}
                                            uploadApiFunction={uploadTicketAttachment}
                                            onUploadSuccess={handleUploadSuccess}
                                            existingAttachments={editAttachments}
                                            onDeleteExisting={handleDeleteAttachment}
                                            setAlert={setAlert}
                                        />
                                    </div> */}
                                </>
                            ) : (
                                <>
                                    {ticket.description ? (
                                        <div
                                            className="prose prose-sm max-w-none text-slate-800 leading-relaxed max-h-44 overflow-auto"
                                            dangerouslySetInnerHTML={{ __html: ticket.description }}
                                        />
                                    ) : (
                                        <Typography variant="body2" className="text-slate-400 italic py-2">
                                            No description provided for this ticket.
                                        </Typography>
                                    )}

                                    {(ticket.attachments && ticket.attachments.length > 0) && (
                                        <div className="mt-6 pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-2 mb-3 select-none">
                                                <FontAwesomeIcon icon={faPaperclip} className="text-slate-400" size="sm" />
                                                <span className="font-semibold text-slate-700 text-xs tracking-wider uppercase">
                                                    Attachments ({ticket.attachments?.length || 0})
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                {ticket.attachments.map((file) => (
                                                    <div
                                                        key={file.id}
                                                        className="group/item flex items-center justify-between p-3 border border-gray-100 hover:border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-200"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0 border border-blue-100">
                                                                <FontAwesomeIcon icon={faFileAlt} size="sm" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <Typography
                                                                    variant="body2"
                                                                    noWrap
                                                                    className="font-semibold text-gray-700 group-hover/item:text-blue-600 transition-colors"
                                                                    title={file.file_name}
                                                                >
                                                                    {file.file_name}
                                                                </Typography>
                                                                {file.created_date && (
                                                                    <span className="text-[10px] text-gray-400 block mt-0.5">
                                                                        Uploaded {dayjs(file.created_date).fromNow()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 opacity-60 group-hover/item:opacity-100 transition-opacity">
                                                            <Tooltip title="Download attachment">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleDownload(file.file_URL, file.file_name)}
                                                                    className="text-gray-500 hover:text-blue-600 hover:bg-white p-1.5"
                                                                >
                                                                    <FontAwesomeIcon icon={faDownload} size="sm" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </Paper>

                    {/* Comments Section */}
                    <Paper className="p-4 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_20px_-10px_rgba(0,0,0,0.04)] rounded-xl bg-white space-y-3 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <div className="w-6.5 h-6.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                <FontAwesomeIcon icon={faComments} size="xs" />
                            </div>
                            <span className="font-semibold text-slate-800 text-xs tracking-wider uppercase">
                                Comments ({commentsCount})
                            </span>
                        </div>

                        <CommentSection
                            ticketId={id}
                            onCommentsCountChange={(count) => setCommentsCount(count)}
                            isClosed={isClosed}
                        />
                    </Paper>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-4">
                    {/* Sticky Container */}
                    <div className="lg:sticky lg:top-4 space-y-4">

                        {/* Ticket Properties Card */}
                        <Paper className="border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_20px_-10px_rgba(0,0,0,0.04)] rounded-xl bg-white p-4 space-y-4 hover:shadow-md transition-all duration-300">
                            <div className="border-b border-slate-100 pb-2 flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded bg-slate-50 text-slate-500 flex items-center justify-center flex-shrink-0">
                                    <FontAwesomeIcon icon={faInfoCircle} size="xs" />
                                </div>
                                <span className="font-semibold text-slate-800 text-xs tracking-wider uppercase">
                                    Ticket Details
                                </span>
                            </div>

                            {isEditing ? (
                                <div className="space-y-3">
                                    {/* User Type Selector for non-Customers */}
                                    {/* {userData?.rolename !== "Customer" && (
                                        <div className="flex flex-col gap-1 pb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                User Type
                                            </span>
                                            <Controller
                                                name="user_type"
                                                control={control}
                                                render={({ field }) => (
                                                    <RadioGroup
                                                        row
                                                        {...field}
                                                    >
                                                        <FormControlLabel value="as_customer" control={<Radio size="small" />} label={<span className="text-xs">As Customer</span>} />
                                                        <FormControlLabel value="for_customer" control={<Radio size="small" />} label={<span className="text-xs">For Customer</span>} />
                                                    </RadioGroup>
                                                )}
                                            />
                                        </div>
                                    )} */}

                                    {/* Ticket Type */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faTasks} size="xs" /> Type
                                        </label>
                                        <CustomSelect
                                            name="type"
                                            control={control}
                                            options={TICKET_TYPES}
                                        />
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faTag} size="xs" /> Status
                                        </label>
                                        <CustomSelect
                                            name="status_id"
                                            control={control}
                                            options={statusesList}
                                            rules={{ required: "Status is required" }}
                                        />
                                    </div>

                                    {/* Priority */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faExclamationTriangle} size="xs" /> Priority
                                        </label>
                                        <CustomSelect
                                            name="priority"
                                            control={control}
                                            options={[
                                                { value: 'low', label: 'Low' },
                                                { value: 'medium', label: 'Medium' },
                                                { value: 'high', label: 'High' }
                                            ]}
                                            rules={{ required: "Priority is required" }}
                                        />
                                    </div>

                                    {/* Project */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faFolder} size="xs" /> Project
                                        </label>
                                        <CustomSelect
                                            name="project_id"
                                            control={control}
                                            options={projects.map(p => ({ label: p.name, value: p.id }))}
                                            rules={{ required: "Project is required" }}
                                        />
                                    </div>

                                    {/* Ticket Owner */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faUser} size="xs" /> Ticket Owner
                                        </label>
                                        <CustomSelect
                                            name="owner_id"
                                            control={control}
                                            options={users}
                                        />
                                    </div>

                                    {/* Department */}
                                    {userData?.rolename !== "Customer" && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                                                <FontAwesomeIcon icon={faBuilding} size="xs" /> Department
                                            </label>
                                            <HierarchySelect
                                                name="department_id"
                                                control={control}
                                                label=""
                                                hierarchyData={departmentHierarchy}
                                                multiple={false}
                                                showDivider={false}
                                            />
                                        </div>
                                    )}

                                    {/* Due Date */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faCalendarAlt} size="xs" /> Due Date
                                        </label>
                                        <DatePickerComponent
                                            requiredFiledLabel={true}
                                            setValue={setValue}
                                            control={control}
                                            name="due_date"
                                            label=""
                                            minDate={new Date()}
                                            maxDate={null}
                                            required={true}
                                        />
                                    </div>

                                    {/* Working Hours */}
                                    {/* {userData?.rolename !== "Customer" && ( */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faClock} size="xs" /> Estimated Hours
                                        </label>
                                        <CustomInput
                                            name="working_hours"
                                            control={control}
                                            onChange={(e, onChange) => {
                                                let value = e.target.value;
                                                value = value.replace(/[^0-9.]/g, '');
                                                const parts = value.split('.');
                                                if (parts.length > 2) {
                                                    value = parts[0] + '.' + parts.slice(1).join('');
                                                }
                                                if (parts[1] && parts[1].length > 2) {
                                                    value = parts[0] + '.' + parts[1].substring(0, 2);
                                                }
                                                onChange(value);
                                            }}
                                        />
                                    </div>
                                    {/* )} */}

                                    {selectedProjectId && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                                                <FontAwesomeIcon icon={faFolder} size="xs" /> Parent Ticket
                                            </label>
                                            <CustomSelect
                                                name="parent_ticket_id"
                                                control={control}
                                                label=""
                                                options={projectTickets}
                                                disabled={projectTickets.length === 0}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-3.5 items-center text-xs">
                                    {/* Ticket Type details */}
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5 select-none hover:text-[#0052CC] transition-colors">
                                        <FontAwesomeIcon icon={faTasks} size="xs" className="text-slate-400" /> Type
                                    </span>
                                    <div className="hover:bg-slate-50/50 p-1 -m-1 rounded transition-colors select-none">
                                        <span className="font-semibold text-slate-700">
                                            {ticket.type || "-"}
                                        </span>
                                    </div>

                                    {/* Status details */}
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5 select-none hover:text-[#0052CC] transition-colors">
                                        <FontAwesomeIcon icon={faTag} size="xs" className="text-slate-400" /> Status
                                    </span>
                                    <div className="hover:bg-slate-50/50 p-1 -m-1 rounded transition-colors select-none">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColorClass(ticket.status_name)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(ticket.status_name)} animate-pulse`} />
                                            {ticket.status_name || 'Unassigned'}
                                        </span>
                                    </div>

                                    {/* Priority details */}
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5 select-none hover:text-[#0052CC] transition-colors">
                                        <FontAwesomeIcon icon={faExclamationTriangle} size="xs" className="text-slate-400" /> Priority
                                    </span>
                                    <div className="hover:bg-slate-50/50 p-1 -m-1 rounded transition-colors select-none">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ticket.priority?.toLowerCase() === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                            ticket.priority?.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                'bg-slate-50 text-slate-700 border-slate-200'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${ticket.priority?.toLowerCase() === 'high' ? 'bg-rose-500' :
                                                ticket.priority?.toLowerCase() === 'medium' ? 'bg-amber-500' :
                                                    'bg-slate-500'
                                                }`} />
                                            {ticket.priority ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1) : 'Low'}
                                        </span>
                                    </div>

                                    {/* Project details */}
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5 select-none hover:text-[#0052CC] transition-colors">
                                        <FontAwesomeIcon icon={faFolder} size="xs" className="text-slate-400" /> Project
                                    </span>
                                    <div className="hover:bg-slate-50/50 p-1 -m-1 rounded transition-colors select-none">
                                        <span className="font-semibold text-slate-700">
                                            {getProjectName(ticket.project_id)}
                                        </span>
                                    </div>

                                    {/* Owner details */}
                                    {ticket.owner_name && (
                                        <>
                                            <span className="text-slate-500 font-medium flex items-center gap-1.5 select-none hover:text-[#0052CC] transition-colors">
                                                <FontAwesomeIcon icon={faUser} size="xs" className="text-slate-400" /> Owner
                                            </span>
                                            <div className="hover:bg-slate-50/50 p-1 -m-1 rounded transition-colors select-none">
                                                <span className="font-semibold text-slate-700">
                                                    {ticket.owner_name}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {/* Department details */}
                                    {ticket.department_id && (
                                        <>
                                            <span className="text-slate-500 font-medium flex items-center gap-1.5 select-none hover:text-[#0052CC] transition-colors">
                                                <FontAwesomeIcon icon={faBuilding} size="xs" className="text-slate-400" /> Department
                                            </span>
                                            <div className="hover:bg-slate-50/50 p-1 -m-1 rounded transition-colors select-none min-w-0">
                                                <span className="font-semibold text-slate-700 truncate block" title={getDepartmentName(ticket.department_id)}>
                                                    {getDepartmentName(ticket.department_id)}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {/* Due Date Badge */}
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5 select-none hover:text-[#0052CC] transition-colors">
                                        <FontAwesomeIcon icon={faCalendarAlt} size="xs" className="text-slate-400" /> Due Date
                                    </span>
                                    <div className="hover:bg-slate-50/50 p-1 -m-1 rounded transition-colors flex flex-wrap items-center gap-1.5 select-none">
                                        <span className={`font-semibold ${isOverdue ? 'text-rose-600' : isToday ? 'text-amber-600' : 'text-slate-700'}`}>
                                            {formattedDueDate}
                                        </span>
                                        {relativeDueDate && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${isOverdue ? 'bg-rose-50 text-rose-700 border border-rose-100 shadow-sm' : isToday ? 'bg-amber-50 text-amber-700 border border-amber-100 shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                                {relativeDueDate}
                                            </span>
                                        )}
                                    </div>

                                    {/* Working Hours */}
                                    {ticket.working_hours && (
                                        <>
                                            <span className="text-slate-500 font-medium flex items-center gap-1.5 select-none hover:text-[#0052CC] transition-colors">
                                                <FontAwesomeIcon icon={faClock} size="xs" className="text-slate-400" /> Estimated Hours
                                            </span>
                                            <div className="hover:bg-slate-50/50 p-1 -m-1 rounded transition-colors select-none">
                                                <span className="font-semibold text-slate-700">
                                                    {ticket.working_hours} hours
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {/* Parent Tickets details */}
                                    {ticket.parent_ticket_id && (
                                        <>
                                            <span className="text-slate-500 font-medium flex items-center gap-1.5 select-none hover:text-[#0052CC] transition-colors">
                                                <FontAwesomeIcon icon={faFolder} size="xs" className="text-slate-400" /> Parent Ticket
                                            </span>
                                            <div className="hover:bg-slate-50/50 p-1 -m-1 rounded transition-colors select-none min-w-0" onClick={() => navigate(`/dashboard/manage-tickets/view/${ticket.parent_ticket_id}`)}>
                                                <span className="font-semibold text-[#0052CC] truncate block underline cursor-pointer" title={ticket.parent_ticket_title}>
                                                    {ticket.parent_ticket_title}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </Paper>

                        {/* People Card (Merged Assignees and Watch List) */}
                        <Paper className="border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_20px_-10px_rgba(0,0,0,0.04)] rounded-xl bg-white p-4 space-y-3 hover:shadow-md transition-all duration-300">
                            <div className="border-b border-slate-100 pb-2 flex items-center gap-1.5 justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded bg-slate-50 text-slate-500 flex items-center justify-center flex-shrink-0">
                                        <FontAwesomeIcon icon={faUsers} size="xs" />
                                    </div>
                                    <span className="font-semibold text-slate-800 text-xs tracking-wider uppercase">
                                        People
                                    </span>
                                </div>
                                {isEditing && (
                                    <div className="flex justify-end">
                                        <Tooltip title="Save Assignees Only">
                                            <button
                                                onClick={handleSaveAssigneesOnly}
                                                disabled={isSavingAssignees}
                                                className="w-7 h-7 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052CC] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 ml-auto"
                                            >
                                                {isSavingAssignees ? (
                                                    <CircularProgress size={14} color="inherit" />
                                                ) : (
                                                    <FontAwesomeIcon icon={faSave} size="sm" />
                                                )}
                                            </button>
                                        </Tooltip>
                                    </div>
                                )
                                }
                            </div>

                            {isEditing ? (
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                Assignees ({watch('assignees')?.length || 0})
                                            </label>
                                        </div>
                                        <HierarchySelect
                                            name="assignees"
                                            control={control}
                                            label=""
                                            hierarchyData={hierarchyData}
                                            rules={{ validate: (value) => value && value.length > 0 || "Assign users is required" }}
                                            limitTags={0}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                Clients ({watch('clients')?.length || 0})
                                            </label>
                                        </div>
                                        <CustomSelect
                                            name="clients"
                                            control={control}
                                            label=""
                                            options={clientsList}
                                            multiple={true}
                                            withCheckbox={true}
                                            limitTags={0}
                                        />
                                    </div>

                                    {combinedWatchlistIds.length > 0 && (
                                        <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                                            <h4 className="text-[10px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider font-sans">Watch List</h4>
                                            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                                                {combinedWatchlistIds.map(id => {
                                                    const name = getUserNameById(id);
                                                    const isChecked = sendMailSettings[id] !== 'N';
                                                    return (
                                                        <div key={id} className="flex items-center justify-between py-1 px-2 bg-white rounded border border-slate-200 hover:border-blue-400 transition-colors shadow-sm">
                                                            <span className="text-xs font-medium text-slate-700 font-sans truncate pr-2">{name}</span>
                                                            <FormControlLabel
                                                                control={
                                                                    <Checkbox
                                                                        checked={isChecked}
                                                                        onChange={(e) => {
                                                                            const newVal = e.target.checked ? 'Y' : 'N';
                                                                            setSendMailSettings(prev => ({ ...prev, [id]: newVal }));
                                                                        }}
                                                                        size="small"
                                                                        sx={{
                                                                            padding: '2px',
                                                                            color: '#94a3b8',
                                                                            '&.Mui-checked': {
                                                                                color: '#0052CC',
                                                                            },
                                                                        }}
                                                                        disabled={isClosed}
                                                                    />
                                                                }
                                                                label={<span className="text-[9px] text-slate-500 font-medium font-sans">Send Mail</span>}
                                                                labelPlacement="start"
                                                                sx={{ margin: 0 }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {ticket.assignees && ticket.assignees.length > 0 ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-slate-500">
                                                    Assignees ({ticket.assignees.length})
                                                </span>
                                                <AvatarGroup max={4} className="border-slate-100">
                                                    {ticket?.assignees?.map((user, idx) => (
                                                        <Tooltip key={idx} title={user.name}>
                                                            <Avatar
                                                                className="bg-primary-500 hover:scale-105 transition-transform border border-white shadow-sm"
                                                                sx={{ width: 24, height: 24, fontSize: '0.65rem', fontWeight: 600 }}
                                                            >
                                                                {user.name?.split(' ').map(n => n[0]).join('')}
                                                            </Avatar>
                                                        </Tooltip>
                                                    ))}
                                                </AvatarGroup>
                                            </div>

                                            <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden bg-slate-50/20 shadow-sm">
                                                {ticket?.assignees?.map((user, idx) => {
                                                    const isChecked = user.send_mail !== 'N';
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between p-1.5 px-2.5 bg-slate-50/40 hover:bg-slate-50 border-b border-slate-100/60 transition-colors last:border-b-0">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Avatar
                                                                    className="bg-primary-50 text-[#0052CC] font-semibold border border-blue-100"
                                                                    sx={{ width: 22, height: 22, fontSize: '0.6rem' }}
                                                                >
                                                                    {user.name?.split(' ').map(n => n[0]).join('')}
                                                                </Avatar>
                                                                <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px] select-none">
                                                                    {user.name}
                                                                </span>
                                                            </div>
                                                            <FormControlLabel
                                                                control={
                                                                    <Checkbox
                                                                        checked={isChecked}
                                                                        onChange={async (e) => {
                                                                            const newVal = e.target.checked ? 'Y' : 'N';
                                                                            try {
                                                                                const res = await updateAssigneeSendMail(ticket.id, user.id, newVal);
                                                                                if (res.status === 200) {
                                                                                    setTicket(prev => {
                                                                                        if (!prev) return prev;
                                                                                        const updatedAssignees = prev.assignees.map(a =>
                                                                                            a.id === user.id ? { ...a, send_mail: newVal } : a
                                                                                        );
                                                                                        return { ...prev, assignees: updatedAssignees };
                                                                                    });
                                                                                    setAlert({ open: true, message: `Watchlist updated successfully`, type: "success" });
                                                                                } else {
                                                                                    setAlert({ open: true, message: res.message || "Failed to update watchlist", type: "error" });
                                                                                }
                                                                            } catch (err) {
                                                                                setAlert({ open: true, message: "Error updating watchlist", type: "error" });
                                                                            }
                                                                        }}
                                                                        size="small"
                                                                        sx={{
                                                                            padding: '2px',
                                                                            color: '#94a3b8',
                                                                            '&.Mui-checked': {
                                                                                color: '#337fff',
                                                                            },
                                                                        }}
                                                                        disabled={isClosed || !PermissionWrapper.hasPermission({
                                                                            functionalityName: "manage tickets",
                                                                            moduleName: "Tickets",
                                                                            actionId: 2
                                                                        })}
                                                                    />
                                                                }
                                                                label={<span className="text-[9px] text-slate-500 font-medium font-sans">Send Email</span>}
                                                                labelPlacement="start"
                                                                sx={{ margin: 0 }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="border border-dashed border-slate-200 rounded-lg p-3 text-center bg-slate-50/20">
                                            <FontAwesomeIcon icon={faUsers} className="text-slate-300 text-lg mb-1" />
                                            <Typography variant="body2" className="text-slate-400 text-xs italic">
                                                Unassigned
                                            </Typography>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Paper>

                        {/* Time Tracker Card */}
                        {
                            (userData?.rolename?.toLowerCase() === "developer" || userData?.rolename?.toLowerCase() === "manager") && !isClosed && (
                                <Paper className="border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_20px_-10px_rgba(0,0,0,0.04)] rounded-xl bg-white p-4 space-y-4 hover:shadow-md transition-all duration-300">
                                    <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-6 h-6 rounded bg-slate-50 text-slate-500 flex items-center justify-center flex-shrink-0">
                                                <FontAwesomeIcon icon={faClock} size="xs" />
                                            </div>
                                            <span className="font-semibold text-slate-800 text-xs tracking-wider uppercase select-none">
                                                Time Tracker
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {timerState === 'running' && (
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 select-none">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                                    Live
                                                </span>
                                            )}
                                            {timerState === 'paused' && (
                                                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-semibold select-none">
                                                    Paused
                                                </span>
                                            )}
                                            <Tooltip title="View Timer History">
                                                <IconButton
                                                    onClick={handleOpenHistoryModal}
                                                    size="small"
                                                    className="w-6 h-6 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded transition-colors"
                                                >
                                                    <FontAwesomeIcon icon={faHistory} size="xs" />
                                                </IconButton>
                                            </Tooltip>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center justify-center py-2 space-y-3">
                                        {/* Timer Display */}
                                        <TimerDisplay
                                            timerState={timerState}
                                            initialSeconds={accumulatedSeconds}
                                            activeLog={activeTimerLog}
                                            clockOffset={clockOffsetRef.current}
                                        />

                                        {/* Controls */}
                                        <div className="flex items-center gap-3">
                                            {timerState === 'stopped' ? (
                                                <Tooltip title="Start">
                                                    <span>
                                                        <IconButton
                                                            onClick={handleStartTimer}
                                                            disabled={isTimerActionLoading || disabledStartButton}
                                                            className={disabledStartButton ? 'w-10 h-10 bg-slate-500 hover:bg-slate-600 text-white rounded-full transition-transform active:scale-95 shadow-sm' : 'w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-transform active:scale-95 shadow-sm'}
                                                            sx={{
                                                                backgroundColor: '#10b981',
                                                                color: '#fff',
                                                                '&:hover': { backgroundColor: '#059669' },
                                                                '&:disabled': { backgroundColor: '#e2e8f0', color: '#94a3b8' }
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faPlay} size="sm" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            ) : timerState === 'paused' ? (
                                                <Tooltip title="Resume">
                                                    <span>
                                                        <IconButton
                                                            onClick={handleResumeTimer}
                                                            disabled={isTimerActionLoading || disabledStartButton}
                                                            className={`w-10 h-10 rounded-full transition-transform active:scale-95 shadow-sm ${disabledStartButton ? 'bg-slate-500 hover:bg-slate-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                                                            sx={{
                                                                backgroundColor: '#10b981',
                                                                color: '#fff',
                                                                '&:hover': { backgroundColor: '#059669' },
                                                                '&:disabled': { backgroundColor: '#e2e8f0', color: '#94a3b8' }
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faPlay} size="sm" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="Pause">
                                                    <span>
                                                        <IconButton
                                                            onClick={handlePauseTimerClick}
                                                            disabled={isTimerActionLoading}
                                                            className="w-10 h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-transform active:scale-95 shadow-sm"
                                                            sx={{
                                                                backgroundColor: '#f59e0b',
                                                                color: '#fff',
                                                                '&:hover': { backgroundColor: '#d97706' },
                                                                '&:disabled': { backgroundColor: '#e2e8f0', color: '#94a3b8' }
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faPause} size="sm" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            )}

                                            {(timerState === 'running' || timerState === 'paused') && (
                                                <Tooltip title="Complete Ticket Work">
                                                    <span>
                                                        <IconButton
                                                            onClick={handleCompleteTimerClick}
                                                            disabled={isTimerActionLoading}
                                                            className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full transition-transform active:scale-95 shadow-sm"
                                                            sx={{
                                                                backgroundColor: '#10b981',
                                                                color: '#fff',
                                                                '&:hover': { backgroundColor: '#059669' },
                                                                '&:disabled': { backgroundColor: '#e2e8f0', color: '#94a3b8' }
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faCheck} size="sm" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>
                                </Paper>
                            )
                        }

                        {/* Todays Work Card */}
                        {
                            (!isClosed && !disabledStartButton) && (
                                <Paper className="border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_20px_-10px_rgba(0,0,0,0.04)] rounded-xl bg-white p-4 space-y-4 hover:shadow-md transition-all duration-300">
                                    <div className="border-b border-slate-100 pb-2 flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded bg-slate-50 text-slate-500 flex items-center justify-center flex-shrink-0">
                                            <FontAwesomeIcon icon={faClock} size="xs" />
                                        </div>
                                        <span className="font-semibold text-slate-800 text-xs tracking-wider uppercase">
                                            Todays Work
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex gap-2 items-center text-xs">
                                            <span className="text-slate-500 font-medium w-10 text-right">Hour:</span>
                                            <div className="flex flex-wrap items-center gap-2 flex-1">
                                                <select
                                                    value={workHours}
                                                    onChange={(e) => setWorkHours(e.target.value)}
                                                    className="border border-slate-200 rounded p-1 px-1.5 bg-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                                                >
                                                    {hourOptions.map(h => (
                                                        <option key={h} value={h}>{h}</option>
                                                    ))}
                                                </select>

                                                <span className="text-slate-500 font-medium ml-1">Min:</span>
                                                <select
                                                    value={workMinutes}
                                                    onChange={(e) => setWorkMinutes(e.target.value)}
                                                    className="border border-slate-200 rounded p-1 px-1.5 bg-white text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                                                >
                                                    {minuteOptions.map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>

                                                <input
                                                    type="text"
                                                    value={dayjs().format('YYYY-MM-DD')}
                                                    disabled
                                                    className="border border-slate-100 rounded p-1 px-2 bg-slate-50 text-xs w-24 text-center cursor-not-allowed text-slate-400 font-medium ml-1"
                                                />

                                                <Tooltip title="Save Work Log">
                                                    <button
                                                        onClick={handleSaveTodayWork}
                                                        disabled={isSavingWork}
                                                        className="w-7 h-7 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052CC] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 ml-auto"
                                                    >
                                                        {isSavingWork ? (
                                                            <CircularProgress size={14} color="inherit" />
                                                        ) : (
                                                            <FontAwesomeIcon icon={faSave} size="sm" />
                                                        )}
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 items-start text-xs">
                                            <span className="text-slate-500 font-medium pt-1.5 w-10 text-right">Note:</span>
                                            <textarea
                                                value={workNote}
                                                onChange={(e) => setWorkNote(e.target.value)}
                                                placeholder="Enter details of your work..."
                                                rows={3}
                                                className="flex-1 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 resize-y min-h-[60px]"
                                            />
                                        </div>
                                    </div>
                                </Paper>
                            )
                        }
                    </div>
                </div>
            </div>

            {/* Reason Dialog Modal */}
            <ReasonModal
                open={openReasonModal}
                onClose={() => setOpenReasonModal(false)}
                onSubmit={handleReasonSubmit}
                title={reasonModalConfig.title}
                description={reasonModalConfig.description}
                submitText={reasonModalConfig.submitText}
                isSubmitting={isTimerActionLoading}
            />

            {/* Timer History Dialog Modal */}
            <Dialog
                open={openHistoryModal}
                onClose={() => setOpenHistoryModal(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle className="flex justify-between items-center bg-slate-50 border-b border-slate-200 py-3 px-4">
                    <span className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <FontAwesomeIcon icon={faHistory} className="text-slate-500" />
                        Timer History
                    </span>
                </DialogTitle>
                <DialogContent className="p-4 bg-slate-50/50">
                    {isHistoryLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-2">
                            <CircularProgress size={28} />
                            <span className="text-xs text-slate-500">Loading history...</span>
                        </div>
                    ) : historyLogs.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-xs italic">
                            No timer logs found for this ticket.
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white max-h-[60vh] mt-4">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider sticky top-0 z-50">
                                        <th className="p-3.5 pl-4">Session Date</th>
                                        <th className="p-3.5">Time Range</th>
                                        <th className="p-3.5">Duration</th>
                                        <th className="p-3.5">Completed Date</th>
                                        <th className="p-3.5 pr-4">Note / Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupLogsByDate(historyLogs).map((group) => (
                                        <React.Fragment key={group.date}>
                                            {/* Daily Group Subheader */}
                                            <tr className="border-b border-slate-100 bg-gray-100">
                                                <td colSpan={3} className="p-3.5 pl-4 font-bold text-slate-800 text-[13px] bg-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-slate-500" />
                                                        <span>{dayjs(group.date).format('dddd, D MMM YYYY')}</span>
                                                    </div>
                                                </td>
                                                <td colSpan={2} className="p-3.5 pr-4 text-right bg-gray-100">
                                                    <span className="text-blue-700 font-bold font-mono text-[12px]">
                                                        Total: {formatTime(group.totalSeconds)}
                                                    </span>
                                                </td>
                                            </tr>
                                            {/* Individual Log Rows */}
                                            {group.logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-200/50 last:border-b-0">
                                                    <td className="p-3.5 pl-4"></td>
                                                    <td className="p-3.5 text-slate-700">
                                                        <span>{dayjs(log.start_time).format('hh:mm:ss A')}</span>
                                                        <span className="mx-2 text-slate-400">-</span>
                                                        {log.status === 1 ? (
                                                            <span className="text-emerald-600 font-semibold italic">Ongoing</span>
                                                        ) : (
                                                            <span>{dayjs(log.end_time).format('hh:mm:ss A')}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5 font-mono text-slate-700">
                                                        {getLogDuration(log)}
                                                    </td>
                                                    <td className="p-3.5 text-slate-650">
                                                        {log.complete_date ? dayjs(log.complete_date).format('DD-MMM-YYYY hh:mm A') : '-'}
                                                    </td>
                                                    <td className="p-3.5 text-slate-500 pr-4 max-w-xs truncate" title={log.note || ''}>
                                                        {log.note || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
                <DialogActions className="border-t border-slate-200 p-3 bg-slate-50">
                    <Button
                        onClick={() => setOpenHistoryModal(false)}
                        variant="outlined"
                        size="small"
                        sx={{
                            color: '#64748b',
                            borderColor: '#cbd5e1',
                            '&:hover': {
                                borderColor: '#94a3b8',
                                backgroundColor: '#f1f5f9'
                            },
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                        }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

const mapStateToProps = (state) => ({});

const mapDispatchToProps = {
    setAlert
};

export default connect(mapStateToProps, mapDispatchToProps)(TicketViewPage);
