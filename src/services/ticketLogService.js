import { ticketChangeLogURL } from '../config/config';
import axiosInterceptor from './axiosInterceptor';

export const createTicketLog = async (data) => {
    try {
        const response = await axiosInterceptor.post(ticketChangeLogURL, data);
        return response.data;
    } catch (error) {
        console.error("Error creating ticket log:", error);
        throw error;
    }
};

export const getAllTicketLogs = async () => {
    try {
        const response = await axiosInterceptor.get(ticketChangeLogURL);
        return response.data;
    } catch (error) {
        console.error("Error fetching all ticket logs:", error);
        throw error;
    }
};

export const getTicketLogsByTicketId = async (ticketId) => {
    try {
        const response = await axiosInterceptor.get(`${ticketChangeLogURL}/ticket/${ticketId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ticket logs for ticket ${ticketId}:`, error);
        throw error;
    }
};

export const updateTicketLog = async (id, data) => {
    try {
        const response = await axiosInterceptor.put(`${ticketChangeLogURL}/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Error updating ticket log ${id}:`, error);
        throw error;
    }
};

export const deleteTicketLog = async (id) => {
    try {
        const response = await axiosInterceptor.delete(`${ticketChangeLogURL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting ticket log ${id}:`, error);
        throw error;
    }
};
