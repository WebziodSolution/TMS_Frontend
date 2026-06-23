import axiosInterceptor from './axiosInterceptor';
import { reportURL } from '../config/config';
export const getDailyReport = async (date) => {
    try {
        const response = await axiosInterceptor.get(`${reportURL}/daily?date=${date}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching daily report:", error);
        throw error;
    }
};

export const getMonthlyReport = async (startDate, endDate, groupBy = "ticket") => {
    try {
        const response = await axiosInterceptor.get(`${reportURL}/monthly?start_date=${startDate}&end_date=${endDate}&group_by=${groupBy}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching monthly report:", error);
        throw error;
    }
};

export const exportMonthlyReportExcel = async (startDate, endDate, groupBy = "ticket") => {
    try {
        const response = await axiosInterceptor.get(
            `${reportURL}/monthly/export?start_date=${startDate}&end_date=${endDate}&group_by=${groupBy}`,
            { responseType: 'blob' }
        );
        return response.data;
    } catch (error) {
        console.error("Error exporting monthly report to Excel:", error);
        throw error;
    }
};

export const exportDailyReportExcel = async (date) => {
    try {
        const response = await axiosInterceptor.get(
            `${reportURL}/daily/export?date=${date}`,
            { responseType: 'blob' }
        );
        return response.data;
    } catch (error) {
        console.error("Error exporting daily report to Excel:", error);
        throw error;
    }
};
