import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronRight, ChevronLeft, CheckCircle2, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const QUESTIONS = [
  {
    id: 1, question: "How would you describe your body frame?",
    options: [
      { text: "Thin, light, delicate frame — hard to gain weight", dosha: "vata" },
      { text: "Medium, muscular, athletic build", dosha: "pitta" },
      { text: "Large, solid, stocky — easy to gain weight", dosha: "kapha" },
    ],
  },
  {
    id: 2, question: "How is your digestion?",
    options: [
      { text: "Irregular, tendency to bloating or constipation", dosha: "vata" },
      { text: "Strong, can eat anything, get irritable if I miss meals", dosha: "pitta" },
      { text: "Slow but steady, rarely feel very hungry", dosha: "kapha" },
    ],
  },
  {
    id: 3, question: "How do you handle stress?",
    options: [
      { text: "I worry and feel anxious, mind races", dosha: "vata" },
      { text: "I get frustrated and impatient, may anger quickly", dosha: "pitta" },
      { text: "I stay calm, may become withdrawn or complacent", dosha: "kapha" },
    ],
  },
  {
    id: 4, question: "What is your skin type?",
    options: [
      { text: "Dry, rough, cold — tendency to chap and crack", dosha: "vata" },
      { text: "Warm, oily, reddish, prone to rashes", dosha: "pitta" },
      { text: "Thick, smooth, oily, well-hydrated, cool", dosha: "kapha" },
    ],
  },
  {
    id: 5, question: "How do you sleep?",
    options: [
      { text: "Light sleeper, difficulty falling asleep, vivid dreams", dosha: "vata" },
      { text: "Moderate, can wake up easily, intense dreams", dosha: "pitta" },
      { text: "Heavy, long sleeper, hard to wake up, feel drowsy", dosha: "kapha" },
    ],
  },
];

export default function PrakritiQuizPage() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<{ vata: number; pitta: number; kapha: number } | null>(null);

  const handleAnswer = (dosha: string) => {
    const newAnswers = [...answers, dosha];
    setAnswers(newAnswers);
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      const counts = newAnswers.reduce((acc, d) => ({ ...acc, [d]: (acc[d as keyof typeof acc] ?? 0) + 1 }), { vata: 0, pitta: 0, kapha: 0 });
      const total = newAnswers.length;
      setResult({
        vata: Math.round((counts.vata / total) * 100),
        pitta: Math.round((counts.pitta / total) * 100),
        kapha: Math.round((counts.kapha / total) * 100),
      });
      toast.success("Prakriti analysis complete!");
    }
  };

  const reset = () => { setCurrentQ(0); setAnswers([]); setResult(null); };
  const progress = ((currentQ) / QUESTIONS.length) * 100;

  if (result) {
    const dominant = Object.entries(result).sort(([, a], [, b]) => b - a)[0][0];
    return (
      <motion.div className="max-w-2xl space-y-6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <div>
          <h1 className="text-2xl font-bold">Your Prakriti Result</h1>
          <p className="text-muted-foreground text-sm">Your unique body-mind constitution has been identified</p>
        </div>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardContent className="p-6 text-center space-y-4">
            <div className="size-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto">
              <Leaf className="size-8 text-green-600" />
            </div>
            <div>
              <Badge variant="outline" className="text-green-600 border-green-500/30 mb-2">Dominant Dosha</Badge>
              <h2 className="text-3xl font-extrabold capitalize text-gradient">{dominant} Prakriti</h2>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Dosha Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { dosha: "Vata", value: result.vata, color: "text-blue-500" },
              { dosha: "Pitta", value: result.pitta, color: "text-orange-500" },
              { dosha: "Kapha", value: result.kapha, color: "text-green-500" },
            ].map((d) => (
              <div key={d.dosha}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className={`font-semibold ${d.color}`}>{d.dosha}</span>
                  <span className="font-bold">{d.value}%</span>
                </div>
                <Progress value={d.value} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button onClick={reset} variant="outline" className="flex-1">Retake Quiz</Button>
          <Button className="flex-1 gradient-primary text-white border-0 hover:opacity-90">View Full Plan</Button>
        </div>
      </motion.div>
    );
  }

  const q = QUESTIONS[currentQ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prakriti Analysis Quiz</h1>
        <p className="text-muted-foreground text-sm">Discover your unique Ayurvedic body constitution</p>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Question {currentQ + 1} of {QUESTIONS.length}</span>
          <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">{q.question}</h2>
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <button key={i} onClick={() => handleAnswer(opt.dosha)}
                    className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm">
                    {opt.text}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
