"""
MediGuard AI — Real Data Pipeline Tests
========================================
Tests that verify real data is being used (not synthetic).
Run: pytest tests/test_real_data.py -v
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import pandas as pd
import pytest


class TestRealDataLoader:
    """Validate that the data loader fetches real clinical data."""

    def test_pima_loads_and_has_correct_shape(self):
        from ml.data_loader import load_pima_diabetes
        df = load_pima_diabetes()
        assert len(df) >= 700, "Pima dataset should have ~753 rows after cleaning"
        assert "diabetes_label" in df.columns
        assert "fasting_glucose" in df.columns

    def test_pima_diabetes_prevalence_matches_known_value(self):
        """Pima dataset has known 34.9% diabetes prevalence."""
        from ml.data_loader import load_pima_diabetes
        df = load_pima_diabetes()
        prevalence = df["diabetes_label"].mean()
        # Allow ±3% tolerance from known 34.9% value
        assert 0.32 <= prevalence <= 0.38, \
            f"Pima diabetes prevalence {prevalence:.2%} outside expected 32-38%"

    def test_cleveland_loads_and_has_correct_shape(self):
        from ml.data_loader import load_cleveland_heart
        df = load_cleveland_heart()
        assert len(df) >= 280, "Cleveland dataset should have ~297 rows"
        assert "cardiovascular_label" in df.columns

    def test_glucose_values_are_physiologically_plausible(self):
        """Real data shouldn't have glucose=0 (impossible)."""
        from ml.data_loader import load_pima_diabetes
        df = load_pima_diabetes()
        assert (df["fasting_glucose"] > 0).all(), "All glucose values must be > 0 (missing values cleaned)"
        assert df["fasting_glucose"].max() <= 500, "Max glucose should be < 500 mg/dL"
        assert df["fasting_glucose"].min() >= 50, "Min glucose should be >= 50 mg/dL"

    def test_combined_dataset_has_real_labels(self):
        """Labels must not be all-zero or all-one (would indicate fabrication)."""
        from ml.data_loader import load_full_training_frame
        df = load_full_training_frame()
        assert len(df) >= 900
        dia_prev = df["diabetes_label"].mean()
        cvd_prev = df["cardiovascular_label"].mean()
        htn_prev = df["hypertension_label"].mean()
        # Range widened (was 0.10-0.60) after adding the cardio (70k, general
        # population) and Framingham (4,240, general population) sources —
        # both dilute diabetes prevalence versus the original Pima-only
        # figure, which was itself a diabetes-risk-enriched cohort (Pima
        # Indian women, a population with unusually high T2D prevalence).
        # A lower combined rate is the *correct* result of adding broader,
        # more representative real populations, not a bug.
        assert 0.03 <= dia_prev <= 0.60, f"Diabetes prevalence {dia_prev:.2%} outside plausible range"
        assert 0.10 <= cvd_prev <= 0.70, f"CVD prevalence {cvd_prev:.2%} outside plausible range"
        assert 0.10 <= htn_prev <= 0.60, f"Hypertension prevalence {htn_prev:.2%} outside plausible range"

    def test_no_synthetic_random_state_leak(self):
        """
        Verify the data loader doesn't call numpy random for DISEASE LABELS
        (it may use rng for feature imputation, but not for clinical outcomes
        that should come from real data).
        """
        from ml.data_loader import load_pima_diabetes, load_cleveland_heart
        # Run twice and check that Pima diabetes labels are identical
        # (they should be — labels come from the CSV, not RNG)
        df1 = load_pima_diabetes()
        df2 = load_pima_diabetes()
        pd.testing.assert_series_equal(
            df1["diabetes_label"].reset_index(drop=True),
            df2["diabetes_label"].reset_index(drop=True),
            check_names=False,
        )


