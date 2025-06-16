
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Medication, NewMedication } from '../types';
import { AppError, handleSupabaseError } from '../utils/errorHandler';
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";




import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, Pill, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; // This will be used for Frequency
import { Label } from "@/components/ui/label";


interface MedicationListProps {
  userId: string; 
  onSelectMedication: (medication: Medication | null) => void; 
  selectedMedication: Medication | null; 
}



const MedicationList: React.FC<MedicationListProps> = ({ userId, onSelectMedication, selectedMedication }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
 
  const [formState, setFormState] = useState<NewMedication>({ name: '', dosage: '', frequency: '', time_of_day: [] });
  

  
  const { data: medications, isLoading, isError, error } = useQuery<Medication[], AppError>({
    queryKey: ['medications', userId],
    queryFn: async () => {
      if (!userId) throw new AppError("User not authenticated.");
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw handleSupabaseError(error, 'Failed to fetch medications.');
      return (data as Medication[]) || [];
    },
    enabled: !!userId, 
  });

  
  const addMedicationMutation = useMutation<Medication, AppError, NewMedication>({
    mutationFn: async (newMed: NewMedication) => {
      if (!userId) throw new AppError("User not authenticated.");
      const { data, error } = await supabase
        .from('medications')
        .insert({ ...newMed, user_id: userId, time_of_day: newMed.time_of_day || [] }) // Ensure time_of_day is stored as an empty array
        .select()
        .single();
      if (error) throw handleSupabaseError(error, 'Failed to add medication.');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', userId] });
      toast({ title: "Medication Added", description: "Your new medication has been added successfully." });
      setIsDialogOpen(false);
      setFormState({ name: '', dosage: '', frequency: '', time_of_day: [] }); // Reset with empty time_of_day
    },
    onError: (mutationError) => {
      toast({ title: "Error Adding Medication", description: mutationError.message, variant: "destructive" });
    },
  });

 
  const updateMedicationMutation = useMutation<Medication, AppError, Medication>({
    mutationFn: async (updatedMed: Medication) => {
      if (!userId) throw new AppError("User not authenticated.");
      const { data, error } = await supabase
        .from('medications')
        .update({ ...updatedMed, time_of_day: updatedMed.time_of_day || [] }) 
        .eq('id', updatedMed.id)
        .eq('user_id', userId) 
        .select()
        .single();
      if (error) throw handleSupabaseError(error, 'Failed to update medication.');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', userId] });
      toast({ title: "Medication Updated", description: "Medication details updated successfully." });
      setIsDialogOpen(false);
      setEditingMedication(null);
      setFormState({ name: '', dosage: '', frequency: '', time_of_day: [] }); 
    },
    onError: (mutationError) => {
      toast({ title: "Error Updating Medication", description: mutationError.message, variant: "destructive" });
    },
  });

  
  const deleteMedicationMutation = useMutation<void, AppError, string>({
    mutationFn: async (medicationId: string) => {
      if (!userId) throw new AppError("User not authenticated.");
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', medicationId)
        .eq('user_id', userId); 
      if (error) throw handleSupabaseError(error, 'Failed to delete medication.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', userId] });
      toast({ title: "Medication Deleted", description: "Medication removed successfully." });
    },
    onError: (mutationError) => {
      toast({ title: "Error Deleting Medication", description: mutationError.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMedication) {

      updateMedicationMutation.mutate({ ...editingMedication, ...formState });
    } else {
      
      addMedicationMutation.mutate({ ...formState, time_of_day: [] });
    }
  };

  const handleEditClick = (med: Medication) => {
    setEditingMedication(med);
    setFormState({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      time_of_day: med.time_of_day || []
    });
    setIsDialogOpen(true);
  };

  

  if (isLoading) {
    return <Card><CardContent className="p-6 text-center">Loading medications...</CardContent></Card>;
  }

  if (isError) {
    return <Card><CardContent className="p-6 text-red-500">Error: {error?.message}</CardContent></Card>;
  }

  
  if (selectedMedication) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medication Details</CardTitle>
          <CardDescription>
            <Button variant="outline" onClick={() => onSelectMedication(null)} className="mt-2">
              <X className="w-4 h-4 mr-2" /> Close Details
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Displaying details for: {selectedMedication.name}</p>
          <p>The PatientDashboard will render the DoseTracker for this medication.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Your Medications</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingMedication(null); setFormState({ name: '', dosage: '', frequency: '', time_of_day: [] }); }}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add New
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingMedication ? 'Edit Medication' : 'Add New Medication'}</DialogTitle>
              <CardDescription>{editingMedication ? 'Update the details for your medication.' : 'Add a new medication to your tracking list.'}</CardDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={formState.name} onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dosage" className="text-right">Dosage</Label>
                <Input id="dosage" value={formState.dosage} onChange={(e) => setFormState(prev => ({ ...prev, dosage: e.target.value }))} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="frequency" className="text-right">Frequency</Label>
                
                <Input
                  id="frequency"
                  value={formState.frequency}
                  onChange={(e) => setFormState(prev => ({ ...prev, frequency: e.target.value }))}
                  placeholder="e.g., Daily, Twice a day, As needed" // Added placeholder
                  className="col-span-3"
                  required 
                />
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={addMedicationMutation.isPending || updateMedicationMutation.isPending}>
                  {(addMedicationMutation.isPending || updateMedicationMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingMedication ? 'Save Changes' : 'Add Medication'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {medications && medications.length > 0 ? (
          <div className="grid gap-4">
            {medications.map((med) => (
              <Card key={med.id} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectMedication(med)}>
                <div className="flex items-center gap-3">
                  <Pill className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="font-semibold text-lg">{med.name}</h3>
                    <p className="text-sm text-muted-foreground">{med.dosage} • {med.frequency}</p>
                    {/* Display time_of_day only if it exists and has items */}
                    {med.time_of_day && med.time_of_day.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {med.time_of_day.map(time => (
                          <Badge key={time} variant="secondary" className="text-xs">
                            {time}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditClick(med); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMedicationMutation.mutate(med.id); }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No medications added yet. Click "Add New" to get started!</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicationList;