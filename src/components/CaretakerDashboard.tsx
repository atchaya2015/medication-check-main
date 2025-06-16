import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";

import { Users, Bell, Calendar as CalendarIcon, Mail, AlertTriangle, Check, Clock, Camera } from "lucide-react";
import NotificationSettings from "./NotificationSettings";
import { format, subDays, isToday, isBefore, startOfDay, addDays } from "date-fns";


import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


import { supabase } from '../supabaseClient'; 
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';



import CaretakerDoseLogging from './CaretakerDoseLogging'; 


interface MedicationDose {
    id: string;
    taken_at: string;
    medication_id: string; 

    medications: {
        user_id: string;
    }[]; 
}

interface PatientMedication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    
}

interface CaretakerDashboardProps {
    patientUserId: string; 
    patientName: string; 
}

const CaretakerDashboard: React.FC<CaretakerDashboardProps> = ({ patientUserId, patientName }) => {
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedMedicationIdForLogging, setSelectedMedicationIdForLogging] = useState<string | null>(null);

    const queryClient = useQueryClient();

    
    const handleSendReminderEmail = useCallback(() => {
        alert(`Sending reminder email to ${patientName}... (Not implemented)`);
        console.log(`Sending reminder email to ${patientName}...`);
    }, [patientName]);

    const handleConfigureNotifications = useCallback(() => {
        setActiveTab("notifications");
        console.log("Navigating to notification settings...");
    }, []);

    const handleViewCalendar = useCallback(() => {
        setActiveTab("calendar");
        console.log("Navigating to calendar view...");
    }, []);

    
    const { data: patientDoses, isLoading, isError, error } = useQuery<MedicationDose[], Error>({
        queryKey: ['patientDoses', patientUserId],
        queryFn: async () => {
            const { data, error: dosesError } = await supabase
                .from('medication_doses')
                .select(`
                    id,
                    taken_at,
                    medication_id,
                    medications!inner(user_id)
                `)
                .filter('medications.user_id', 'eq', patientUserId);

            if (dosesError) {
                console.error("Error fetching patient doses:", dosesError.message);
                throw new Error("Failed to load patient medication dose data.");
            }
         
            return (data || []) as MedicationDose[];
        },
        enabled: !!patientUserId,
        staleTime: 5 * 60 * 1000,
    });

    
    const { data: patientMedications, isLoading: isLoadingMedications, error: medicationsError } = useQuery<PatientMedication[], Error>({
        queryKey: ['patientMedications', patientUserId],
        queryFn: async () => {
            const { data, error: medsError } = await supabase
                .from('medications')
                .select(`id, name, dosage, frequency`)
                .eq('user_id', patientUserId);

            if (medsError) {
                console.error("Error fetching patient medications for dropdown:", medsError.message);
                throw new Error("Failed to load patient's scheduled medications.");
            }
            
            return (data || []) as PatientMedication[];
        },
        enabled: !!patientUserId,
        staleTime: 10 * 60 * 1000,
    });
    const actualPatientDoses: MedicationDose[] = useMemo(() => patientDoses || [], [patientDoses]);
    const actualPatientMedications: PatientMedication[] = useMemo(() => patientMedications || [], [patientMedications]);



    const today = useMemo(() => new Date(), []);
    const todayStr = format(today, 'yyyy-MM-dd');

    const uniqueTakenDates = useMemo(() => {
        const dates = new Set<string>();
        actualPatientDoses.forEach((dose: MedicationDose) => {
            dates.add(format(new Date(dose.taken_at), 'yyyy-MM-dd'));
        });
        return dates;
    }, [actualPatientDoses]);

    const getStreakCount = useCallback(() => {
        let streak = 0;
        let currentDate = startOfDay(today);

        if (!uniqueTakenDates.has(format(currentDate, 'yyyy-MM-dd'))) {
            return 0;
        }

        while (uniqueTakenDates.has(format(currentDate, 'yyyy-MM-dd'))) {
            streak++;
            currentDate = subDays(currentDate, 1);
            if (streak > 365) break;
        }
        return streak;
    }, [uniqueTakenDates, today]);

    const calculateMonthlyAdherence = useCallback(() => {
        if (actualPatientDoses.length === 0) return 0;

        const daysInLast30 = new Set<string>();
        const dosesTakenDaysInLast30 = new Set<string>();

        const thirtyDaysAgo = subDays(today, 30);

        for (let d = startOfDay(thirtyDaysAgo); isBefore(d, addDays(d, 1)); d = addDays(d, 1)) {
            daysInLast30.add(format(d, 'yyyy-MM-dd'));
        }

        actualPatientDoses.forEach((dose: MedicationDose) => {
            const doseDate = new Date(dose.taken_at);
            const formattedDoseDate = format(doseDate, 'yyyy-MM-dd');
            if (daysInLast30.has(formattedDoseDate)) {
                dosesTakenDaysInLast30.add(formattedDoseDate);
            }
        });

        const totalExpectedDays = daysInLast30.size;
        const actualTakenDays = dosesTakenDaysInLast30.size;

        return totalExpectedDays > 0 ? Math.round((actualTakenDays / totalExpectedDays) * 100) : 0;
    }, [actualPatientDoses, today]);

    const totalDaysConsideredForMissed = 30;
    const missedDaysCount = useMemo(() => {
        let missed = 0;
        const endDate = startOfDay(today);
        const startDate = subDays(endDate, totalDaysConsideredForMissed - 1);

        for (let d = startDate; isBefore(d, addDays(endDate, 1)); d = addDays(d, 1)) {
            if (!uniqueTakenDates.has(format(d, 'yyyy-MM-dd'))) {
                missed++;
            }
        }
        return missed;
    }, [uniqueTakenDates, today]);

    const recentActivity = useMemo(() => {
        const activity = [];
        for (let i = 0; i < 7; i++) {
            const date = subDays(today, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const isTaken = uniqueTakenDates.has(dateStr);
            const doseForDay = actualPatientDoses.find((d: MedicationDose) => format(new Date(d.taken_at), 'yyyy-MM-dd') === dateStr);
            const time = doseForDay ? format(new Date(doseForDay.taken_at), 'h:mm a') : null;

            const hasPhoto = isTaken && Math.random() > 0.5; // Placeholder
            activity.push({
                date: dateStr,
                taken: isTaken,
                time: time,
                hasPhoto: hasPhoto,
            });
        }
        return activity;
    }, [uniqueTakenDates, actualPatientDoses, today]);

    const dailyMedicationStatus = uniqueTakenDates.has(todayStr) ? "completed" : "pending";

    
    useEffect(() => {
        if (!patientUserId) {
            console.warn("patientUserId not provided, skipping Supabase Realtime subscription.");
            return;
        }

        console.log(`Attempting to subscribe to medication_doses for patient: ${patientUserId}`);

        const subscription = supabase
            .channel(`medication_updates_for_${patientUserId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'medication_doses',
                },
                (payload: RealtimePostgresChangesPayload<MedicationDose>) => {
                    console.log('Supabase Realtime update received:', payload);
                    queryClient.invalidateQueries({ queryKey: ['patientDoses', patientUserId] });
                    queryClient.invalidateQueries({ queryKey: ['patientMedications', patientUserId] });
                }
            )
            .subscribe((status) => {
                console.log(`Supabase Realtime subscription status for ${patientName}: ${status}`);
            });

        return () => {
            console.log(`Unsubscribing from medication_updates_for_${patientUserId}`);
            supabase.removeChannel(subscription);
        };
    }, [patientUserId, queryClient, patientName]);



    if (isLoading || isLoadingMedications) {
        return (
            <div className="flex justify-center items-center h-screen text-lg text-gray-600">
                <p>Loading {patientName}'s medication data...</p>
            </div>
        );
    }

    if (isError || medicationsError) {
        return (
            <div className="flex flex-col justify-center items-center h-screen text-red-600 text-lg">
                <AlertTriangle className="w-8 h-8 mb-4" />
                <p>Error loading patient data:</p>
                {isError && <p className="text-sm">{error?.message || "Unknown error fetching doses."}</p>}
                {medicationsError && <p className="text-sm">{medicationsError?.message || "Unknown error fetching medications."}</p>}
                <p className="mt-4 text-gray-500 text-sm">Please check your network connection or try again later.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
            
            <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-8 text-white shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold">Caretaker Dashboard</h2>
                        <p className="text-white/90 text-lg">Monitoring {patientName}'s medication adherence</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-2xl font-bold">{calculateMonthlyAdherence()}%</div>
                        <div className="text-white/80">Adherence Rate (30 Days)</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-2xl font-bold">{getStreakCount()}</div>
                        <div className="text-white/80">Current Streak</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-2xl font-bold">{missedDaysCount}</div>
                        <div className="text-white/80">Missed Days (30 Days)</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-2xl font-bold">{recentActivity.filter(a => a.taken).length}</div>
                        <div className="text-white/80">Taken This Week</div>
                    </div>
                </div>
            </div>

          
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid lg:grid-cols-2 gap-6">
                       
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                                    Today's Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                                    <div>
                                        <h4 className="font-medium">All Medications Due Today</h4>
                                        <p className="text-sm text-muted-foreground">Updated in real-time</p>
                                    </div>
                                    <Badge variant={dailyMedicationStatus === "pending" ? "destructive" : "secondary"}>
                                        {dailyMedicationStatus === "pending" ? "Pending" : "At Least One Taken"}
                                    </Badge>
                                </div>
                                {dailyMedicationStatus === "pending" && (
                                     <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4" /> Patient has not logged any dose today yet.
                                    </p>
                                )}
                                {dailyMedicationStatus === "completed" && (
                                     <p className="text-sm text-green-500 mt-2 flex items-center gap-1">
                                        <Check className="w-4 h-4" /> Patient has logged at least one dose today.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={handleSendReminderEmail}
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Send Reminder Email
                                </Button>
                                <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={handleConfigureNotifications}
                                >
                                    <Bell className="w-4 h-4 mr-2" />
                                    Configure Notifications
                                </Button>
                                <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={handleViewCalendar}
                                >
                                    <CalendarIcon className="w-4 h-4 mr-2" />
                                    View Full Calendar
                                </Button>
                            </CardContent>
                        </Card>

                     
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Log Dose for {patientName}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoadingMedications ? (
                                    <p className="text-muted-foreground">Loading patient's medications for logging...</p>
                                ) : (actualPatientMedications.length === 0) ? (
                                    <p className="text-muted-foreground">No medications found for this patient. Add medications via the patient's app first.</p>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="medication-select">Select Medication</Label>
                                            <Select
                                                onValueChange={(value) => setSelectedMedicationIdForLogging(value)}
                                                value={selectedMedicationIdForLogging || ""}
                                            >
                                                <SelectTrigger id="medication-select" className="w-full">
                                                    <SelectValue placeholder="Select a medication" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {actualPatientMedications.map((med) => (
                                                        <SelectItem key={med.id} value={med.id}>
                                                            {med.name} ({med.dosage})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <CaretakerDoseLogging
                                            patientUserId={patientUserId}
                                            medicationIdToLog={selectedMedicationIdForLogging || ""}
                                        />
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Logging a dose here will update both your dashboard and the patient's app in real-time.
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Adherence Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span>Overall Progress (Last 30 Days)</span>
                                    <span>{calculateMonthlyAdherence()}%</span>
                                </div>
                                <Progress value={calculateMonthlyAdherence()} className="h-3" />
                                <div className="grid grid-cols-3 gap-4 text-center text-sm mt-4">
                                    <div>
                                        <div className="font-medium text-green-600">{uniqueTakenDates.size} days</div>
                                        <div className="text-muted-foreground">Days with Doses</div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-red-600">{missedDaysCount} days</div>
                                        <div className="text-muted-foreground">Missed Days</div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-blue-600">{30 - missedDaysCount} days</div>
                                        <div className="text-muted-foreground">Days Tracked (Last 30)</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                
                <TabsContent value="activity" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Medication Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentActivity.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">No recent activity to display for the last 7 days.</p>
                                ) : (
                                    recentActivity.map((activity, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    activity.taken ? 'bg-green-100' : 'bg-red-100'
                                                }`}>
                                                    {activity.taken ? (
                                                        <Check className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        {format(new Date(activity.date), 'EEEE, MMMM d')}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {activity.taken ? `Taken at ${activity.time || 'N/A'}` : 'Medication missed'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {activity.hasPhoto && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Camera className="w-3 h-3 mr-1" />
                                                        Photo
                                                    </Badge>
                                                )}
                                                <Badge variant={activity.taken ? "secondary" : "destructive"} className="text-xs">
                                                    {activity.taken ? "Completed" : "Missed"}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

              
                <TabsContent value="calendar" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Medication Calendar Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid lg:grid-cols-2 gap-6">
                                <div>
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => date && setSelectedDate(date)}
                                        className="rounded-md border shadow"
                                        modifiersClassNames={{
                                            selected: "bg-blue-600 text-white hover:bg-blue-700",
                                        }}
                                        components={{
                                            DayContent: ({ date }) => {
                                                const dateStr = format(date, 'yyyy-MM-dd');
                                                const isTaken = uniqueTakenDates.has(dateStr);
                                                const isPast = isBefore(date, startOfDay(new Date()));
                                                const isCurrentDay = isToday(date);

                                                return (
                                                    <div className="relative w-full h-full flex items-center justify-center">
                                                        <span>{date.getDate()}</span>
                                                        {isTaken && (
                                                            <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                                                                <Check className="w-2.5 h-2.5 text-white" />
                                                            </div>
                                                        )}
                                                        {!isTaken && isPast && !isCurrentDay && (
                                                            <div className="absolute top-1 right-1 w-4 h-4 bg-red-400 rounded-full border-2 border-white"></div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                        }}
                                    />

                                    <div className="mt-4 space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                            <span>Medication taken (any)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                            <span>Missed medication (any in past)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                            <span>Today (calendar highlight)</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-4">
                                        Details for {format(selectedDate, 'MMMM d,PPPP')}
                                    </h4>

                                    <div className="space-y-4">
                                        {uniqueTakenDates.has(format(selectedDate, 'yyyy-MM-dd')) ? (
                                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Check className="w-5 h-5 text-green-600" />
                                                    <span className="font-medium text-green-800">Medication Taken</span>
                                                </div>
                                                <p className="text-sm text-green-700">
                                                    {patientName} successfully took at least one medication on this day.
                                                </p>
                                            </div>
                                        ) : isBefore(selectedDate, startOfDay(new Date())) && !isToday(selectedDate) ? (
                                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                                    <span className="font-medium text-red-800">No Medication Logged</span>
                                                </div>
                                                <p className="text-sm text-red-700">
                                                    {patientName} did not log any medication on this past day.
                                                </p>
                                            </div>
                                        ) : isToday(selectedDate) ? (
                                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock className="w-5 h-5 text-blue-600" />
                                                    <span className="font-medium text-blue-800">Today</span>
                                                </div>
                                                <p className="text-sm text-blue-700">
                                                    Monitor {patientName}'s medication status for today.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CalendarIcon className="w-5 h-5 text-gray-600" />
                                                    <span className="font-medium text-gray-800">Future Date</span>
                                                </div>
                                                <p className="text-sm text-gray-700">
                                                    This date is in the future.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

               
                <TabsContent value="notifications">
                    <NotificationSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default CaretakerDashboard;