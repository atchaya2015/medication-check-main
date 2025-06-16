export interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  created_at: string;
}

export interface NewMedication {
  name: string;
  dosage: string;
  frequency: string;
}

export interface MedicationDose {
  id: string;
  medication_id: string;
  taken_at: string;
}

export interface MedicalReport {
  id: string;
  user_id: string;
  medication_id: string | null;
  report_name: string;
  file_url: string;
  uploaded_at: string;
}