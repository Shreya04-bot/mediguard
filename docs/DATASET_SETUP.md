# MediGuard AI — Dataset Setup

All 5 real datasets this project trains on already ship in
`backend/data/raw/` — you don't need to download anything to run the app
or retrain the model as-is. This document is for verifying what's there,
understanding where it came from, or replacing/refreshing a source.

## The 5 real sources

| # | Dataset | Ships at | Rows | License |
|---|---|---|---|---|
| 1 | Pima Indians Diabetes | `data/raw/pima_diabetes.csv` | 768 | CC0 (Kaggle: `uciml/pima-indians-diabetes-database`) |
| 2 | Cleveland Heart Disease | `data/raw/cleveland_heart.csv` | ~297 | Public (Kaggle: `cherngs/heart-disease-cleveland-uci`) |
| 3 | Cardiovascular disease dataset | `data/raw/cardio/cardio_train.csv` | 70,000 | Kaggle: `sulianova/cardiovascular-disease-dataset` |
| 4 | Framingham Heart Study (teaching set) | `data/raw/framingham/framingham.csv` | 4,240 | CRAN `riskCommunicator`, NIH/NHLBI-approved (request #7161) |
| 5 | NHANES (teaching set) | `data/raw/nhanes/nhanes.csv` | 10,000 | CRAN `NHANES` (Pruim), GPL (>= 2) |

Every source has a `PROVENANCE.txt` next to it (except #1/#2, covered
below) with the exact retrieval URL, method, and a SHA-256 hash where
one was computed — read those for full detail; this document is the
quick-reference version.

## What each source contributes

- **#1 (Pima)**: real diabetes diagnoses in a diabetes-risk-enriched
  cohort (Pima Indian women).
- **#2 (Cleveland Heart)**: real CVD diagnoses, real total cholesterol.
- **#3 (cardio)**: real BP, real lipid category, real smoking/activity,
  real CVD diagnosis, general population, largest source by row count.
- **#4 (Framingham)**: real hypertension diagnosis (`prevalentHyp`) —
  the only source with a directly-measured hypertension label; the other
  4 sources' `hypertension_label` is a standard clinical BP-threshold
  rule (≥140/90) applied to their own real measured BP.
- **#5 (NHANES)**: real HDL cholesterol and real physical activity — the
  two features every other source fills with a disclosed constant.

**Still not measured by any of the 5 sources**: LDL cholesterol
(derived via a documented ratio from real total cholesterol, not itself
measured) and triglycerides (disclosed fixed constant). See
`ml/data_loader.py`'s `SYNTHETIC_COLUMN_DEFAULTS` /
`SYNTHETIC_COLUMNS_BY_SOURCE` for the exact, complete list per source,
and `PROJECT_SUMMARY.md` §6 for the full disclosure — this project does
not claim these two are real measurements.

## Re-obtaining any source

### #1, #2 — via Kaggle CLI

```bash
pip install kaggle
# Place ~/.kaggle/kaggle.json (from kaggle.com → Account → Create New API Token)

cd backend
kaggle datasets download -d uciml/pima-indians-diabetes-database -p data/raw/pima/ --unzip
kaggle datasets download -d cherngs/heart-disease-cleveland-uci -p data/raw/heart/ --unzip
```
See `docs/datasets/KAGGLE_GUIDE.md` for the exact expected filenames and
schema `ml/data_loader.py` looks for.

### #3 — via Kaggle CLI (preferred) or the same public mirror this project used

```bash
kaggle datasets download -d sulianova/cardiovascular-disease-dataset -p data/raw/cardio/ --unzip
```
If Kaggle access isn't available to you either, `data/raw/cardio/PROVENANCE.txt`
documents the exact GitHub mirror URL and SHA-256 hash used to obtain the
shipped copy — verify any replacement against that hash if you want
certainty it's the identical dataset.

### #4 — via R/CRAN, or the shipped copy's mirror

```r
install.packages("riskCommunicator")
library(riskCommunicator)
write.csv(framingham, "framingham.csv", row.names = FALSE)
```
Or see `data/raw/framingham/PROVENANCE.txt` for the GitHub mirror URL
used to obtain the shipped copy.

### #5 — via R/CRAN, or the shipped copy's mirror

```r
install.packages("NHANES")
library(NHANES)
write.csv(NHANES, "nhanes.csv", row.names = FALSE)
```
Or see `data/raw/nhanes/PROVENANCE.txt` for the GitHub mirror URL used to
obtain the shipped copy.

## After changing any source

```bash
cd backend
python -m ml.train --force-replace
```
`ml/data_loader.py` re-validates schema, recomputes
`data/processed/dataset_metadata.json`'s `sources_used`/`sources_missing`,
and the drift detector will correctly flag the previous model as stale
against the new distribution — that's expected, not a bug (see
`docs/TROUBLESHOOTING.md`).

## Adding a 6th source (e.g. real LDL/triglycerides data)

If you find a real, appropriately-licensed, schema-compatible dataset
with real per-patient LDL or triglycerides:

1. Add it under `data/raw/<name>/`, with a `PROVENANCE.txt` matching the
   pattern of the existing 5.
2. Add a `_transform_<name>()` function in `ml/data_loader.py` following
   the pattern of `_transform_nhanes()` (the most recently added, and the
   clearest template — drops incomplete rows rather than imputing them).
3. Register it in `KAGGLE_DATASETS` and `SYNTHETIC_COLUMNS_BY_SOURCE`,
   and add it to the `loaders` dict in `load_kaggle_training_frame()`.
4. Retrain: `python -m ml.train --force-replace`.
5. Update the table above and `PROJECT_SUMMARY.md` §6's disclosure.
