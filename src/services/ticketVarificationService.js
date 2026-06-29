import { ticketVarificationURL } from '../config/config';
import axiosInterceptor from './axiosInterceptor';

export const addTicketVarification = async (data) => {
    try {
        const response = await axiosInterceptor.post(ticketVarificationURL, data);
        return response.data;
    } catch (error) {
        console.error("Error adding ticket verification:", error);
        throw error;
    }
};

export const getAllTicketVarifications = async () => {
    try {
        const response = await axiosInterceptor.get(ticketVarificationURL);
        return response.data;
    } catch (error) {
        console.error("Error fetching all ticket verifications:", error);
        throw error;
    }
};

export const getTicketVarificationsByTicketId = async (ticketId) => {
    try {
        const response = await axiosInterceptor.get(`${ticketVarificationURL}/ticket/${ticketId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching verifications for ticket ${ticketId}:`, error);
        throw error;
    }
};

export const updateTicketVarification = async (id, data) => {
    try {
        const response = await axiosInterceptor.put(`${ticketVarificationURL}/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Error updating ticket verification ${id}:`, error);
        throw error;
    }
};

export const deleteTicketVarification = async (id) => {
    try {
        const response = await axiosInterceptor.delete(`${ticketVarificationURL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting ticket verification ${id}:`, error);
        throw error;
    }
};
