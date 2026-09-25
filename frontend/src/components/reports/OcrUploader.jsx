import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ocrAutofillApi } from "@/services/reportService";
import { toast } from "sonner";

export const OcrUploader = ({ onParseComplete }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];

    if (!selected) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
    ];

    if (!allowedTypes.includes(selected.type)) {
      toast.error("Please upload a PNG, JPG, or PDF file.");
      resetInput();
      return;
    }

    if (selected.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20MB.");
      resetInput();
      return;
    }

    setFile(selected);

    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setPreview(reader.result);
      };

      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemoveFile = () => {
    if (loading) return;

    setFile(null);
    setPreview(null);
    resetInput();
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a lab report first.");
      return;
    }

    setLoading(true);

    try {
      const result = await ocrAutofillApi(file, true);


      if (!result || typeof result !== "object") {
        throw new Error("OCR returned an empty response.");
      }

      const fields = result.fields || {};
      const biomarkers = result.biomarkers || [];

      const hasFields =
        fields &&
        typeof fields === "object" &&
        Object.keys(fields).length > 0;

      const hasBiomarkers =
        Array.isArray(biomarkers) && biomarkers.length > 0;

      if (!hasFields && !hasBiomarkers) {
        toast.warning(
          "The report was scanned, but no recognizable biomarkers were found."
        );
        return;
      }

      toast.success("Lab report analyzed successfully.");

      if (onParseComplete) {
        onParseComplete({
          ...result,
          autofill: result,
        });
      }

      resetInput();
    } catch (err) {
      console.error("OCR analysis error:", err);

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Could not analyze this report. Please try a clearer scan.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          file
            ? "border-teal-500/50 bg-teal-500/5"
            : "border-slate-300 bg-slate-50/50 hover:border-teal-500/50 dark:border-slate-800 dark:bg-slate-900/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,application/pdf"
          onChange={handleFileChange}
          disabled={loading}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />

        <div className="mx-auto mb-3 w-fit rounded-full bg-teal-500/10 p-4 text-teal-600 dark:text-teal-400">
          <UploadCloud className="h-8 w-8" />
        </div>

        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {file
            ? file.name
            : "Drop Medical OCR Lab Report or Click to Browse"}
        </h4>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Supports PNG, JPG, and PDF scans up to 20MB.
        </p>

        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          AI extracts available biomarkers and evaluates their clinical status.
        </p>
      </div>

      {file && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
          {preview && (
            <div className="border-b border-slate-200 p-3 dark:border-slate-800">
              <div className="max-h-64 overflow-hidden rounded-lg bg-white dark:bg-slate-950">
                <img
                  src={preview}
                  alt="Selected medical report preview"
                  className="mx-auto max-h-64 w-auto max-w-full object-contain"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg bg-teal-500/10 p-2">
                <FileText className="h-5 w-5 text-teal-500" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {file.name}
                </p>

                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            <div className="relative z-20 flex shrink-0 items-center gap-2">
              <Button
                type="button"
                onClick={handleRemoveFile}
                disabled={loading}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                onClick={handleUpload}
                disabled={loading}
                size="sm"
                variant="default"
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze with AI OCR
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
