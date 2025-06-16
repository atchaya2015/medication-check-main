
import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '../supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CaretakerDoseLoggingProps {
    patientUserId: string;

    medicationIdToLog: string;
}

const CaretakerDoseLogging: React.FC<CaretakerDoseLoggingProps> = ({ patientUserId, medicationIdToLog }) => {
    const queryClient = useQueryClient();

    const logDoseByCaretakerMutation = useMutation({
        mutationFn: async ({ patientId, medId }: { patientId: string; medId: string }) => {
            
            const { data, error } = await supabase
                .from('medication_doses')
                .insert([
                    {
                        medication_id: medId,
                        taken_at: new Date().toISOString(),
                        
                    }
                ])
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
           
            queryClient.invalidateQueries({ queryKey: ['patientDoses', patientUserId] });
           
            queryClient.invalidateQueries({ queryKey: ['allUserDoses', patientUserId] });
            console.log("Dose logged by caretaker, dashboards updated.");
        },
        onError: (error) => {
            console.error("Error logging dose by caretaker:", error.message);
            alert("Failed to log dose: " + error.message);
        }
    });

    const handleLogDose = () => {
        if (!medicationIdToLog) {
            alert("Please select a medication to log.");
            return;
        }
        logDoseByCaretakerMutation.mutate({ patientId: patientUserId, medId: medicationIdToLog });
    };

    return (
        <Button onClick={handleLogDose} disabled={logDoseByCaretakerMutation.isPending}>
            {logDoseByCaretakerMutation.isPending ? 'Logging...' : 'Log Dose for Patient'}
        </Button>
    );
};

export default CaretakerDoseLogging;