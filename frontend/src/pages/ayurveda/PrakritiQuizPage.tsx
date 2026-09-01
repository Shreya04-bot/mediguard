import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  CheckCircle2,
  Leaf,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import api from "@/services/api";


type Dosha = "vata" | "pitta" | "kapha";


interface PrakritiOption {
  text_en: string;
  text_hi: string;
  dosha: Dosha;
  score: number;
}

interface PrakritiQuestion {
  id: number;
  category: string;
  question_en: string;
  question_hi: string;
  options: PrakritiOption[];
}


interface PrakritiResult {
  scores: {
    vata: number;
    pitta: number;
    kapha: number;
  };

  percentages: {
    vata: number;
    pitta: number;
    kapha: number;
  };

  primary_dosha: Dosha;
  secondary_dosha: Dosha | null;

  constitution: string;

  profile: {
    name_en: string;
    name_hi: string;
    element: string;
    qualities: string[];
    strengths: string[];
    challenges: string[];
    disease_tendency: string[];
    color: string;
    emoji: string;
  };

  risk_adjustment: {
    diabetes_delta: number;
    cvd_delta: number;
    description: string;
  };

  total_questions: number;
}


export default function PrakritiQuizPage() {

  const [questions, setQuestions] = useState<
    PrakritiQuestion[]
  >([]);

  const [currentQ, setCurrentQ] = useState(0);

  const [answers, setAnswers] = useState<
    { question_id: number; dosha: Dosha }[]
  >([]);

  const [result, setResult] =
    useState<PrakritiResult | null>(null);

  const [loadingQuestions, setLoadingQuestions] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);


  /*
   * Load the official questionnaire
   * from the FastAPI backend.
   */
  useEffect(() => {

    const loadQuestions = async () => {

      try {

        setLoadingQuestions(true);

        const response = await api.get(
          "/features/ayurveda/prakriti/questions"
        );

        const data = response?.data ?? response;

        setQuestions(data?.questions ?? []);

      } catch (error) {

        console.error(
          "Failed to load Prakriti questions:",
          error
        );

        toast.error(
          "Unable to load the Prakriti questionnaire."
        );

      } finally {

        setLoadingQuestions(false);

      }

    };


    loadQuestions();

  }, []);


  /*
   * Submit the completed questionnaire
   * to the backend scorer.
   */
  const submitAnswers = async (
    finalAnswers: {
      question_id: number;
      dosha: Dosha;
    }[]
  ) => {

    try {

      setSubmitting(true);

      const response = await api.post(
        "/features/ayurveda/prakriti/score",
        {
          answers: finalAnswers,
        }
      );

      const data = response?.data ?? response;

      setResult(data);

      localStorage.setItem(
        "mediguard_prakriti_result",
        JSON.stringify(data)
      );

      toast.success(
        "Prakriti analysis complete!"
      );

    } catch (error) {

      console.error(
        "Prakriti scoring failed:",
        error
      );

      toast.error(
        "Unable to calculate your Prakriti. Please try again."
      );

    } finally {

      setSubmitting(false);

    }

  };


  /*
   * Handle an answer.
   */
  const handleAnswer = (dosha: Dosha) => {

    if (submitting) return;

    const question = questions[currentQ];

    if (!question) return;


    const updatedAnswers = [
      ...answers,
      {
        question_id: question.id,
        dosha,
      },
    ];


    setAnswers(updatedAnswers);


    /*
     * Move to the next question.
     */
    if (currentQ < questions.length - 1) {

      setCurrentQ(currentQ + 1);

      return;
    }


    /*
     * Last question:
     * send all answers to backend.
     */
    submitAnswers(updatedAnswers);

  };


  /*
   * Start the quiz again.
   */
  const reset = () => {

    setCurrentQ(0);

    setAnswers([]);

    setResult(null);

  };


  /*
   * Loading state.
   */
  if (loadingQuestions) {

    return (
      <div className="max-w-2xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold">
            Prakriti Analysis Quiz
          </h1>

          <p className="text-muted-foreground text-sm">
            Loading your Ayurvedic questionnaire...
          </p>
        </div>

        <Card>

          <CardContent className="p-8 text-center">

            <div className="animate-pulse space-y-4">

              <div className="h-5 bg-muted rounded w-3/4 mx-auto" />

              <div className="h-12 bg-muted rounded" />

              <div className="h-12 bg-muted rounded" />

              <div className="h-12 bg-muted rounded" />

            </div>

          </CardContent>

        </Card>

      </div>
    );

  }


  /*
   * Backend failed to provide questions.
   */
  if (!questions.length) {

    return (
      <div className="max-w-2xl">

        <Card>

          <CardContent className="p-8 text-center space-y-4">

            <Leaf className="size-10 mx-auto text-green-600" />

            <h2 className="text-xl font-bold">
              Prakriti questionnaire unavailable
            </h2>

            <p className="text-sm text-muted-foreground">
              We couldn't load the questionnaire from
              the MediGuard AI backend.
            </p>

            <Button
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>

          </CardContent>

        </Card>

      </div>
    );

  }


  /*
   * Display the backend-generated result.
   */
  if (result) {

    const percentages = result.percentages;

    return (
      <motion.div
        className="max-w-2xl space-y-6"
        initial={{
          opacity: 0,
          scale: 0.95,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
      >

        <div>

          <h1 className="text-2xl font-bold">
            Your Prakriti Result
          </h1>

          <p className="text-muted-foreground text-sm">
            Your Ayurvedic body-mind constitution
            has been analyzed.
          </p>

        </div>


        {/* Primary Dosha */}

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">

          <CardContent className="p-6 text-center space-y-4">

            <div className="size-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto">

              <Leaf className="size-8 text-green-600" />

            </div>


            <div>

              <Badge
                variant="outline"
                className="text-green-600 border-green-500/30 mb-2"
              >
                Dominant Dosha
              </Badge>


              <h2 className="text-3xl font-extrabold capitalize text-gradient">

                {result.primary_dosha} Prakriti

              </h2>


              {result.secondary_dosha && (

                <p className="text-sm text-muted-foreground mt-2">

                  Secondary Dosha:{" "}

                  <span className="font-semibold capitalize">

                    {result.secondary_dosha}

                  </span>

                </p>

              )}


              <p className="text-sm text-muted-foreground mt-1">

                {result.constitution}

              </p>

            </div>

          </CardContent>

        </Card>


        {/* Dosha Breakdown */}

        <Card>

          <CardHeader>

            <CardTitle>
              Dosha Breakdown
            </CardTitle>

          </CardHeader>


          <CardContent className="space-y-4">

            {[
              {
                dosha: "Vata",
                key: "vata" as const,
                value: percentages.vata,
                color: "text-blue-500",
              },

              {
                dosha: "Pitta",
                key: "pitta" as const,
                value: percentages.pitta,
                color: "text-orange-500",
              },

              {
                dosha: "Kapha",
                key: "kapha" as const,
                value: percentages.kapha,
                color: "text-green-500",
              },

            ].map((d) => (

              <div key={d.dosha}>

                <div className="flex justify-between text-sm mb-1.5">

                  <span
                    className={`font-semibold ${d.color}`}
                  >
                    {d.dosha}
                  </span>

                  <span className="font-bold">
                    {d.value}%
                  </span>

                </div>


                <Progress
                  value={d.value}
                  className="h-2"
                />

              </div>

            ))}

          </CardContent>

        </Card>


        {/* Profile Information */}

        <Card>

          <CardHeader>

            <CardTitle>
              Your {result.profile.name_en} Profile
            </CardTitle>

          </CardHeader>


          <CardContent className="space-y-5">

            <div>

              <p className="text-sm font-semibold mb-2">
                Element
              </p>

              <p className="text-sm text-muted-foreground">
                {result.profile.element}
              </p>

            </div>


            <div>

              <p className="text-sm font-semibold mb-2">
                Qualities
              </p>

              <div className="flex flex-wrap gap-2">

                {result.profile.qualities.map(
                  (quality) => (

                    <Badge
                      key={quality}
                      variant="secondary"
                    >
                      {quality}
                    </Badge>

                  )
                )}

              </div>

            </div>


            <div>

              <p className="text-sm font-semibold mb-2">
                Strengths
              </p>

              <div className="flex flex-wrap gap-2">

                {result.profile.strengths.map(
                  (strength) => (

                    <Badge
                      key={strength}
                      variant="outline"
                    >
                      {strength}
                    </Badge>

                  )
                )}

              </div>

            </div>


            <div>

              <p className="text-sm font-semibold mb-2">
                Common Challenges
              </p>

              <div className="flex flex-wrap gap-2">

                {result.profile.challenges.map(
                  (challenge) => (

                    <Badge
                      key={challenge}
                      variant="outline"
                    >
                      {challenge}
                    </Badge>

                  )
                )}

              </div>

            </div>

          </CardContent>

        </Card>


        {/* Completion information */}

        <Card>

          <CardContent className="p-5">

            <div className="flex items-start gap-3">

              <CheckCircle2 className="size-5 text-green-600 mt-0.5" />

              <div>

                <p className="font-semibold">
                  Analysis completed
                </p>

                <p className="text-sm text-muted-foreground mt-1">

                  {result.total_questions} questions
                  were processed by the MediGuard AI
                  Prakriti scoring engine.

                </p>

              </div>

            </div>

          </CardContent>

        </Card>


        {/* Actions */}

        <div className="flex gap-3">

          <Button
            onClick={reset}
            variant="outline"
            className="flex-1"
          >
            Retake Quiz
          </Button>

          <Button
            className="flex-1 gradient-primary text-white border-0 hover:opacity-90"
            onClick={() => {
              toast.info(
                "Personalized plans will use this Prakriti result."
              );
            }}
          >
            View Full Plan
          </Button>

        </div>

      </motion.div>
    );

  }


  const question = questions[currentQ];

  const progress =
    (currentQ / questions.length) * 100;


  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}

      <div>

        <h1 className="text-2xl font-bold">
          Prakriti Analysis Quiz
        </h1>

        <p className="text-muted-foreground text-sm">
          Discover your unique Ayurvedic body
          constitution
        </p>

      </div>


      {/* Progress */}

      <div className="space-y-2">

        <div className="flex justify-between text-sm">

          <span className="text-muted-foreground">

            Question {currentQ + 1} of{" "}
            {questions.length}

          </span>


          <span className="text-muted-foreground">

            {Math.round(progress)}% complete

          </span>

        </div>


        <Progress
          value={progress}
          className="h-2"
        />

      </div>


      {/* Question */}

      <AnimatePresence mode="wait">

        <motion.div
          key={question.id}
          initial={{
            opacity: 0,
            x: 40,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          exit={{
            opacity: 0,
            x: -40,
          }}
        >

          <Card>

            <CardContent className="p-6 space-y-4">

              <h2 className="text-lg font-semibold">
                {question.question_en}
              </h2>


              <div className="space-y-3">

                {question.options.map(
                  (option, index) => (

                    <button
                      key={`${question.id}-${index}`}
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        handleAnswer(option.dosha)
                      }
                      className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <span>
                          {option.text_en}
                        </span>

                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />

                      </div>

                    </button>

                  )
                )}

              </div>

            </CardContent>

          </Card>

        </motion.div>

      </AnimatePresence>


      {submitting && (

        <p className="text-sm text-center text-muted-foreground">

          Analyzing your Prakriti...

        </p>

      )}

    </div>
  );
}