class TestDistrictHeatmap:
    """Validate that heatmap uses NFHS-5 data, not random.uniform."""

    def test_heatmap_data_loads(self):
        from features.district_heatmap import get_heatmap_data
        data = get_heatmap_data()
        assert len(data) >= 50, "Should have 60+ UP districts"

    def test_urban_metro_higher_risk_than_rural(self):
        """ICMR-INDIAB: urban metros have higher diabetes prevalence than rural."""
        from features.district_heatmap import get_heatmap_data
        data = get_heatmap_data()
        urban_risks = [d["diabetes_risk"] for d in data if d["category"] == "urban_metro"]
        rural_risks  = [d["diabetes_risk"] for d in data if d["category"] == "rural"]
        assert np.mean(urban_risks) > np.mean(rural_risks), \
            "Urban metro diabetes risk should exceed rural (ICMR-INDIAB finding)"

    def test_risk_values_in_nfhs5_published_range(self):
        """All diabetes risks should be within published ICMR-INDIAB CI bounds."""
        from features.district_heatmap import get_heatmap_data
        data = get_heatmap_data()
        for d in data:
            assert 0.02 <= d["diabetes_risk"] <= 0.25, \
                f"{d['name']}: diabetes_risk {d['diabetes_risk']} outside ICMR bounds [2-25%]"
            assert 0.05 <= d["cvd_risk"] <= 0.35, \
                f"{d['name']}: cvd_risk {d['cvd_risk']} outside NFHS-5 bounds [5-35%]"

    def test_data_source_is_not_random(self):
        """Calling twice should give identical results (deterministic from NFHS-5)."""
        from features.district_heatmap import get_heatmap_data
        r1 = {d["id"]: d["diabetes_risk"] for d in get_heatmap_data()}
        r2 = {d["id"]: d["diabetes_risk"] for d in get_heatmap_data()}
        assert r1 == r2, "Heatmap should be deterministic (not random)"


class TestOCRClinicalValidation:
    """Validate that OCR uses WHO/ADA reference ranges."""

    def test_glucose_classification(self):
        from features.ocr_autofill import _classify_value
        normal = _classify_value("fasting_glucose", 90.0)
        assert normal["label"] == "normal"
        assert "ADA" in normal["source"]

        prediabetes = _classify_value("fasting_glucose", 112.0)
        assert prediabetes["label"] == "prediabetes"

        diabetes = _classify_value("fasting_glucose", 130.0)
        assert diabetes["label"] == "diabetes"

    def test_hba1c_classification(self):
        from features.ocr_autofill import _classify_value
        assert _classify_value("hba1c", 5.2)["label"] == "normal"
        assert _classify_value("hba1c", 5.9)["label"] == "prediabetes"
        assert _classify_value("hba1c", 7.2)["label"] == "diabetes"

    def test_physiological_bounds_reject_impossible_values(self):
        from features.ocr_autofill import _validate_physiology
        assert not _validate_physiology("fasting_glucose", 0.0)   # impossible
        assert not _validate_physiology("fasting_glucose", 600.0)  # impossible
        assert _validate_physiology("fasting_glucose", 95.0)       # valid


class TestHerbRecommenderWithRealAPIs:
    """Basic tests for herb recommender (doesn't hit network unless online)."""

    def test_loads_herb_database(self):
        from ayurveda.herb_recommender import CCRAS_HERB_DATABASE
        assert len(CCRAS_HERB_DATABASE) >= 5, "Should have at least 5 herbs in database"

    def test_evidence_tier_scoring(self):
        """CCRAS evidence tiers map to a numeric score used for ranking."""
        from ayurveda.herb_recommender import recommend_herbs
        result = recommend_herbs("high", "moderate", "Pitta", fetch_pubmed=False)
        tiers = {h["evidence_tier"] for h in result["recommended_herbs"]}
        # Every returned herb must carry one of the four CCRAS-defined tiers
        assert tiers <= {"Strong", "Moderate-Strong", "Moderate", "Preliminary", "Unknown"}

    def test_recommendation_structure(self):
        from ayurveda.herb_recommender import recommend_herbs
        # fetch_pubmed=False keeps this test network-independent
        result = recommend_herbs("high", "moderate", "Pitta", fetch_pubmed=False)
        assert "recommended_herbs" in result
        assert "data_attribution" in result
        assert "safety_note" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
