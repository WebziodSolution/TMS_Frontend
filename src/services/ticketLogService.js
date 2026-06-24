import axiosInterceptor from './axiosInterceptor';
import { ticketLogURL } from '../config/config';

export const executeTicketLogAction = async (ticketId, action, note = null) => {
    try {
        const payload = { ticket_id: ticketId, action, note };
        const response = await axiosInterceptor.post(`${ticketLogURL}/action`, payload);
        return response.data;
    } catch (error) {
        console.error(`Error executing ticket log action "${action}":`, error);
        throw error;
    }
};

export const getActiveTicketLogs = async (ticketId) => {
    try {
        const response = await axiosInterceptor.get(`${ticketLogURL}/ticket/${ticketId}/active`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching active ticket logs for ticket ${ticketId}:`, error);
        throw error;
    }
};

export const getTicketLogHistory = async (ticketId) => {
    try {
        const response = await axiosInterceptor.get(`${ticketLogURL}/ticket/${ticketId}/history`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ticket log history for ticket ${ticketId}:`, error);
        throw error;
    }
};

// --- CRUD functions for completeness ---

export const createTicketLog = async (data) => {
    try {
        const response = await axiosInterceptor.post(ticketLogURL, data);
        return response.data;
    } catch (error) {
        console.error("Error creating ticket log:", error);
        throw error;
    }
};

export const getTicketLog = async (id) => {
    try {
        const response = await axiosInterceptor.get(`${ticketLogURL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ticket log ${id}:`, error);
        throw error;
    }
};

export const updateTicketLog = async (id, data) => {
    try {
        const response = await axiosInterceptor.put(`${ticketLogURL}/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Error updating ticket log ${id}:`, error);
        throw error;
    }
};

export const deleteTicketLog = async (id) => {
    try {
        const response = await axiosInterceptor.delete(`${ticketLogURL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting ticket log ${id}:`, error);
        throw error;
    }
};

export const checkCurrentWork = async () => {
    try {
        const response = await axiosInterceptor.get(`${ticketLogURL}/check/current_work`);
        return response.data;
    } catch (error) {
        console.error(`Error checking current work:`, error);
        throw error;
    }
};
