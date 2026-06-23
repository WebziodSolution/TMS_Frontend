import React, { useState, useEffect } from 'react';
import { Paper, Tabs, Tab, Box, Typography, CircularProgress } from '@mui/material';
import { useForm } from 'react-hook-form';
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faKey, faSave } from '@fortawesome/free-solid-svg-icons';
import CustomInput from '../../components/common/CustomInput';
import CustomSelect from '../../components/common/CustomSelect';
import CustomButton from '../../components/common/CustomButton';
import { getUserById, getNonCustomers } from '../../services/userService';
import { updateUserProfile, changePassword } from '../../services/profileService';
import { setAlert, setLoading } from '../../redux/commonReducers/commonReducers';
import { getUserDetails } from '../../utils/getUserDetails';

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`profile-tabpanel-${index}`}
            aria-labelledby={`profile-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box className="pt-6">
                    {children}
                </Box>
            )}
        </div>
    );
};

const ProfilePage = ({ setAlert, setLoading, loading }) => {
    const [tabVal, setTabVal] = useState(0);
    const currentUser = getUserDetails();
    const currentUserId = currentUser?.id;

    // Managers / Reportees List State
    const [managers, setManagers] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Profile Form
    const {
        control: profileControl,
        handleSubmit: handleProfileSubmit,
        reset: resetProfileForm,
        watch: watchProfile
    } = useForm({
        defaultValues: {
            first_name: '',
            last_name: '',
            report_to: null,
            city: '',
            state: '',
            country: '',
            zip: '',
            phone: '',
            email: '',
            role_id: null
        }
    });

    // Password Form
    const {
        control: passwordControl,
        handleSubmit: handlePasswordSubmit,
        reset: resetPasswordForm,
        watch: watchPassword
    } = useForm({
        defaultValues: {
            current_password: '',
            new_password: '',
            confirm_password: ''
        }
    });

    const watchNewPassword = watchPassword('new_password');

    const handleTabChange = (event, newValue) => {
        setTabVal(newValue);
    };

    const fetchProfileAndManagers = async () => {
        if (!currentUserId) return;
        setLoadingData(true);
        try {
            const [userRes, nonCustomersRes] = await Promise.all([
                getUserById(currentUserId),
                getNonCustomers()
            ]);

            if (userRes?.result) {
                const u = userRes.result;
                resetProfileForm({
                    first_name: u.first_name || '',
                    last_name: u.last_name || '',
                    report_to: u.report_to || null,
                    city: u.city || '',
                    state: u.state || '',
                    country: u.country || '',
                    zip: u.zip || '',
                    phone: u.phone || '',
                    email: u.email || '',
                    role_id: u.role_id || null
                });
            }

            if (nonCustomersRes?.result) {
                // Filter out current user from manager list to prevent reporting to oneself
                const managerOptions = nonCustomersRes.result
                    .filter(u => u.id !== currentUserId)
                    .map(u => ({ label: `${u.first_name} ${u.last_name}`, value: u.id }));
                setManagers(managerOptions);
            }
        } catch (error) {
            console.error("Error loading profile details:", error);
            setAlert({ open: true, message: "Failed to load profile details.", type: "error" });
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        fetchProfileAndManagers();
    }, [currentUserId]);

    const onProfileSubmit = async (data) => {
        if (!currentUserId) return;
        setIsSaving(true);
        try {
            // Re-map fields correctly according to UserUpdate backend schema
            const payload = {
                first_name: data.first_name,
                last_name: data.last_name,
                report_to: data.report_to ? parseInt(data.report_to, 10) : null,
                city: data.city,
                state: data.state,
                country: data.country,
                zip: data.zip,
                phone: data.phone,
                // keep same role and email
                role_id: data.role_id,
                email: data.email
            };

            const res = await updateUserProfile(currentUserId, payload);
            if (res.status === 200) {
                setAlert({ open: true, message: "Profile updated successfully!", type: "success" });
                // Update localStorage with new first/last name
                const localDetails = JSON.parse(localStorage.getItem('user_details') || '{}');
                if (localDetails.firstName !== undefined) {
                    localDetails.firstName = data.first_name;
                    localDetails.lastName = data.last_name;
                    localStorage.setItem('user_details', JSON.stringify(localDetails));
                }
                fetchProfileAndManagers();
            } else {
                setAlert({ open: true, message: res.message || "Failed to update profile.", type: "error" });
            }
        } catch (error) {
            setAlert({ open: true, message: error.message || "Failed to update profile.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    const onPasswordSubmit = async (data) => {
        setIsSaving(true);
        try {
            const payload = {
                current_password: data.current_password,
                new_password: data.new_password
            };
            const res = await changePassword(payload);
            if (res.status === 200) {
                setAlert({ open: true, message: "Password updated successfully!", type: "success" });
                resetPasswordForm({
                    current_password: '',
                    new_password: '',
                    confirm_password: ''
                });
            } else if (res.status === 400) {
                setAlert({ open: true, message: res.message || "Incorrect Current Password.", type: "error" });
            } else {
                setAlert({ open: true, message: res.message || "Failed to update password.", type: "error" });
            }
        } catch (error) {
            setAlert({ open: true, message: error.response?.data?.detail || error.message || "Failed to update password.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <CircularProgress size={45} sx={{ color: '#0052CC' }} />
                <Typography variant="body2" className="text-gray-500 font-medium">
                    Loading profile details...
                </Typography>
            </div>
        );
    }

    return (
        <div className="mx-auto space-y-6 animate-fade-in font-sans px-4">
            {/* <Paper className="border border-[#DFE1E6] rounded-2xl shadow-sm bg-white overflow-hidden"> */}
            {/* Tabs Panel */}
            <div>
                <Tabs
                    value={tabVal}
                    onChange={handleTabChange}
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#5E6C84',
                            minWidth: '120px',
                            '&.Mui-selected': {
                                color: '#0052CC',
                            },
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#0052CC',
                            height: '3px',
                            borderRadius: '3px 3px 0 0'
                        }
                    }}
                >
                    <Tab icon={<FontAwesomeIcon icon={faUser} className="mr-2" />} iconPosition="start" label="Edit Profile" />
                    <Tab icon={<FontAwesomeIcon icon={faKey} className="mr-2" />} iconPosition="start" label="Change Password" />
                </Tabs>
            </div>

            {/* Tab Contents */}
            <div>
                {/* EDIT PROFILE TAB */}
                <TabPanel value={tabVal} index={0}>
                    <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <CustomInput
                                name="first_name"
                                control={profileControl}
                                label="First Name"
                                rules={{ required: "First name is required" }}
                            />
                            <CustomInput
                                name="last_name"
                                control={profileControl}
                                label="Last Name"
                                rules={{ required: "Last name is required" }}
                            />
                            <CustomInput
                                name="email"
                                control={profileControl}
                                label="Email Address"
                                disabled={true}
                            />
                            <CustomInput
                                name="phone"
                                control={profileControl}
                                label="Phone Number"
                            />

                            {/* Manager Dropdown: only show for Developer or other roles that have report_to setup */}
                            <div className="sm:col-span-2">
                                <CustomSelect
                                    name="report_to"
                                    control={profileControl}
                                    label="Reporting Manager"
                                    options={managers}
                                />
                            </div>

                            <CustomInput
                                name="city"
                                control={profileControl}
                                label="City"
                            />
                            <CustomInput
                                name="state"
                                control={profileControl}
                                label="State / Province"
                            />
                            <CustomInput
                                name="country"
                                control={profileControl}
                                label="Country"
                            />
                            <CustomInput
                                name="zip"
                                control={profileControl}
                                label="Zip Code"
                            />
                        </div>

                        <div className="flex justify-end pt-4 border-t border-[#DFE1E6]">
                            <CustomButton
                                type="submit"
                                disabled={isSaving}
                                startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <FontAwesomeIcon icon={faSave} />}
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </CustomButton>
                        </div>
                    </form>
                </TabPanel>

                {/* CHANGE PASSWORD TAB */}
                <TabPanel value={tabVal} index={1}>
                    <div className='flex justify-center items-center'>
                        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className='max-w-96 w-full space-y-6'>
                            <CustomInput
                                name="current_password"
                                control={passwordControl}
                                label="Current Password"
                                type="password"
                                rules={{ required: "Current password is required" }}
                            />
                            <div className='my-3'>
                                <CustomInput
                                    name="new_password"
                                    control={passwordControl}
                                    label="New Password"
                                    type="password"
                                    rules={{
                                        required: "New password is required",
                                        minLength: { value: 6, message: "Password must be at least 6 characters" }
                                    }}
                                />
                            </div>
                            <CustomInput
                                name="confirm_password"
                                control={passwordControl}
                                label="Confirm New Password"
                                type="password"
                                rules={{
                                    required: "Please confirm your new password",
                                    validate: value => value === watchNewPassword || "Passwords do not match"
                                }}
                            />

                            <div className="flex justify-end pt-4 border-t border-[#DFE1E6]">
                                <CustomButton
                                    type="submit"
                                    disabled={isSaving}
                                    startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <FontAwesomeIcon icon={faSave} />}
                                >
                                    {isSaving ? "Updating Password..." : "Update Password"}
                                </CustomButton>
                            </div>
                        </form>
                    </div>
                </TabPanel>
            </div>
            {/* </Paper> */}
        </div>
    );
};

const mapStateToProps = (state) => ({
    loading: state.common.loading
});

const mapDispatchToProps = {
    setLoading,
    setAlert
};

export default connect(mapStateToProps, mapDispatchToProps)(ProfilePage);
