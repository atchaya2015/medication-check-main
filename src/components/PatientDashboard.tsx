import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import MedicationDoseTracker from '../components/MedicationDoseTracker';
import { Medication } from '../types';
import { Check, Calendar as CalendarIcon, User } from "lucide-react";
import { format, isToday, isBefore, startOfDay, addDays, subDays, isAfter } from "date-fns"; 
import MedicationList from './MedicationList';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { AppError, handleSupabaseError } from '../utils/errorHandler';
import { RealtimeChannel } from '@supabase/supabase-js'; 

interface CalendarDoseData {
  taken_at: string;
}

interface PatientDashboardProps {
  userId: string;
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({ userId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMedicationForTracking, setSelectedMedicationForTracking] = useState<Medication | null>(null);

  const queryClient = useQueryClient();


  const {
    data: allUserDoses,
    isLoading: isLoadingAllDoses,
    isError: isErrorAllDoses,
    error: allDosesError
  } = useQuery<CalendarDoseData[], AppError>({
    queryKey: ['allUserDoses', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medication_doses')
        .select(`
          taken_at,
          medications!inner(user_id)
        `)
        .filter('medications.user_id', 'eq', userId);

      if (error) throw handleSupabaseError(error, 'Failed to fetch all user doses for calendar.');

      return (data || []).map(d => ({ taken_at: d.taken_at }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  
  const uniqueTakenDates = useMemo(() => {
    const dates = new Set<string>();
    if (allUserDoses) {
      allUserDoses.forEach(dose => {
        dates.add(format(new Date(dose.taken_at), 'yyyy-MM-dd'));
      });
    }
    return dates;
  }, [allUserDoses]);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');


  useEffect(() => {
    let dosesSubscription: RealtimeChannel | null = null;
    let medicationsSubscription: RealtimeChannel | null = null;
    if (userId) {
      console.log(`Setting up real-time subscriptions for userId: ${userId}`);

      dosesSubscription = supabase
        .channel(`medication_doses_changes_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'medication_doses',
          },
          (payload) => {
            console.log('Realtime dose change:', payload);
            queryClient.invalidateQueries({ queryKey: ['allUserDoses', userId] });
            queryClient.invalidateQueries({ queryKey: ['medicationsByDate'] });
            queryClient.invalidateQueries({ queryKey: ['medicationsByUser'] });
          }
        )
        .subscribe((status) => {
            console.log(`Medication Doses Channel Status: ${status}`);
        });

      medicationsSubscription = supabase
        .channel(`medications_changes_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'medications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('Realtime medication change:', payload);
            queryClient.invalidateQueries({ queryKey: ['medicationsByUser', userId] });
          }
        )
        .subscribe((status) => {
            console.log(`Medications Channel Status: ${status}`);
        });

    } else {
      console.warn("userId not provided, skipping Supabase real-time subscriptions.");
    }

    return () => {
      if (dosesSubscription) {
        console.log("Removing medication doses subscription.");
        supabase.removeChannel(dosesSubscription);
      }
      if (medicationsSubscription) {
        console.log("Removing medications subscription.");
        supabase.removeChannel(medicationsSubscription);
      }
    };
  }, [userId, queryClient]);

  
  const getStreakCount = () => {
    let streak = 0;
    let currentDate = startOfDay(today);

    if (!uniqueTakenDates.has(format(currentDate, 'yyyy-MM-dd'))) {
      return 0;
    }

    while (uniqueTakenDates.has(format(currentDate, 'yyyy-MM-dd'))) {
      streak++;
      currentDate = subDays(currentDate, 1);
    }
    return streak;
  };

  const calculateMonthlyAdherence = () => {
    if (!allUserDoses || allUserDoses.length === 0) return 0;

    const daysInLast30 = new Set<string>();
    const dosesTakenDaysInLast30 = new Set<string>();

    const thirtyDaysAgo = subDays(today, 30);

    for (let d = startOfDay(thirtyDaysAgo); !isAfter(d, startOfDay(today)); d = addDays(d, 1)) { // Adjusted loop condition
        daysInLast30.add(format(d, 'yyyy-MM-dd'));
    }

    allUserDoses.forEach(dose => {
        const doseDate = startOfDay(new Date(dose.taken_at));
        if (!isBefore(doseDate, startOfDay(thirtyDaysAgo)) && !isAfter(doseDate, startOfDay(today))) {
            const formattedDoseDate = format(doseDate, 'yyyy-MM-dd');
            dosesTakenDaysInLast30.add(formattedDoseDate);
        }
    });

    const totalExpectedDays = daysInLast30.size;
    const actualTakenDays = dosesTakenDaysInLast30.size;

    return totalExpectedDays > 0 ? Math.round((actualTakenDays / totalExpectedDays) * 100) : 0;
  };


  
  if (isLoadingAllDoses) {
    return (
      <div className="flex justify-center items-center h-48">
        <p>Loading patient data...</p>
      </div>
    );
  }

  if (isErrorAllDoses) {
    return (
      <div className="flex justify-center items-center h-48 text-red-500">
        <p>Error loading patient data: {allDosesError?.message}</p>
      </div>
    );
  }

  
  return (
    <div className="space-y-6">

      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!</h2>
            <p className="text-white/90 text-lg">Ready to stay on track with your medication?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{getStreakCount()}</div>
            <div className="text-white/80">Day Streak</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{uniqueTakenDates.has(todayStr) ? "✓" : "○"}</div>
            <div className="text-white/80">Today's Overall Status</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{calculateMonthlyAdherence()}%</div>
            <div className="text-white/80">Last 30 Days Adherence</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2">
          {selectedMedicationForTracking ? (
            <MedicationDoseTracker
              medication={selectedMedicationForTracking}
              onBack={() => setSelectedMedicationForTracking(null)}
              userId={userId}
              selectedDate={selectedDate}
            />
          ) : (
            <MedicationList
              userId={userId}
              onSelectMedication={setSelectedMedicationForTracking}
              selectedMedication={selectedMedicationForTracking}
            />
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Medication Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full"
                modifiersClassNames={{
                  selected: "bg-blue-600 text-white hover:bg-blue-700",
                }}
                components={{
                  DayContent: ({ date }) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isTaken = uniqueTakenDates.has(dateStr);

                    const isPastDay = isBefore(date, startOfDay(today));
                    const isCurrentDay = isToday(date);

                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span>{date.getDate()}</span>
                        {isTaken && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                        {!isTaken && isPastDay && !isCurrentDay && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full"></div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;