import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronDown,
    faChevronUp,
    faCalendarTimes,
    faExclamationTriangle,
    faUser,
    faStickyNote
} from '@fortawesome/free-solid-svg-icons';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import DatePickerComponent from '../../components/common/datePickerComponent';
import { getWorkLogs } from '../../services/worklogService';
import { connect } from 'react-redux';
import { setAlert } from '../../redux/commonReducers/commonReducers';
import { getUserDetails } from '../../utils/getUserDetails';

const formatLocalTime = (utcTimeString) => {
    if (!utcTimeString) return 'N/A';
    const dateStr = utcTimeString.endsWith('Z') ? utcTimeString : `${utcTimeString}Z`;
    const localDate = dayjs(dateStr);
    if (!localDate.isValid()) return utcTimeString;
    return localDate.format('YYYY-MM-DD HH:mm:ss');
};

const WorkLog = ({ setAlert }) => {
    const navigate = useNavigate();
    const userDetails = getUserDetails();

    const userRole = userDetails?.rolename || userDetails?.roleName || userDetails?.role || 'Developer';

    // Verify authorized role: Admin (Administrator), Manager, Developer
    const isAuthorized = ['Administrator', 'Manager', 'Developer'].includes(userRole);

    // Form setup with React Hook Form, default current month
    const { control, watch, setValue } = useForm({
        defaultValues: {
            startDate: dayjs().startOf('month'),
            endDate: dayjs()
        }
    });

    const startDate = watch('startDate');
    const endDate = watch('endDate');

    const [worklogData, setWorklogData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expandedUsers, setExpandedUsers] = useState({});

    const fetchLogs = async (startStr, endStr) => {
        setLoading(true);
        try {
            const res = await getWorkLogs(startStr, endStr);
            if (res.status === 200) {
                setWorklogData(res.result);
                // Expand the first user by default if in accordion mode
                if (res.result?.users?.length > 0) {
                    const firstUserId = res.result.users[0].user_id;
                    setExpandedUsers(prev => ({ ...prev, [firstUserId]: true }));
                }
            } else {
                setAlert({ open: true, message: res.message || "Failed to fetch work logs", type: "error" });
            }
        } catch (err) {
            console.error(err);
            setAlert({ open: true, message: "An error occurred while fetching work logs.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (startDate && endDate && dayjs(startDate).isValid() && dayjs(endDate).isValid()) {
            if (startDate.isAfter(endDate)) {
                setAlert({ open: true, message: "Start Date cannot be after End Date.", type: "error" });
                setWorklogData(null);
            } else {
                fetchLogs(
                    startDate.format('YYYY-MM-DD'),
                    endDate.format('YYYY-MM-DD')
                );
            }
        }
    }, [startDate, endDate]);

    const handleResetMonth = () => {
        setValue('startDate', dayjs().startOf('month'));
        setValue('endDate', dayjs());
    };

    const toggleExpandUser = (userId) => {
        setExpandedUsers(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#DFE1E6] rounded-2xl shadow-sm max-w-2xl mx-auto my-12 animate-fade-in-up">
                <div className="w-16 h-16 bg-[#FFEBE6] rounded-full flex items-center justify-center mb-4 text-[#DE350B]">
                    <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                </div>
                <h3 className="text-xl font-bold text-[#172B4D] mb-2">Access Denied</h3>
                <p className="text-[#5E6C84] mb-6">You do not have permission to view the Work Logs. Only Admin, Manager, and Developer roles are allowed.</p>
                <Button
                    variant="contained"
                    onClick={() => navigate('/dashboard')}
                    sx={{
                        textTransform: 'none',
                        bgcolor: '#0052CC',
                        fontWeight: 600,
                        '&:hover': { bgcolor: '#0040A3' }
                    }}
                >
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    const isDeveloper = userRole === 'Developer';

    const formatSecondsToDisplay = (secs) => {
        const hrs = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        return `${hrs} hrs ${mins} mins`;
    };

    const developerTickets = worklogData?.users?.[0]?.tickets || [];

    const renderTableBody = (tickets) => {
        if (!tickets || tickets.length === 0) {
            return (
                <tbody className="bg-white divide-y divide-[#DFE1E6]">
                    <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#5E6C84]">
                            No logs found in the selected date range.
                        </td>
                    </tr>
                </tbody>
            );
        }

        return (
            <tbody className="bg-white divide-y divide-[#DFE1E6]">
                {tickets.flatMap((ticket) =>
                    (ticket.logs || []).map((log, index) => (
                        <tr key={log.id} className="hover:bg-[#FAFBFC] transition-colors">
                            {index === 0 && (
                                <>
                                    <td rowSpan={ticket.logs.length} className="px-6 py-4.5 whitespace-nowrap text-sm text-[#42526E] border-r border-[#DFE1E6] font-semibold align-middle">
                                        <span className="bg-violet-50 text-violet-700 px-2.5 py-1 rounded border border-violet-100">
                                            {ticket.project_name}
                                        </span>
                                    </td>
                                    <td rowSpan={ticket.logs.length} className="px-6 py-4.5 whitespace-nowrap text-sm border-r border-[#DFE1E6] font-bold align-middle">
                                        <Link to={`/dashboard/manage-tickets/view/${ticket.ticket_id}`} className="text-[#0052CC] hover:underline">
                                            {ticket.ticket_no}
                                        </Link>
                                    </td>
                                    <td rowSpan={ticket.logs.length} className="px-6 py-4.5 text-sm text-[#172B4D] font-medium border-r border-[#DFE1E6] max-w-[250px] truncate align-middle" title={ticket.ticket_name}>
                                        {ticket.ticket_name}
                                    </td>
                                    <td rowSpan={ticket.logs.length} className="px-6 py-4.5 whitespace-nowrap text-sm font-bold text-[#172B4D] border-r border-[#DFE1E6] text-right align-middle">
                                        {ticket.worked_time}
                                    </td>
                                </>
                            )}
                            <td className="px-6 py-4.5 whitespace-nowrap text-sm text-[#5E6C84] border-r border-[#DFE1E6]">
                                {formatLocalTime(log.start_time)}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap text-sm text-[#5E6C84] border-r border-[#DFE1E6]">
                                {log.end_time ? formatLocalTime(log.end_time) : (log.status === 1 ? <span className="text-[#36B37E] font-semibold">Running</span> : 'N/A')}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap text-sm font-bold text-[#172B4D] text-right border-r border-[#DFE1E6]">
                                {log.actual_time}
                            </td>
                            {index === 0 && (
                                <td rowSpan={ticket.logs.length} className="px-6 py-4.5 whitespace-nowrap text-sm font-bold text-[#172B4D] text-center align-middle">
                                    {ticket.notes ? (
                                        <Tooltip title={ticket.notes} arrow placement="bottom">
                                            <span className="text-[#0052CC] hover:text-[#0747A6] cursor-pointer">
                                                <FontAwesomeIcon icon={faStickyNote} size="lg" />
                                            </span>
                                        </Tooltip>
                                    ) : (
                                        <span className="text-[#8993A4] italic text-xs font-normal">
                                            -
                                        </span>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))
                )}
            </tbody>
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header section with modern controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 border border-[#DFE1E6] rounded-2xl shadow-xs">
                <div>
                    <h2 className="text-2xl font-bold text-[#172B4D]">Work Logs</h2>
                    <p className="text-sm text-[#5E6C84] mt-1">
                        {isDeveloper
                            ? "Track and review your ticket activity and logged hours."
                            : "Monitor team work logs, ticket activity, and hours logged."
                        }
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
                    <div style={{ width: 160 }}>
                        <DatePickerComponent
                            control={control}
                            name="startDate"
                            label="Start Date"
                            maxDate={endDate}
                        />
                    </div>
                    <div style={{ width: 160 }}>
                        <DatePickerComponent
                            control={control}
                            name="endDate"
                            label="End Date"
                            minDate={startDate}
                            maxDate={dayjs()}
                        />
                    </div>
                    <button
                        onClick={handleResetMonth}
                        className="bg-[#EBECF0] hover:bg-[#DFE1E6] text-[#42526E] font-bold text-sm px-4 py-2.5 rounded-xl transition active:scale-95 cursor-pointer h-[40px] flex items-center justify-center"
                    >
                        This Month
                    </button>
                </div>
            </div>

            {/* Main Data View */}
            {loading && (
                <div className="flex justify-center items-center py-20">
                    <CircularProgress size={40} sx={{ color: '#0052CC' }} />
                </div>
            )}

            {!loading && worklogData && (
                <>
                    {isDeveloper ? (
                        /* Flat Table View for Developer */
                        developerTickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-16 text-center bg-white border border-[#DFE1E6] rounded-2xl shadow-xs">
                                <div className="w-16 h-16 bg-[#F4F5F7] rounded-full flex items-center justify-center mb-5 text-[#8993A4]">
                                    <FontAwesomeIcon icon={faCalendarTimes} size="2x" />
                                </div>
                                <h3 className="text-lg font-bold text-[#172B4D] mb-1">No Logs Found</h3>
                                <p className="text-[#5E6C84] max-w-md">You haven't logged any work in the selected date range.</p>
                            </div>
                        ) : (
                            <div className="border border-[#DFE1E6] rounded-2xl bg-white shadow-xs overflow-auto" style={{ maxHeight: 'calc(100vh - 230px)' }}>
                                <table className="min-w-full divide-y divide-[#DFE1E6]">
                                    <thead className="bg-[#FAFBFC] sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Project Name</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Ticket No</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Ticket Name</th>
                                            <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Worked Time</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Start Time</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">End Time</th>
                                            <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Actual Time</th>
                                            <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-[#8993A4] uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    {renderTableBody(developerTickets)}
                                </table>
                            </div>
                        )
                    ) : (
                        /* Accordion View for Manager / Admin */
                        <div className="space-y-4">
                            {worklogData.users.map((user) => {
                                const isExpanded = !!expandedUsers[user.user_id];
                                // Calculate total actual seconds for the user
                                const userTotalSecs = user.tickets?.reduce((sum, ticket) => sum + (Number(ticket.total_actual_seconds) || 0), 0) || 0;
                                const userTotalWorkedSecs = user.tickets?.reduce((sum, ticket) => sum + (Number(ticket.worked_seconds) || 0), 0) || 0;

                                return (
                                    <div
                                        key={user.user_id}
                                        className="bg-white border border-[#DFE1E6] rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition-all"
                                    >
                                        {/* Accordion Header */}
                                        <div
                                            onClick={() => toggleExpandUser(user.user_id)}
                                            className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAFBFC] transition-colors select-none"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-10 h-10 rounded-xl bg-[#E9F2FF] text-[#0052CC] flex items-center justify-center font-bold text-sm shrink-0">
                                                    {user.user_name ? user.user_name.split(' ').map(n => n[0]).join('') : <FontAwesomeIcon icon={faUser} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-[#172B4D] text-base truncate">{user.user_name}</h4>
                                                    <span className="text-xs text-[#5E6C84] font-semibold uppercase tracking-wider">
                                                        {user.role_id === 1 ? "Admin" : user.role_id === 5 ? "Manager" : "Developer"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between md:justify-end gap-5 shrink-0">
                                                <div className="text-right">
                                                    <div className="text-xs text-[#5E6C84] font-medium">Worked Time</div>
                                                    <div className="text-base font-bold text-[#172B4D]">
                                                        {formatSecondsToDisplay(userTotalWorkedSecs)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-[#5E6C84] font-medium">Actual Time</div>
                                                    <div className="text-base font-bold text-[#172B4D]">
                                                        {formatSecondsToDisplay(userTotalSecs)}
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-[#6B778C] bg-[#F4F5F7] px-3 py-1.5 rounded-full shrink-0">
                                                    {user.tickets?.reduce((acc, t) => acc + (t.logs?.length || 0), 0) || 0} Logs
                                                </span>
                                                <div className="w-8 h-8 rounded-full hover:bg-[#EBECF0] text-[#5E6C84] flex items-center justify-center transition-colors">
                                                    <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Accordion Body */}
                                        {isExpanded && (
                                            <div className="border-t border-[#DFE1E6] bg-[#FAFBFC] p-5">
                                                {!user.tickets || user.tickets.length === 0 ? (
                                                    <div className="text-center py-8 text-[#5E6C84] text-sm font-medium">
                                                        No logs found for this user in the selected date range.
                                                    </div>
                                                ) : (
                                                    <div className="overflow-auto border border-[#DFE1E6] rounded-xl bg-white shadow-xs">
                                                        <table className="min-w-full divide-y divide-[#DFE1E6]">
                                                            <thead className="bg-[#FAFBFC]">
                                                                <tr>
                                                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Project Name</th>
                                                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Ticket No</th>
                                                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Ticket Name</th>
                                                                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Worked Time</th>
                                                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Start Time</th>
                                                                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">End Time</th>
                                                                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-bold text-[#8993A4] uppercase tracking-wider border-r border-[#DFE1E6]">Actual Time</th>
                                                                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-bold text-[#8993A4] uppercase tracking-wider w-20">Action</th>
                                                                </tr>
                                                            </thead>
                                                            {renderTableBody(user.tickets)}
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const mapStateToProps = (state) => ({});

const mapDispatchToProps = {
    setAlert
};

export default connect(mapStateToProps, mapDispatchToProps)(WorkLog);
