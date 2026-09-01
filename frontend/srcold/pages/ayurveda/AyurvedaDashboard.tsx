import { motion } from "framer-motion";
import { Leaf, Star, Heart, Activity, BookOpen, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { mockAyurvedaData } from "@/data/mockData";

export default function AyurvedaDashboard() {
  const { prakriti, recommendations } = mockAyurvedaData;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 150), oklch(0.55 0.15 120))" }}>
        <div className="absolute right-0 top-0 opacity-10"><Leaf className="size-48" /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2"><Leaf className="size-5" /><span className="font-semibold">Ayurveda Wellness</span></div>
          <h2 className="text-2xl font-bold mb-1">Your Wellness Journey</h2>
          <p className="text-white/70 text-sm">Personalised Ayurvedic guidance based on your Prakriti analysis</p>
          <div className="flex gap-3 mt-4">
            <Button size="sm" variant="secondary" asChild><Link to="/ayurveda/quiz"><Star className="size-4 mr-1.5" />Take Prakriti Quiz</Link></Button>
          </div>
        </div>
      </motion.div>

      {/* Prakriti Summary */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Star className="size-5 text-amber-500" />Your Prakriti (Body Constitution)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Your dominant dosha is <strong>Pitta</strong>, followed by Vata. This influences your metabolism, digestion, and mental characteristics.</p>
          {[
            { dosha: "Vata", value: prakriti.vata, desc: "Air & Space — movement, creativity, flexibility", color: "bg-blue-500" },
            { dosha: "Pitta", value: prakriti.pitta, desc: "Fire & Water — metabolism, intelligence, transformation", color: "bg-orange-500" },
            { dosha: "Kapha", value: prakriti.kapha, desc: "Earth & Water — stability, strength, lubrication", color: "bg-green-500" },
          ].map((item) => (
            <div key={item.dosha}>
              <div className="flex justify-between text-sm mb-1.5">
                <div>
                  <span className="font-semibold">{item.dosha}</span>
                  <span className="text-muted-foreground text-xs ml-2">{item.desc}</span>
                </div>
                <span className="font-bold">{item.value}%</span>
              </div>
              <Progress value={item.value} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Diet */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Heart className="size-4 text-rose-500" />Diet Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recommendations.diet.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <ChevronRight className="size-4 text-green-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-3" asChild>
              <Link to="/ayurveda/diet">Full Diet Plan</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Yoga */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-blue-500" />Yoga Practices</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recommendations.yoga.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <ChevronRight className="size-4 text-blue-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-3" asChild>
              <Link to="/ayurveda/yoga">Full Yoga Plan</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Herbs */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Leaf className="size-4 text-green-500" />Herbal Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recommendations.herbs.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <div className="size-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Leaf className="size-3 text-green-600" />
                </div>
                <span>{item}</span>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-3" asChild>
              <Link to="/ayurveda/herbs">Herbal Guide</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
