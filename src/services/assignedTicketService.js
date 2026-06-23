import axiosInterceptor from './axiosInterceptor';
import { assigneesURL } from '../config/config';

export const updateTicketAssignees = async (ticketId, data) => {
    try {
        const response = await axiosInterceptor.put(`${assigneesURL}/${ticketId}`, data);
        return response.data;
    } catch (error) {
        console.error(`Error updating assigned tickets for ticket ${ticketId}:`, error);
        throw error;
    }
};
