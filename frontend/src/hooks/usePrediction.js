import { useState } from "react";
import { predictRiskApi } from "../services/predictionService";

export const usePrediction = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runPrediction = async (predictionPayload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictRiskApi(predictionPayload);
      setResult(res);
      return res;
    } catch (err) {
      setError(err?.message || "Failed to calculate risk score");
    } finally {
      setLoading(false);
    }
  };

  return { loading, result, error, runPrediction, setResult };
};
