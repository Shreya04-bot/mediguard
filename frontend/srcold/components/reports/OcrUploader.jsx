import React, { useState } from "react";
import { UploadCloud, FileText, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseOcrReportApi } from "../../services/reportService";
import { toast } from "sonner";

export const OcrUploader = ({ onParseComplete }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    try {
      const res = await parseOcrReportApi(preview, file?.type);
      if (onParseComplete) onParseComplete(res);
    } catch (err) {
      toast.error(err.message || "Could not analyze this report. Please try a clearer scan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center hover:border-teal-500/50 transition-colors cursor-pointer relative bg-slate-50/50 dark:bg-slate-900/40">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="p-4 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 w-fit mx-auto mb-3">
          <UploadCloud className="h-8 w-8" />
        </div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {file ? file.name : "Drop Medical OCR Lab Report or Click to Browse"}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Supports PNG, JPG, PDF scans up to 20MB. Automatically extracts CMP, Lipid, Thyroid biomarkers.
        </p>
      </div>

      {preview && (
        <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-teal-500" />
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-xs">{file?.name}</span>
          </div>
          <Button onClick={handleUpload} disabled={loading} size="sm" variant="default">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" aria-hidden="true" />}
            Analyze Report with AI OCR
          </Button>
        </div>
      )}
    </Card>
  );
};
