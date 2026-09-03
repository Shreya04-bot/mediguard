import React, { useMemo, useState } from "react";
import {
    Activity,
    ArrowRight,
    Brain,
    Check,
    GitBranch,
    Loader2,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { simulateTimelineApi } from "@/services/featuresService";

const scenarios = [
    {
        key: "no_change",
        label: "No Change",
        description: "Current lifestyle continues without intervention.",
    },
    {
        key: "diet_exercise",
        label: "Diet + Exercise",
        description: "Improved diet and regular physical activity.",
    },
    {
        key: "quit_smoking",
        label: "Quit Smoking",
        description: "Smoking is discontinued.",
    },
    {
        key: "bmi_reduction",
        label: "BMI Reduction",
        description: "Gradual reduction toward a healthier BMI.",
    },
    {
        key: "medication",
        label: "Medication",
        description: "Risk management with medication.",
    },
    {
        key: "combined_optimal",
        label: "Combined Optimal",
        description: "Multiple beneficial lifestyle interventions together.",
    },
];

const initialPatient = {
    age: "58",
    gender: "male",
    bmi: "27.4",
    blood_pressure_systolic: "138",
    blood_pressure_diastolic: "88",
    fasting_glucose: "118",
    hba1c: "6.1",
    cholesterol_total: "210",
    cholesterol_hdl: "42",
    cholesterol_ldl: "138",
    triglycerides: "165",
    smoking: false,
    family_history_diabetes: false,
    family_history_cvd: false,
    physical_activity: "moderate",
};

const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

export default function TimelineSimulatorPage() {
    const [patient, setPatient] = useState(initialPatient);
    const [selectedScenarios, setSelectedScenarios] = useState([
        "no_change",
        "diet_exercise",
        "combined_optimal",
    ]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const updatePatient = (field, value) => {
        setPatient((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const toggleScenario = (key) => {
        setSelectedScenarios((current) =>
            current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key]
        );
    };

    const runSimulation = async (event) => {
        event.preventDefault();

        if (!selectedScenarios.length) {
            setError("Select at least one scenario.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const payload = {
                age: toNumber(patient.age),
                gender: patient.gender,
                bmi: toNumber(patient.bmi),
                blood_pressure_systolic: toNumber(patient.blood_pressure_systolic),
                blood_pressure_diastolic: toNumber(patient.blood_pressure_diastolic),
                fasting_glucose: toNumber(patient.fasting_glucose),
                hba1c: toNumber(patient.hba1c),
                cholesterol_total: toNumber(patient.cholesterol_total),
                cholesterol_hdl: toNumber(patient.cholesterol_hdl),
                cholesterol_ldl: toNumber(patient.cholesterol_ldl),
                triglycerides: toNumber(patient.triglycerides),
                smoking: Boolean(patient.smoking),
                family_history_diabetes: Boolean(patient.family_history_diabetes),
                family_history_cvd: Boolean(patient.family_history_cvd),
                physical_activity: patient.physical_activity,
            };

            const response = await simulateTimelineApi(
                payload,
                selectedScenarios
            );

            setResult(response?.data ?? response);
        } catch (err) {
            setError(
                err?.response?.data?.detail ||
                "Unable to generate the health timeline."
            );
        } finally {
            setLoading(false);
        }
    };

    const chartData = useMemo(() => {
        if (!result?.years || !result?.scenarios) return [];

        return result.years.map((year, index) => {
            const row = { year };

            Object.entries(result.scenarios).forEach(([key, scenario]) => {
                if (selectedScenarios.includes(key)) {
                    row[`${key}_diabetes`] = Number(
                        (scenario.diabetes_prob?.[index] ?? 0) * 100
                    );
                    row[`${key}_cvd`] = Number(
                        (scenario.cardiovascular_prob?.[index] ?? 0) * 100
                    );
                }
            });

            return row;
        });
    }, [result, selectedScenarios]);

    const scenarioColors = [
        "var(--chart-1)",
        "var(--chart-2)",
        "var(--chart-3)",
        "var(--chart-4)",
        "var(--chart-5)",
    ];

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card p-6 shadow-sm md:p-8">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <GitBranch className="h-3.5 w-3.5" />
                            Long-Term Risk Simulation
                        </div>

                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                            Health Timeline
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
                            Explore how different lifestyle and treatment scenarios could
                            influence diabetes and cardiovascular risk over the next
                            20 years.
                        </p>
                    </div>

                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                        <Brain className="h-8 w-8 text-primary" />
                    </div>
                </div>
            </div>

            <form onSubmit={runSimulation} className="space-y-6">
                <section className="rounded-[26px] border border-border/60 bg-card p-5 shadow-sm md:p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold">Patient Profile</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Enter the clinical values used for the simulation.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            ["age", "Age"],
                            ["bmi", "BMI"],
                            ["blood_pressure_systolic", "Systolic BP"],
                            ["blood_pressure_diastolic", "Diastolic BP"],
                            ["fasting_glucose", "Fasting Glucose"],
                            ["hba1c", "HbA1c"],
                            ["cholesterol_total", "Total Cholesterol"],
                            ["cholesterol_hdl", "HDL"],
                            ["cholesterol_ldl", "LDL"],
                            ["triglycerides", "Triglycerides"],
                        ].map(([field, label]) => (
                            <label key={field} className="space-y-2">
                                <span className="text-sm font-medium">{label}</span>
                                <input
                                    type="number"
                                    step="any"
                                    value={patient[field]}
                                    onChange={(e) =>
                                        updatePatient(field, e.target.value)
                                    }
                                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                                />
                            </label>
                        ))}

                        <label className="space-y-2">
                            <span className="text-sm font-medium">Gender</span>
                            <select
                                value={patient.gender}
                                onChange={(e) =>
                                    updatePatient("gender", e.target.value)
                                }
                                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium">
                                Physical Activity
                            </span>
                            <select
                                value={patient.physical_activity}
                                onChange={(e) =>
                                    updatePatient("physical_activity", e.target.value)
                                }
                                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                            >
                                <option value="low">Low</option>
                                <option value="moderate">Moderate</option>
                                <option value="high">High</option>
                            </select>
                        </label>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        {[
                            ["smoking", "Smoking"],
                            ["family_history_diabetes", "Family History: Diabetes"],
                            ["family_history_cvd", "Family History: CVD"],
                        ].map(([field, label]) => (
                            <button
                                type="button"
                                key={field}
                                onClick={() =>
                                    updatePatient(field, !patient[field])
                                }
                                className={`rounded-xl border px-4 py-2.5 text-sm transition ${patient[field]
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-background text-muted-foreground"
                                    }`}
                            >
                                {patient[field] && (
                                    <Check className="mr-1.5 inline h-4 w-4" />
                                )}
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="rounded-[26px] border border-border/60 bg-card p-5 shadow-sm md:p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold">
                            Compare Scenarios
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Select the interventions you want to compare.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {scenarios.map((scenario) => {
                            const selected = selectedScenarios.includes(scenario.key);

                            return (
                                <button
                                    type="button"
                                    key={scenario.key}
                                    onClick={() => toggleScenario(scenario.key)}
                                    className={`rounded-2xl border p-4 text-left transition ${selected
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border/70 bg-background hover:border-primary/40"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{scenario.label}</p>
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                {scenario.description}
                                            </p>
                                        </div>

                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                                }`}
                                        >
                                            {selected ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Activity className="h-4 w-4" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Simulating...
                            </>
                        ) : (
                            <>
                                Run Simulation
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </button>

                    {error && (
                        <p className="mt-3 text-sm text-destructive">{error}</p>
                    )}
                </section>
            </form>

            {result && (
                <>
                    <section className="rounded-[26px] border border-border/60 bg-card p-5 shadow-sm md:p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold">
                                Risk Projection
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Projected diabetes and cardiovascular risk across the
                                selected scenarios.
                            </p>
                        </div>

                        <div className="h-[420px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={chartData}
                                    margin={{
                                        top: 10,
                                        right: 20,
                                        left: 0,
                                        bottom: 10,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="stroke-border/60"
                                    />
                                    <XAxis
                                        dataKey="year"
                                        tickFormatter={(value) =>
                                            value === 0 ? "Now" : `${value}y`
                                        }
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tickFormatter={(value) => `${value}%`}
                                    />
                                    <Tooltip
                                        formatter={(value) =>
                                            `${Number(value).toFixed(1)}%`
                                        }
                                        labelFormatter={(value) =>
                                            value === 0
                                                ? "Current"
                                                : `${value}-year projection`
                                        }
                                    />

                                    {selectedScenarios.map((key, index) => (
                                        <React.Fragment key={key}>
                                            <Line
                                                type="monotone"
                                                dataKey={`${key}_diabetes`}
                                                name={`${result.scenarios[key]?.label || key} — Diabetes`}
                                                stroke={scenarioColors[index % scenarioColors.length]}
                                                strokeWidth={2.5}
                                                dot={false}
                                            />
                                        </React.Fragment>
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-2">
                        {Object.entries(result.scenarios || {}).map(
                            ([key, scenario]) => {
                                if (!selectedScenarios.includes(key)) return null;

                                const diabetesStart =
                                    Number(scenario.diabetes_prob?.[0] || 0) * 100;
                                const diabetesEnd =
                                    Number(
                                        scenario.diabetes_prob?.[
                                        scenario.diabetes_prob.length - 1
                                        ] || 0
                                    ) * 100;

                                const improving = diabetesEnd < diabetesStart;

                                return (
                                    <div
                                        key={key}
                                        className="rounded-[24px] border border-border/60 bg-card p-5 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold">
                                                    {scenario.label}
                                                </h3>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {scenario.description}
                                                </p>
                                            </div>

                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-xl ${improving
                                                        ? "bg-emerald-500/10 text-emerald-600"
                                                        : "bg-orange-500/10 text-orange-600"
                                                    }`}
                                            >
                                                {improving ? (
                                                    <TrendingDown className="h-5 w-5" />
                                                ) : (
                                                    <TrendingUp className="h-5 w-5" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-5 grid grid-cols-2 gap-3">
                                            <div className="rounded-xl bg-muted/50 p-3">
                                                <p className="text-xs text-muted-foreground">
                                                    Starting Diabetes Risk
                                                </p>
                                                <p className="mt-1 text-xl font-semibold">
                                                    {diabetesStart.toFixed(1)}%
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-muted/50 p-3">
                                                <p className="text-xs text-muted-foreground">
                                                    20-Year Diabetes Risk
                                                </p>
                                                <p className="mt-1 text-xl font-semibold">
                                                    {diabetesEnd.toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        )}
                    </section>

                    {result.insights?.length > 0 && (
                        <section className="rounded-[26px] border border-primary/20 bg-primary/5 p-5 md:p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                    <Brain className="h-5 w-5 text-primary" />
                                </div>

                                <div>
                                    <h2 className="font-semibold">
                                        Simulation Insights
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Key observations from the projected scenarios.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {result.insights.map((insight, index) => (
                                    <div
                                        key={index}
                                        className="rounded-xl border border-border/50 bg-card p-4 text-sm leading-6"
                                    >
                                        {typeof insight === "string"
                                            ? insight
                                            : JSON.stringify(insight)}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}