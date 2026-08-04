import axiosInterceptor from './axiosInterceptor';

export const filterTickets = async (filter) => {
    try {
        const response = await axiosInterceptor.post('/tickets/filter', filter);
        return response.data;
    } catch (error) {
        console.error("Error filtering tickets:", error);
        
    }
};

export const getAllTickets = async () => {
    try {
        const response = await axiosInterceptor.get('/tickets');
        return response.data;
    } catch (error) {
        console.error("Error fetching all tickets:", error);
        
    }
};

export const getTicketById = async (id) => {
    try {
        const response = await axiosInterceptor.get(`/tickets/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ticket ${id}:`, error);
        
    }
};

export const addTicket = async (data) => {
    try {
        const response = await axiosInterceptor.post('/tickets', data);
        return response.data;
    } catch (error) {
        console.error("Error adding ticket:", error);
        
    }
};

export const updateTicket = async (id, data) => {
    try {
        const response = await axiosInterceptor.put(`/tickets/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Error updating ticket ${id}:`, error);
        
    }
};

export const deleteTicket = async (id) => {
    try {
        const response = await axiosInterceptor.delete(`/tickets/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting ticket ${id}:`, error);
        
    }
};

export const updateTicketStatus = async (id, statusId, internalQa = null) => {
    try {
        const payload = { status_id: statusId };
        if (internalQa) payload.internal_qa = internalQa;
        const response = await axiosInterceptor.patch(`/tickets/${id}/status`, payload);
        return response.data;
    } catch (error) {
        console.error(`Error updating ticket status ${id}:`, error);
        
    }
};

export const updateTicketTitle = async (id, title) => {
    try {
        const response = await axiosInterceptor.patch(`/tickets/${id}/title`, { title });
        return response.data;
    } catch (error) {
        console.error(`Error updating ticket title ${id}:`, error);
        
    }
};

export const updateAssigneeSendMail = async (ticketId, userId, sendMail) => {
    try {
        const response = await axiosInterceptor.patch(`/tickets/${ticketId}/assignee/send-mail`, {
            user_id: userId,
            send_mail: sendMail
        });
        return response.data;
    } catch (error) {
        console.error(`Error updating assignee send mail settings for ticket ${ticketId}:`, error);
        
    }
};

export const getTicketsByProjectId = async (projectId) => {
    try {
        const response = await axiosInterceptor.get(`/tickets/project/${projectId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching tickets for project ${projectId}:`, error);
        
    }
};

export const closeOrReopenTicket = async (ticketId, statusId = null) => {
    try {
        const response = await axiosInterceptor.post(`/tickets/${ticketId}/close-reopen`, { status_id: statusId });
        return response.data;
    } catch (error) {
        console.error(`Error closing/reopening ticket ${ticketId}:`, error);
        
    }
};