import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { TextField } from '@mui/material';
import CustomModalWrapper from '../../components/common/CustomModalWrapper';

const ReasonModal = ({
    open,
    onClose,
    onSubmit,
    title = "Timer Action",
    submitText = "Submit",
    isSubmitting = false
}) => {
    const { control, handleSubmit, reset } = useForm({
        defaultValues: {
            reason: ""
        }
    });

    useEffect(() => {
        if (open) {
            reset({ reason: "" });
        }
    }, [open, reset]);

    const handleFormSubmit = (data) => {
        onSubmit(data.reason);
    };

    return (
        <CustomModalWrapper
            open={open}
            onClose={onClose}
            title={title}
            onSubmit={handleSubmit(handleFormSubmit)}
            isSubmitting={isSubmitting}
            submitText={submitText}
            maxWidth="sm"
        >
            <div className="flex flex-col gap-2">
                <Controller
                    name="reason"
                    control={control}
                    rules={{ required: "Reason is required" }}
                    render={({ field, fieldState: { error } }) => (
                        <TextField
                            {...field}
                            margin="dense"
                            label="Reason"
                            type="text"
                            fullWidth
                            multiline
                            rows={2}
                            variant="outlined"
                            error={!!error}
                            size="small"
                        />
                    )}
                />
            </div>
        </CustomModalWrapper>
    );
};

export default ReasonModal;
