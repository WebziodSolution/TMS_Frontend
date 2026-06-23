import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation, Outlet } from 'react-router-dom';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import SetPassword from './pages/Auth/SetPassword';
import ForgotPassword from './pages/Auth/ForgotPassword';

import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/Dashboard';
import ManageUsers from './pages/Users/ManageUsers';
import ManageDepartments from './pages/Departments/ManageDepartments';
import ManageStatus from './pages/Status/ManageStatus';
import ManageProjects from './pages/Projects/ManageProjects';
import ManageTickets from './pages/Tickets/ManageTickets';
import TicketViewPage from './pages/Tickets/TicketViewPage';
import ManageRoles from './pages/Roles/ManageRoles';
import RoleFormPage from './pages/Roles/RoleFormPage';
import ManageCompanies from './pages/Companies/ManageCompanies';
import DailyReports from './pages/Reports/DailyReports';
import MonthlyReport from './pages/Reports/MonthlyReport';
import WorkLog from './pages/WorkLog/WorkLog';
import Loader from './components/common/loader/loader';
import ProfilePage from './pages/Profile/Profile';


const RouteTitleHandler = () => {
    const location = useLocation();

    useEffect(() => {
        const getTitleFromPathname = (pathname) => {
            if (pathname === '/login') return 'Login';
            if (pathname === '/register') return 'Register';
            if (pathname === '/set-password') return 'Set Password';
            if (pathname === '/forgot-password') return 'Forgot Password';
            
            if (pathname === '/dashboard') return 'Dashboard';
            if (pathname === '/dashboard/manage-user') return 'Manage Users';
            if (pathname === '/dashboard/manage-tickets') return 'Manage Tickets';
            if (pathname.startsWith('/dashboard/manage-tickets/view/')) return 'View Ticket';
            if (pathname === '/dashboard/manage-department') return 'Manage Departments';
            if (pathname === '/dashboard/manage-project') return 'Manage Projects';
            if (pathname === '/dashboard/manage-ticket-status') return 'Manage Status';
            if (pathname === '/dashboard/manage-role') return 'Manage Roles';
            if (pathname === '/dashboard/manage-role/add') return 'Add Role';
            if (pathname.startsWith('/dashboard/manage-role/edit/')) return 'Edit Role';
            if (pathname === '/dashboard/manage-company') return 'Manage Companies';
            if (pathname === '/dashboard/dailyreport') return 'Daily Report';
            if (pathname === '/dashboard/monthlyreport') return 'Monthly Report';
            if (pathname === '/dashboard/worklog') return 'Work Logs';
            if (pathname === '/dashboard/profile') return 'Profile';
            
            return '';

        };

        const pageTitle = getTitleFromPathname(location.pathname);
        document.title = pageTitle ? `${pageTitle} - TMS` : 'TMS';
    }, [location]);

    return <Outlet />;
};

const router = createBrowserRouter([
    {
        element: <RouteTitleHandler />,
        children: [
            {
                path: "/",
                element: <Navigate to="/login" replace />
            },
            {
                path: "/login",
                element: <Login />
            },
            {
                path: "/register",
                element: <Register />
            },
            {
                path: "/set-password",
                element: <SetPassword />
            },
            {
                path: "/forgot-password",
                element: <ForgotPassword />
            },
            {
                path: "/dashboard",
                element: <DashboardLayout />,
                children: [
                    {
                        index: true,
                        element: <DashboardOverview />
                    },
                    {
                        path: "manage-user",
                        element: <ManageUsers />
                    },
                    {
                        path: "manage-tickets",
                        element: <ManageTickets />
                    },
                    {
                        path: "manage-tickets/view/:id",
                        element: <TicketViewPage />
                    },
                    {
                        path: "manage-department",
                        element: <ManageDepartments />
                    },
                    {
                        path: "manage-project",
                        element: <ManageProjects />
                    },
                    {
                        path: "manage-ticket-status",
                        element: <ManageStatus />
                    },
                    {
                        path: "manage-role",
                        element: <ManageRoles />
                    },
                    {
                        path: "manage-role/add",
                        element: <RoleFormPage />
                    },
                    {
                        path: "manage-role/edit/:id",
                        element: <RoleFormPage />
                    },
                    {
                        path: "manage-company",
                        element: <ManageCompanies />
                    },
                    {
                        path: "dailyreport",
                        element: <DailyReports />
                    },
                    {
                        path: "monthlyreport",
                        element: <MonthlyReport />
                    },
                    {
                        path: "worklog",
                        element: <WorkLog />
                    },
                    {
                        path: "profile",
                        element: <ProfilePage />
                    }
                ]

            }
        ]
    }
]);

const AppRoutes = () => {
    return <RouterProvider router={router} fallbackElement={<Loader />} />;
};

export default AppRoutes;
