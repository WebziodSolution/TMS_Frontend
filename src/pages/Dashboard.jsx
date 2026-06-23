import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import { connect } from 'react-redux';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getCookie } from '../utils/cookieHelper';
import { getDashboardData } from '../services/authService';
import { getUserDetails } from '../utils/getUserDetails';

const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "-";
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        if (includeTime) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
        return `${day}/${month}/${year}`;
    } catch (e) {
        return "-";
    }
};

const isOverdue = (dateString) => {
    if (!dateString) return false;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    } catch (e) {
        return false;
    }
};

const LiveTimer = ({ startTime, accumulatedSeconds, serverTime }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (!startTime) return;

        // Calculate offset between client clock and server clock
        const serverDate = new Date(serverTime);
        const clientDate = new Date();
        const offsetMs = serverDate.getTime() - clientDate.getTime();

        const calculateElapsed = () => {
            const adjustedNow = new Date(new Date().getTime() + offsetMs);
            const start = new Date(startTime);
            const elapsed = Math.max(0, Math.floor((adjustedNow - start) / 1000));
            setSeconds(accumulatedSeconds + elapsed);
        };

        // Run immediately
        calculateElapsed();

        const interval = setInterval(calculateElapsed, 1000);
        return () => clearInterval(interval);
    }, [startTime, accumulatedSeconds, serverTime]);

    const formatTimer = (totalSecs) => {
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = Math.floor(totalSecs % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <span className="font-mono font-semibold text-[#FF8B00] bg-[#FFF0B3] px-2.5 py-1 rounded-md text-xs border border-[#FFE380]">
            {formatTimer(seconds)}
        </span>
    );
};

const Dashboard = ({ sessionEndModel }) => {
    const navigate = useNavigate();
    const token = getCookie('tms_token');
    const [data, setData] = useState(null);

    if (!token) {
        navigate('/');
        return null;
    }

    const handleGetDashboardData = async () => {
        const res = await getDashboardData();
        if (res.status === 200) {
            setData(res?.result)
        }
    }

    useEffect(() => {
        handleGetDashboardData();
    }, [])
    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in-up">

            {/* Idle Developers Section (No Work) */}
            {(() => {
                const userDetails = getUserDetails();
                const role = userDetails?.rolename;
                const showIdleDevelopers = ["administrator", "admin", "manager"].includes(role?.toLowerCase());

                if (!showIdleDevelopers) return null;

                return (
                    <>
                        {data?.idle_developers && data?.idle_developers?.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-[#172B4D]">Developers (Currently Not Working)</h2>
                                    {data?.idle_developers?.length > 0 && (
                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EBECF0] text-[#42526E]">
                                            {data.idle_developers.length} Idle
                                        </span>
                                    )}
                                </div>
                                <div>
                                    {
                                        data.idle_developers?.map((dev, index) => {
                                            return (
                                                <span key={dev.user_id} className="inline-flex items-center justify-center rounded-full text-lg font-bold text-[#42526E] mr-2">
                                                    {dev?.user_name} {(index === data.idle_developers.length - 1) ? '' : ','}
                                                </span>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        )}
                    </>
                );
            })()}

            {/* Active Ticket Timers Section */}
            {(() => {
                const userDetails = getUserDetails();
                const role = userDetails?.rolename;
                const showActiveTimersSection = ["administrator", "admin", "manager", "developer"].includes(role?.toLowerCase());

                if (!showActiveTimersSection) return null;

                return (
                    <>
                        {data?.active_timers && data?.active_timers?.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-[#172B4D]">Active Work Timers</h2>
                                    {data?.active_timers?.length > 0 && (
                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAE6FF] text-[#403294] animate-pulse">
                                            {data.active_timers.length} Active
                                        </span>
                                    )}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block bg-white border border-[#DFE1E6] rounded-2xl shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-[#DFE1E6]">
                                            <thead className="bg-[#FAFBFC]">
                                                <tr>
                                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Developer</th>
                                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Ticket ID</th>
                                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Title</th>
                                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Project</th>
                                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Started At</th>
                                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Live Work Timer</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-[#DFE1E6]">
                                                {data.active_timers.map((timer) => (
                                                    <tr
                                                        key={timer.log_id}
                                                        className="hover:bg-[#FAFBFC] transition-colors cursor-pointer group"
                                                        onClick={() => navigate(`/dashboard/manage-tickets/view/${timer.ticket_id}`)}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5E6C84]">
                                                            {timer.user_name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#0052CC] hover:underline">
                                                            {timer.ticket_no}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#172B4D] group-hover:text-[#0052CC] transition-colors">
                                                            {timer.ticket_name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5E6C84]">
                                                            {timer.project_name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5E6C84]">
                                                            {formatDate(timer.start_time, true)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <LiveTimer
                                                                startTime={timer.start_time}
                                                                accumulatedSeconds={timer.accumulated_seconds}
                                                                serverTime={data.server_time}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Mobile Card View */}
                                <div className="grid grid-cols-1 gap-4 md:hidden">
                                    {data.active_timers.map((timer) => (
                                        <div
                                            key={timer.log_id}
                                            className="p-5 bg-white border border-[#DFE1E6] rounded-2xl shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
                                            onClick={() => navigate(`/dashboard/manage-tickets/view/${timer.ticket_id}`)}
                                        >
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-sm font-bold text-[#0052CC]">{timer.ticket_no}</span>
                                                <LiveTimer
                                                    startTime={timer.start_time}
                                                    accumulatedSeconds={timer.accumulated_seconds}
                                                    serverTime={data.server_time}
                                                />
                                            </div>
                                            <h4 className="font-bold text-base text-[#172B4D] mb-3 line-clamp-2 hover:text-[#0052CC] transition-colors">{timer.ticket_name}</h4>
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs border-t border-[#F4F5F7] pt-4">
                                                <div>
                                                    <span className="text-[#8993A4] block font-medium mb-0.5">Project</span>
                                                    <span className="text-[#172B4D] font-semibold">{timer.project_name}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[#8993A4] block font-medium mb-0.5">Developer</span>
                                                    <span className="text-[#172B4D] font-semibold">{timer.user_name}</span>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-[#8993A4] block font-medium mb-0.5">Started At</span>
                                                    <span className="text-[#172B4D] font-semibold">{formatDate(timer.start_time, true)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                );
            })()}

            {/* Unanswered Tickets Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-[#172B4D]">Unanswered Tickets</h2>
                    {data?.unanswered_tickets?.length > 0 && (
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFEBE6] text-[#DE350B]">
                            {data.unanswered_tickets.length}
                        </span>
                    )}
                </div>

                {!data?.unanswered_tickets || data.unanswered_tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#DFE1E6] rounded-2xl shadow-sm">
                        <div className="w-16 h-16 bg-[#E3FCEF] rounded-full flex items-center justify-center mb-4 text-[#36B37E]">
                            <FontAwesomeIcon icon={faCheckCircle} size="2x" />
                        </div>
                        <h3 className="text-lg font-semibold text-[#172B4D] mb-1">All caught up!</h3>
                        <p className="text-[#5E6C84]">No unanswered tickets assigned to you.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white border border-[#DFE1E6] rounded-2xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[#DFE1E6]">
                                    <thead className="bg-[#FAFBFC]">
                                        <tr>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Ticket ID</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Title</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Project</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Department</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Created By</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Last Post</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">Due Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-[#DFE1E6]">
                                        {data?.unanswered_tickets?.map((ticket) => (
                                            <tr
                                                key={ticket.id}
                                                className="hover:bg-[#FAFBFC] transition-colors cursor-pointer group"
                                                onClick={() => navigate(`/dashboard/manage-tickets/view/${ticket.id}`)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#0052CC] hover:underline">
                                                    {ticket.ticket_no}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#172B4D] group-hover:text-[#0052CC] transition-colors">
                                                    {ticket.title}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5E6C84]">
                                                    {ticket.project_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5E6C84]">
                                                    {ticket.department_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E9F2FF] text-[#0052CC]">
                                                        {ticket.status_name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5E6C84]">
                                                    {ticket.created_by_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5E6C84]">
                                                    {formatDate(ticket.last_post_date, true)}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${isOverdue(ticket.due_date) ? 'text-[#DE350B] font-semibold' : 'text-[#5E6C84]'}`}>
                                                    {formatDate(ticket.due_date)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile Card View */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {data.unanswered_tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="p-5 bg-white border border-[#DFE1E6] rounded-2xl shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
                                    onClick={() => navigate(`/dashboard/manage-tickets/view/${ticket.id}`)}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-bold text-[#0052CC]">{ticket.ticket_no}</span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E9F2FF] text-[#0052CC]">
                                            {ticket.status_name}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-base text-[#172B4D] mb-3 line-clamp-2 hover:text-[#0052CC] transition-colors">{ticket.title}</h4>
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs border-t border-[#F4F5F7] pt-4">
                                        <div>
                                            <span className="text-[#8993A4] block font-medium mb-0.5">Project</span>
                                            <span className="text-[#172B4D] font-semibold">{ticket.project_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-[#8993A4] block font-medium mb-0.5">Department</span>
                                            <span className="text-[#172B4D] font-semibold">{ticket.department_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-[#8993A4] block font-medium mb-0.5">Created By</span>
                                            <span className="text-[#172B4D] font-semibold">{ticket.created_by_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-[#8993A4] block font-medium mb-0.5">Due Date</span>
                                            <span className={`font-semibold ${isOverdue(ticket.due_date) ? 'text-[#DE350B]' : 'text-[#172B4D]'}`}>{formatDate(ticket.due_date)}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-[#8993A4] block font-medium mb-0.5">Last Comment</span>
                                            <span className="text-[#172B4D] font-semibold">{formatDate(ticket.last_post_date, true)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <ConfirmDialog
                open={sessionEndModel}
                onConfirm={() => navigate("/login")}
                title="Session Expired"
                description="Your session has expired. Please log in to continue."
                confirmText="Login"
                isDestructive={true}
                closeIcon={false}
            />
        </div>
    );
};

const mapStateToProps = (state) => ({
    sessionEndModel: state.common.sessionEndModel,
})

export default connect(mapStateToProps)(Dashboard)