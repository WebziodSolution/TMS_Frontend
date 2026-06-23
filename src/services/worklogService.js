import axiosInterceptor from './axiosInterceptor';
import { worklogURL } from '../config/config';

export const getWorkLogs = async (dateFrom, dateTo) => {
    try {
        let url = `${worklogURL}?`;
        if (dateFrom) {
            url += `&date_from=${dateFrom}`;
        }
        if (dateTo) {
            url += `&date_to=${dateTo}`;
        }
        const response = await axiosInterceptor.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching work logs:", error);
        throw error;
    }
};
