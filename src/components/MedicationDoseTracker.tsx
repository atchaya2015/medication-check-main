

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Medication, MedicationDose, MedicalReport } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppError, handleSupabaseError } from '../utils/errorHandler';
import { useToast } from "@/components/ui/use-toast";
import { format, isToday as _isToday, parseISO, isPast, isBefore, startOfDay, addDays } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Check, Image, Camera, Clock, Trash2,  ArrowLeft, Plus, Pill } from "lucide-react"; // <-- Added Pill here
import { Badge } from "@/components/ui/badge";

interface MedicationDoseTrackerProps {
  medication: Medication;
  onBack: () => void;
  userId: string;
  selectedDate: Date;
}

const BUCKET_NAME = 'medicare-files';

const MedicationDoseTracker: React.FC<MedicationDoseTrackerProps> = ({ medication, onBack, userId, selectedDate }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000); 

    return () => clearInterval(timer);
  }, []);

  const selectedDateFormatted = format(selectedDate, 'yyyy-MM-dd');

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  
  const { data: doses, isLoading: isLoadingDoses, isError: isErrorDoses, error: dosesError } = useQuery<MedicationDose[], AppError>({
    queryKey: ['medicationDoses', medication.id, userId, selectedDateFormatted],
    queryFn: async () => {
      if (!userId) throw new AppError("User not authenticated for dose tracking.");

      const startOfDaySelected = format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
      const endOfDaySelected = format(addDays(startOfDay(selectedDate), 1), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

      const { data, error } = await supabase
        .from('medication_doses')
        .select('*')
        .eq('medication_id', medication.id)
        .gte('taken_at', startOfDaySelected)
        .lt('taken_at', endOfDaySelected)
        .order('taken_at', { ascending: false });

      if (error) throw handleSupabaseError(error, 'Failed to fetch medication doses.');
      return (data as MedicationDose[]) || [];
    },
    enabled: !!userId && !!medication.id,
    staleTime: 5 * 1000,
  });

 
  const { data: medicalReports, isLoading: isLoadingReports, isError: isErrorReports, error: reportsError } = useQuery<MedicalReport[], AppError>({
    queryKey: ['medicalReports', medication.id, userId],
    queryFn: async () => {
      if (!userId) throw new AppError("User not authenticated for reports.");
      const { data, error } = await supabase
        .from('medical_reports')
        .select('*')
        .eq('user_id', userId)
        .eq('medication_id', medication.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw handleSupabaseError(error, 'Failed to fetch medical reports.');
      return (data as MedicalReport[]) || [];
    },
    enabled: !!userId && !!medication.id,
  });

 
  const markTakenMutation = useMutation<MedicationDose, AppError, { scheduledTime: string, imageFile?: File }, { previousDoses: MedicationDose[] | undefined, previousAllUserDoses: { taken_at: string }[] | undefined }>({
    mutationFn: async ({ scheduledTime, imageFile }) => {
      let imageUrl: string | null = null;

      if (imageFile) {
        const fileExtension = imageFile.name.split('.').pop();
        const filePath = `${userId}/${medication.id}/${uuidv4()}.${fileExtension}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw handleSupabaseError(uploadError, 'Failed to upload proof photo.');

        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        if (!publicUrlData || !publicUrlData.publicUrl) {
          throw new AppError('Failed to get public URL for the uploaded photo.', null);
        }
        imageUrl = publicUrlData.publicUrl;

        const { data: reportData, error: reportError } = await supabase
          .from('medical_reports')
          .insert({
            user_id: userId,
            medication_id: medication.id,
            report_name: `Proof for ${medication.name} - ${scheduledTime} (${format(new Date(), 'MMM dd, pp HH:mm')})`,
            file_url: imageUrl,
            uploaded_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (reportError) {
          console.error("Failed to insert medical report:", reportError);
          throw handleSupabaseError(reportError, 'Failed to record proof photo in database.');
        }
      }

     
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const doseTakenAt = new Date(selectedDate);
      doseTakenAt.setHours(hours, minutes, 0, 0);

      const { data, error } = await supabase
        .from('medication_doses')
        .insert({ medication_id: medication.id, taken_at: doseTakenAt.toISOString() })
        .select()
        .single();

      if (error) throw handleSupabaseError(error, 'Failed to mark medication as taken.');
      return data;
    },
    
    onMutate: async ({ scheduledTime }) => {
      await queryClient.cancelQueries({ queryKey: ['medicationDoses', medication.id, userId, selectedDateFormatted] });
      await queryClient.cancelQueries({ queryKey: ['allUserDoses', userId] });

      
      const previousDoses = queryClient.getQueryData<MedicationDose[]>(['medicationDoses', medication.id, userId, selectedDateFormatted]);
      const previousAllUserDoses = queryClient.getQueryData<{ taken_at: string }[]>(['allUserDoses', userId]);


      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const doseTakenAt = new Date(selectedDate);
      doseTakenAt.setHours(hours, minutes, 0, 0);

      const newDose: MedicationDose = {
        id: 'optimistic-id-' + Math.random(),
        medication_id: medication.id,
        taken_at: doseTakenAt.toISOString(),
      };

      
      queryClient.setQueryData<MedicationDose[]>(
        ['medicationDoses', medication.id, userId, selectedDateFormatted],
        (old) => (old ? [newDose, ...old] : [newDose])
      );


      queryClient.setQueryData<{ taken_at: string }[]>(
        ['allUserDoses', userId],
        (old) => (old ? [{ taken_at: newDose.taken_at }, ...old] : [{ taken_at: newDose.taken_at }])
      );


      setCurrentTime(new Date());

      
      return { previousDoses, previousAllUserDoses };
    },
    onError: (mutationError, newDose, context) => {

      toast({
        title: "Error Recording Dose",
        description: `Failed to mark as taken: ${mutationError.message}. Rolling back.`,
        variant: "destructive",
      });
      queryClient.setQueryData(
        ['medicationDoses', medication.id, userId, selectedDateFormatted],
        context?.previousDoses
      );
      queryClient.setQueryData(
        ['allUserDoses', userId],
        context?.previousAllUserDoses
      );
      setCurrentTime(new Date()); 
    },
    onSuccess: (newDose) => {
      
      toast({
        title: "Dose Confirmed!",
        description: `Dose for "${medication.name}" taken at ${format(parseISO(newDose.taken_at), 'HH:mm')}.`,
      });
    },
    onSettled: () => {
      
      queryClient.invalidateQueries({ queryKey: ['medicationDoses', medication.id, userId, selectedDateFormatted] });
      queryClient.invalidateQueries({ queryKey: ['medicalReports', medication.id, userId] });
      queryClient.invalidateQueries({ queryKey: ['allUserDoses', userId] });
      setSelectedImage(null);
      setImagePreview(null);
    },
  });

  
  const undoDoseMutation = useMutation<void, AppError, string, { previousDoses: MedicationDose[] | undefined, previousAllUserDoses: { taken_at: string }[] | undefined }>({
    mutationFn: async (doseRecordId: string) => {
      if (!userId) throw new AppError("User not authenticated.");
      const { error } = await supabase
        .from('medication_doses')
        .delete()
        .eq('id', doseRecordId);

      if (error) throw handleSupabaseError(error, 'Failed to undo dose.');
    },
    onMutate: async (doseRecordId) => {
      await queryClient.cancelQueries({ queryKey: ['medicationDoses', medication.id, userId, selectedDateFormatted] });
      await queryClient.cancelQueries({ queryKey: ['allUserDoses', userId] });

      const previousDoses = queryClient.getQueryData<MedicationDose[]>(['medicationDoses', medication.id, userId, selectedDateFormatted]);
      const previousAllUserDoses = queryClient.getQueryData<{ taken_at: string }[]>(['allUserDoses', userId]);

     
      queryClient.setQueryData<MedicationDose[]>(
        ['medicationDoses', medication.id, userId, selectedDateFormatted],
        (old) => old?.filter(d => d.id !== doseRecordId)
      );

     
      return { previousDoses, previousAllUserDoses };
    },
    onError: (error, variables, context) => {
      toast({
        title: "Error Undoing Dose",
        description: `Failed to undo dose: ${error.message}. Rolling back.`,
        variant: "destructive",
      });
      
      queryClient.setQueryData(
        ['medicationDoses', medication.id, userId, selectedDateFormatted],
        context?.previousDoses
      );

      queryClient.invalidateQueries({ queryKey: ['allUserDoses', userId] });
      setCurrentTime(new Date()); 
    },
    onSuccess: () => {
      toast({
        title: "Dose Undone!",
        description: "Medication dose has been removed.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['medicationDoses', medication.id, userId, selectedDateFormatted] });
      queryClient.invalidateQueries({ queryKey: ['allUserDoses', userId] });
      setCurrentTime(new Date()); 
    },
  });

  
  const getDoseStatusForTimeSlots = () => {
    const scheduledTimes = medication.time_of_day || [];

   
    if (scheduledTimes.length === 0) {
      const isTaken = doses?.some(dose => {
        const actualTakenDate = new Date(dose.taken_at);

        return format(actualTakenDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
      });
      const takenDose = doses?.find(dose => format(new Date(dose.taken_at), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
      const actualTakenTime = takenDose ? parseISO(takenDose.taken_at) : null;


      let statusText = '';
      let statusVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
      let actionButton = null;

      if (_isToday(selectedDate)) {
       
        if (isTaken) {
          statusText = `Taken @ ${format(actualTakenTime!, 'HH:mm')}`;
          statusVariant = 'default';
          actionButton = (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => takenDose && undoDoseMutation.mutate(takenDose.id)}
              disabled={undoDoseMutation.isPending}
              className="h-8 w-8"
              title="Undo Dose"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="sr-only">Undo</span>
            </Button>
          );
        } else {
          statusText = 'Mark as Taken';
          statusVariant = 'secondary';
          actionButton = (
            <Button
              variant="default"
              size="sm"
              onClick={() => markTakenMutation.mutate({ scheduledTime: format(currentTime, 'HH:mm'), imageFile: selectedImage || undefined })}
              disabled={markTakenMutation.isPending}
              title="Mark as Taken Now"
            >
              Mark Now
            </Button>
          );
        }
      } else if (isPast(selectedDate)) { 
        statusText = isTaken ? `Taken @ ${format(actualTakenTime!, 'HH:mm')}` : 'No Specific Schedule (Past)';
        statusVariant = isTaken ? 'default' : 'outline';
      } else {
          statusText = 'No Specific Schedule (Future)';
          statusVariant = 'outline';
      }

      return [{
        time: 'N/A',
        scheduledDateTime: new Date(), 
        isTaken,
        actualTakenTime,
        statusText,
        statusVariant,
        actionButton,
      }];
    }


   
    return scheduledTimes.map(timeStr => { 
      const [hours, minutes] = timeStr.split(':').map(Number);
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      const toleranceMinutes = 15;

      const takenDose = doses?.find(dose => {
        const actualTakenTime = parseISO(dose.taken_at);
        const isSameDay = format(actualTakenTime, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

        const scheduledStart = new Date(scheduledDateTime.getTime() - toleranceMinutes * 60 * 1000);
        const scheduledEnd = new Date(scheduledDateTime.getTime() + toleranceMinutes * 60 * 1000);

        return isSameDay && actualTakenTime >= scheduledStart && actualTakenTime <= scheduledEnd;
      });

      const isTaken = !!takenDose;
      const actualTakenTime = takenDose ? parseISO(takenDose.taken_at) : null;

      const isToday = _isToday(selectedDate);
      const isPastDate = isBefore(selectedDate, startOfDay(currentTime)); // Use currentTime for comparison
      const isFutureDate = isBefore(startOfDay(currentTime), selectedDate); // Use currentTime for comparison

      const isScheduledTimeInPast = isBefore(scheduledDateTime, currentTime); // Use currentTime


      let statusText = 'Scheduled';
      let statusVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
      let actionButton = null;

      if (isFutureDate) {
        statusText = 'Future';
        statusVariant = 'outline';
      } else if (isTaken) {
        statusText = `Taken @ ${format(actualTakenTime!, 'HH:mm')}`;
        statusVariant = 'default';
        actionButton = (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => takenDose && undoDoseMutation.mutate(takenDose.id)}
            disabled={undoDoseMutation.isPending}
            className="h-8 w-8"
            title="Undo Dose"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span className="sr-only">Undo</span>
          </Button>
        );
      } else if (isScheduledTimeInPast && isToday) {
        statusText = 'Missed';
        statusVariant = 'destructive';
        actionButton = (
          <Button
            variant="default"
            size="sm"
            onClick={() => markTakenMutation.mutate({ scheduledTime: timeStr, imageFile: selectedImage || undefined })} // Corrected: use timeStr
            disabled={markTakenMutation.isPending}
            title="Mark as Taken Now"
          >
            Mark Now
          </Button>
        );
      } else if (isToday && !isScheduledTimeInPast) {
        statusText = 'Due Soon';
        statusVariant = 'secondary';
        actionButton = (
          <Button
            variant="default"
            size="sm"
            onClick={() => markTakenMutation.mutate({ scheduledTime: timeStr, imageFile: selectedImage || undefined })} // Corrected: use timeStr
            disabled={markTakenMutation.isPending}
            title="Mark as Taken"
          >
            Mark Taken
          </Button>
        );
      } else if (isPastDate && !isTaken) {
        statusText = 'Missed (Past)';
        statusVariant = 'destructive';
      }


      return {
        time: timeStr,
        scheduledDateTime,
        isTaken,
        actualTakenTime,
        statusText,
        statusVariant,
        actionButton,
      };
    });
  };

  const doseTimeSlots = getDoseStatusForTimeSlots();

  if (isLoadingDoses || isLoadingReports) {
    return (
      <Card>
        <CardContent className="p-6 text-center">Loading medication details and doses...</CardContent>
      </Card>
    );
  }

  if (isErrorDoses || isErrorReports) {
    return (
      <Card>
        <CardContent className="p-6 text-red-500">
          Error loading data: {dosesError?.message || reportsError?.message}
        </CardContent>
      </Card>
    );
  }


  const renderDoseSchedule = () => {
    if (medication.time_of_day && medication.time_of_day.length > 0) {
      return doseTimeSlots.map((slot, index) => (
        <Card key={index} className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-lg">{slot.time}</span>
            {slot.actualTakenTime && (
              <span className="text-sm text-muted-foreground">(Taken at {format(slot.actualTakenTime, 'HH:mm')})</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={slot.statusVariant}>
              {slot.statusText}
            </Badge>
            {slot.actionButton}
          </div>
        </Card>
      ));
    } else {

      const status = getDoseStatusForTimeSlots()[0]; 
      return (
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Pill className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-lg">No Specific Time</span>
            <span className="text-sm text-muted-foreground">({medication.frequency})</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={status.statusVariant}>
              {status.statusText}
            </Badge>
            {status.actionButton}
          </div>
        </Card>
      );
    }
  };


  return (
    <Card className="p-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
          </Button>
          <CardTitle className="flex-grow text-center">
            {medication.name}
            <p className="text-sm text-muted-foreground">{medication.dosage} - {medication.frequency}</p>
            <p className="text-sm text-muted-foreground">Tracking for: {format(selectedDate, 'PPP')}</p>
          </CardTitle>
          <div className="w-[100px]" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <h3 className="text-xl font-semibold mb-4 text-center">Daily Dose Schedule</h3>

        {_isToday(selectedDate) && (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="p-6">
              <div className="text-center">
                <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Add Proof Photo (Optional)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Take a photo of your medication or pill organizer as confirmation.
                </p>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  ref={fileInputRef}
                  className="hidden"
                  id="file-upload-input"
                />

                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-4"
                  disabled={markTakenMutation.isPending}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {selectedImage ? "Change Photo" : "Take Photo"}
                </Button>

                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Medication proof"
                      className="max-w-full h-32 object-cover rounded-lg mx-auto border-2 border-border"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Photo selected: {selectedImage?.name}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {medication.time_of_day && medication.time_of_day.length > 0 || _isToday(selectedDate) ? ( // Render if times exist OR if it's today's date (for "Today" meds)
            renderDoseSchedule()
          ) : (
            <p className="text-gray-500 italic text-center">No scheduled times set for this medication for this date.</p>
          )}
        </div>

        <Separator className="my-6" />

        <h4 className="font-semibold mb-2">Recent Dose History:</h4>
        {doses && doses.length > 0 ? (
          <ul className="space-y-1 text-sm text-gray-700 max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
            {doses.map((dose) => (
              <li key={dose.id} className="flex justify-between items-center border-b border-dotted py-1">
                <span>Taken at: {format(parseISO(dose.taken_at), 'MMM dd, pp HH:mm')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => undoDoseMutation.mutate(dose.id)}
                  disabled={undoDoseMutation.isPending}
                  className="h-7 w-7"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span className="sr-only">Undo Dose</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No doses recorded yet for {medication.name} on {format(selectedDate, 'PPP')}.</p>
        )}

        <Separator className="my-6" />

        <h4 className="font-semibold mt-6 mb-2">Associated Medical Reports:</h4>
        {medicalReports && medicalReports.length > 0 ? (
          <ul className="space-y-1 text-sm text-gray-700 border rounded-md p-2 bg-gray-50">
            {medicalReports.map((report) => (
              <li key={report.id} className="border-b border-dotted py-1">
                <a href={report.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {report.report_name}
                </a> (Uploaded: {format(parseISO(report.uploaded_at), 'MMM dd, pp')})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No reports uploaded for this medication.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicationDoseTracker;