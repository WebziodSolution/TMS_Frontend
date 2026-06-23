import React, { useState, useEffect } from 'react';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { connect } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faBuilding, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { deleteDepartment, getDepartmentHierarchy } from '../../services/departmentService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PermissionWrapper from '../../components/permissionWrapper/PermissionWrapper';
import CustomButton from '../../components/common/CustomButton';
import DepartmentFormDialog from './DepartmentFormDialog';
import { setAlert } from '../../redux/commonReducers/commonReducers';

const ManageDepartments = ({ setAlert }) => {
    const [departments, setDepartments] = useState([]);
    const [collapsedIds, setCollapsedIds] = useState(new Set());
    const [actionLoading, setActionLoading] = useState(false);

    // Dialog state
    const [openDialog, setOpenDialog] = useState(false);
    const [editingDepartmentId, setEditingDepartmentId] = useState(null);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const fetchDepartments = async () => {
        try {
            const res = await getDepartmentHierarchy();
            setDepartments(res.result || []);
        } catch (err) {
            console.error(err);
            setAlert({ open: true, message: "Failed to load departments.", type: "error" });
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const toggleCollapse = (id) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const getVisibleDepartments = (nodes, depth = 0) => {
        let list = [];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const hasChildren = node.data && node.data.length > 0;
            const isCollapsed = collapsedIds.has(node.id);

            list.push({
                ...node,
                depth,
                hasChildren,
                isCollapsed
            });

            if (hasChildren && !isCollapsed) {
                list = list.concat(getVisibleDepartments(node.data, depth + 1));
            }
        }
        return list;
    };

    const visibleDepartments = getVisibleDepartments(departments);

    const handleOpen = (department = null) => {
        setEditingDepartmentId(department ? department.id : null);
        setOpenDialog(true);
    };

    const handleClose = () => {
        setOpenDialog(false);
        setEditingDepartmentId(null);
    };

    const openDeleteConfirm = (department) => {
        setDeleteConfirmOpen({ open: true, department });
    };

    const handleDelete = async () => {
        const id = deleteConfirmOpen.department?.id;
        if (!id) return;

        setActionLoading(true);
        try {
            await deleteDepartment(id);
            fetchDepartments();
            setDeleteConfirmOpen({ open: false, department: null });
            setAlert({ open: true, message: "Department deleted successfully.", type: "success" });
        } catch (err) {
            console.error(err);
            setAlert({ open: true, message: err.message || "Failed to delete department.", type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-4 max-w-7xl mx-auto">
            {/* Toolbar */}
            <div className="flex justify-end">
                <PermissionWrapper
                    functionalityName="manage department"
                    moduleName="Departments"
                    actionId={1}
                    component={
                        <CustomButton
                            startIcon={<FontAwesomeIcon icon={faPlus} />}
                            onClick={() => handleOpen()}
                        >
                            Add Department
                        </CustomButton>
                    }
                />
            </div>

            {/* Content Section */}
            <div className="bg-white border border-[#DFE1E6] rounded-xl shadow-sm overflow-hidden">
                {departments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-[#F4F5F7] rounded-full flex items-center justify-center mb-4 text-[#8993A4]">
                            <FontAwesomeIcon icon={faBuilding} size="2x" />
                        </div>
                        <h3 className="text-lg font-semibold text-[#172B4D] mb-1">No departments found</h3>
                        <p className="text-[#5E6C84] mb-4">Get started by creating your first department.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#DFE1E6]">
                            <thead className="bg-[#FAFBFC]">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#8993A4] uppercase tracking-wider">
                                        Department Name
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-[#8993A4] uppercase tracking-wider w-24">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-[#DFE1E6]">
                                {visibleDepartments.map((dept) => (
                                    <tr key={dept.id} className="hover:bg-[#FAFBFC] transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center" style={{ paddingLeft: `${dept.depth * 24}px` }}>
                                                {dept.hasChildren ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCollapse(dept.id)}
                                                        className="w-6 h-6 mr-2 flex items-center justify-center rounded font-semibold text-[#5E6C84] hover:bg-[#F4F5F7] transition-colors focus:outline-none"
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={dept.isCollapsed ? faChevronRight : faChevronDown}
                                                            size="xs"
                                                        />
                                                    </button>
                                                ) : (
                                                    <div className="w-6 h-6 mr-2" />
                                                )}
                                                <div className={`text-sm font-semibold text-[#172B4D]`}>
                                                    {dept.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div>
                                                <PermissionWrapper
                                                    functionalityName="manage department"
                                                    moduleName="Departments"
                                                    actionId={2}
                                                    component={
                                                        <Tooltip title="Edit">
                                                            <IconButton onClick={() => handleOpen(dept)} size="small" sx={{ color: '#4C9AFF', '&:hover': { backgroundColor: '#E9F2FF' } }}>
                                                                <FontAwesomeIcon icon={faEdit} size="sm" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    }
                                                />
                                                <PermissionWrapper
                                                    functionalityName="manage department"
                                                    moduleName="Departments"
                                                    actionId={3}
                                                    component={
                                                        <Tooltip title="Delete">
                                                            <IconButton onClick={() => openDeleteConfirm(dept)} size="small" sx={{ color: '#DE350B', ml: 1, '&:hover': { backgroundColor: '#FFEBE6' } }}>
                                                                <FontAwesomeIcon icon={faTrash} size="sm" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    }
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <DepartmentFormDialog
                open={openDialog}
                onClose={handleClose}
                onSuccess={() => {
                    fetchDepartments();
                    handleClose();
                }}
                editingDepartmentId={editingDepartmentId}
            />

            <ConfirmDialog
                open={deleteConfirmOpen.open}
                onClose={() => setDeleteConfirmOpen({ open: false, department: null })}
                onConfirm={handleDelete}
                title="Delete Department"
                description={`Are you sure you want to delete ${deleteConfirmOpen.department?.name}? `}
                confirmText="Delete"
                isDestructive={true}
            />
        </div>
    );
};

const mapStateToProps = (state) => ({});

const mapDispatchToProps = {
    setAlert
};

export default connect(mapStateToProps, mapDispatchToProps)(ManageDepartments);
