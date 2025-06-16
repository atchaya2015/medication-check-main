import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { MedicalReport } from '../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppError, handleSupabaseError } from '../utils/errorHandler';
import { useToast } from "@/components/ui/use-toast";


import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  userId: string;
  medicationId?: string; 
  onUploadSuccess?: (report: MedicalReport) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ userId, medicationId, onUploadSuccess }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [reportName, setReportName] = useState('');

  const uploadFileMutation = useMutation<MedicalReport, AppError, { file: File; reportName: string }>({
    mutationFn: async ({ file, reportName }) => {
      const fileExtension = file.name.split('.').pop();
      const filePath = `${userId}/${uuidv4()}.${fileExtension}`; 
      const bucketName = 'medicare-files'; 

      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw handleSupabaseError(uploadError, 'Failed to upload file to storage.');

      
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      if (!publicUrlData || !publicUrlData.publicUrl) {
          throw new AppError('Failed to get public URL for the uploaded file.', 500);
      }

    
      const { data: report, error: dbError } = await supabase
        .from('medical_reports')
        .insert({
          user_id: userId,
          medication_id: medicationId || null,
          report_name: reportName,
          file_url: publicUrlData.publicUrl,
        })
        .select()
        .single();

      if (dbError) {
        
        throw handleSupabaseError(dbError, 'Failed to save file details to database.');
      }
      return report;
    },
    onSuccess: (newReport) => {
      setFile(null); 
      setReportName(''); 
      if (onUploadSuccess) {
        onUploadSuccess(newReport); 
      }
      queryClient.invalidateQueries({ queryKey: ['medicalReports', medicationId] }); 
      },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "Validation Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    if (!reportName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name for the report.",
        variant: "destructive",
      });
      return;
    }
    uploadFileMutation.mutate({ file, reportName });
  };

  return (
    <div className="border p-4 rounded-md bg-gray-50 mt-6">
      <h3 className="font-semibold mb-3">Upload Medical Report/Prescription</h3>
      {medicationId && <p className="text-sm text-gray-600 mb-3">Linking to selected medication.</p>}
      <form onSubmit={handleUpload} className="space-y-3">
        <div>
          <label htmlFor="report-name" className="sr-only">Report Name</label>
          <Input
            id="report-name"
            type="text"
            placeholder="Report Name (e.g., Blood Test, New Prescription)"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            disabled={uploadFileMutation.isPending}
            required
          />
        </div>
        <div>
          <label htmlFor="file-input" className="sr-only">Choose File</label>
          <Input
            id="file-input"
            type="file"
            onChange={handleFileChange}
            disabled={uploadFileMutation.isPending}
            required
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={uploadFileMutation.isPending || !file || !reportName.trim()}
        >
          {uploadFileMutation.isPending ? 'Uploading...' : 'Upload File'}
        </Button>
      </form>
    </div>
  );
};

export default FileUpload;