import axiosInterceptor from './axiosInterceptor';
import { projectURL } from '../config/config';

export const getAllProjects = async () => {
    try {
        const response = await axiosInterceptor.get(projectURL);
        return response.data;
    } catch (error) {
        console.error("Error fetching all projects:", error);
        
    }
};

export const getProjectById = async (id) => {
    try {
        const response = await axiosInterceptor.get(`${projectURL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching project ${id}:`, error);
        
    }
};

export const addProject = async (data) => {
    try {
        const response = await axiosInterceptor.post(projectURL, data);
        return {
            ...response.data,
            status: response.status
        };
    } catch (error) {
        console.error("Error adding project:", error);
        return {
            status: error.response?.status || 500,
            message: error.response?.data?.message || error.message || "Failed to add project."
        };
    }
};

export const updateProject = async (id, data) => {
    try {
        const response = await axiosInterceptor.put(`${projectURL}/${id}`, data);
        return {
            ...response.data,
            status: response.status
        };
    } catch (error) {
        console.error(`Error updating project ${id}:`, error);
        return {
            status: error.response?.status || 500,
            message: error.response?.data?.message || error.message || `Failed to update project ${id}.`
        };
    }
};

export const deleteProject = async (id) => {
    try {
        const response = await axiosInterceptor.delete(`${projectURL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting project ${id}:`, error);
        
    }
};

export const addToWatchlist = async (projectId) => {
    try {
        const response = await axiosInterceptor.post(`${projectURL}/${projectId}/watchlist`);
        return response.data;
    } catch (error) {
        console.error(`Error adding project ${projectId} to watchlist:`, error);
        
    }
};

export const removeFromWatchlist = async (projectId) => {
    try {
        const response = await axiosInterceptor.delete(`${projectURL}/${projectId}/watchlist`);
        return response.data;
    } catch (error) {
        console.error(`Error removing project ${projectId} from watchlist:`, error);
        
    }
};

