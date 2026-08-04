import axiosInterceptor from './axiosInterceptor';
import { departmentURL } from '../config/config';

export const getDepartmentHierarchy = async () => {
    try {
        const response = await axiosInterceptor.get(`${departmentURL}/hierarchy`);
        return response.data;
    } catch (error) {
        console.error("Error fetching department hierarchy:", error);
        
    }
};

export const getAllDepartments = async () => {
    try {
        const response = await axiosInterceptor.get(departmentURL);
        return response.data;
    } catch (error) {
        console.error("Error fetching all departments:", error);
        
    }
};

export const getDepartmentById = async (id) => {
    try {
        const response = await axiosInterceptor.get(`${departmentURL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching department ${id}:`, error);
        
    }
};

export const addDepartment = async (data) => {
    try {
        const response = await axiosInterceptor.post(departmentURL, data);
        return {
            ...response.data,
            status: response.status
        };
    } catch (error) {
        console.error("Error adding department:", error);
        return {
            status: error.response?.status || 500,
            message: error.response?.data?.message || error.message || "Failed to add department."
        };
    }
};

export const updateDepartment = async (id, data) => {
    try {
        const response = await axiosInterceptor.put(`${departmentURL}/${id}`, data);
        return {
            ...response.data,
            status: response.status
        };
    } catch (error) {
        console.error(`Error updating department ${id}:`, error);
        return {
            status: error.response?.status || 500,
            message: error.response?.data?.message || error.message || `Failed to update department ${id}.`
        };
    }
};

export const deleteDepartment = async (id) => {
    try {
        const response = await axiosInterceptor.delete(`${departmentURL}/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting department ${id}:`, error);
        
    }
};
