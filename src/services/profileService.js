import axiosInterceptor from './axiosInterceptor';
import { userURL } from '../config/config';

export const updateUserProfile = async (id, data) => {
    try {
        const response = await axiosInterceptor.put(`${userURL}/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Error updating user profile ${id}:`, error);
        throw error;
    }
};

export const changePassword = async (data) => {
    try {
        const response = await axiosInterceptor.post(`${userURL}/change-password`, data);
        return response.data;
    } catch (error) {
        console.error("Error changing password:", error);
        throw error;
    }
};
