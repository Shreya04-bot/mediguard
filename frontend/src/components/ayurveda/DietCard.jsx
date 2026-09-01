import React from "react";
import {
  Utensils,
  Check,
  X,
  Leaf,
  Sparkles,
  Info,
  Clock,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";


export const DietCard = ({
  dietPlan,
  loading,
}) => {

  /*
   * Loading state
   */
  if (loading) {
    return (
      <Card
        className="
          border-slate-200/70
          bg-white
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-950
        "
      >
        <CardContent className="p-6">

          <div className="animate-pulse space-y-4">

            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />

            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />

            <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded" />

            <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded" />

            <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded" />

          </div>

        </CardContent>
      </Card>
    );
  }


  /*
   * User has not completed Prakriti analysis.
   */
  if (!dietPlan) {
    return (
      <Card
        className="
          border-slate-200/70
          bg-white
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-950
        "
      >
        <CardContent className="p-8 text-center">

          <div
            className="
              mx-auto mb-4
              flex size-12
              items-center justify-center
              rounded-xl
              bg-emerald-50
              text-emerald-600
              dark:bg-emerald-950/40
              dark:text-emerald-400
            "
          >
            <Leaf className="size-6" />
          </div>

          <h3 className="text-base font-bold">
            Complete your Prakriti Analysis
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Complete the Prakriti Quiz first so MediGuard AI
            can generate a personalized Ayurvedic diet plan.
          </p>

        </CardContent>
      </Card>
    );
  }


  /*
   * Backend returns:
   *
   * meals
   * recommended_foods
   * guidelines
   * weekly_note
   * disclaimer
   */
  const meals = dietPlan.meals || {};

  const recommendedFoods =
    dietPlan.recommended_foods || {};

  const foodsToMinimize =
    recommendedFoods.avoid || [];


  const recommendedCategories = [
    {
      title: "Grains",
      foods: recommendedFoods.grains || [],
    },
    {
      title: "Vegetables",
      foods: recommendedFoods.vegetables || [],
    },
    {
      title: "Fruits",
      foods: recommendedFoods.fruits || [],
    },
    {
      title: "Proteins",
      foods: recommendedFoods.proteins || [],
    },
    {
      title: "Drinks",
      foods: recommendedFoods.drinks || [],
    },
    {
      title: "Spices",
      foods: recommendedFoods.spices || [],
    },
  ].filter(
    (item) => item.foods.length > 0
  );


  return (
    <Card
      className="
        h-full
        overflow-hidden
        border-slate-200/70
        bg-white
        shadow-sm
        dark:border-slate-800
        dark:bg-slate-950
      "
    >

      {/* HEADER */}

      <CardHeader
        className="
          border-b
          border-slate-100
          px-5 py-5
          dark:border-slate-800
        "
      >

        <div className="flex items-start justify-between gap-4">

          <div className="flex items-start gap-3">

            <div
              className="
                flex size-10 shrink-0
                items-center justify-center
                rounded-xl
                bg-emerald-50
                text-emerald-600
                dark:bg-emerald-950/40
                dark:text-emerald-400
              "
            >
              <Utensils className="size-5" />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <CardTitle className="text-base font-bold tracking-tight">
                  Personalized Diet
                </CardTitle>

                <Sparkles className="size-3.5 text-emerald-500" />

              </div>

              <p className="mt-1 text-xs text-muted-foreground">

                {dietPlan.dosha
                  ? `${dietPlan.dosha
                      .charAt(0)
                      .toUpperCase()}${dietPlan.dosha.slice(1)}-balancing diet`
                  : "Ayurvedic personalized diet"}

              </p>

            </div>

          </div>


          <div
            className="
              hidden items-center gap-1.5
              rounded-full
              border border-emerald-200
              bg-emerald-50
              px-2.5 py-1
              text-[9px] font-semibold
              text-emerald-700
              sm:flex
              dark:border-emerald-900
              dark:bg-emerald-950/30
              dark:text-emerald-400
            "
          >
            <Leaf className="size-3" />
            AI Generated
          </div>

        </div>

      </CardHeader>


      <CardContent className="space-y-6 p-5">


        {/* DAILY MEAL PLAN */}

        <section>

          <div className="mb-3 flex items-center gap-2">

            <div
              className="
                flex size-7
                items-center justify-center
                rounded-lg
                bg-emerald-50
                text-emerald-600
                dark:bg-emerald-950/40
                dark:text-emerald-400
              "
            >
              <Clock className="size-3.5" />
            </div>

            <div>

              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Daily Meal Plan
              </h5>

              <p className="text-[9px] text-muted-foreground">
                Generated according to your profile
              </p>

            </div>

          </div>


          <div className="space-y-2">

            {Object.entries(meals).map(
              ([key, meal]) => (

                <div
                  key={key}
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50/60
                    p-3
                    dark:border-slate-800
                    dark:bg-slate-900/40
                  "
                >

                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {meal.time_label}
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                    {meal.description}
                  </p>

                </div>

              )
            )}

          </div>

        </section>


        {/* DIVIDER */}

        <div className="border-t border-slate-100 dark:border-slate-800" />


        {/* RECOMMENDED FOODS */}

        <section>

          <div className="mb-3 flex items-center justify-between">

            <div className="flex items-center gap-2">

              <div
                className="
                  flex size-7
                  items-center justify-center
                  rounded-lg
                  bg-emerald-50
                  text-emerald-600
                  dark:bg-emerald-950/40
                  dark:text-emerald-400
                "
              >
                <Check className="size-3.5" />
              </div>

              <div>

                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Recommended Foods
                </h5>

                <p className="text-[9px] text-muted-foreground">
                  Foods selected for your Dosha
                </p>

              </div>

            </div>

            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              {recommendedCategories.length} categories
            </span>

          </div>


          <div className="space-y-2">

            {recommendedCategories.map(
              (item) => (

                <div
                  key={item.title}
                  className="
                    rounded-xl
                    border
                    border-emerald-100
                    bg-emerald-50/40
                    p-3
                    dark:border-emerald-950
                    dark:bg-emerald-950/20
                  "
                >

                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    {item.title}
                  </p>

                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                    {item.foods.join(", ")}
                  </p>

                </div>

              )
            )}

          </div>

        </section>


        {/* FOODS TO MINIMIZE */}

        {foodsToMinimize.length > 0 && (

          <>

            <div className="border-t border-slate-100 dark:border-slate-800" />

            <section>

              <div className="mb-3 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <div
                    className="
                      flex size-7
                      items-center justify-center
                      rounded-lg
                      bg-rose-50
                      text-rose-600
                      dark:bg-rose-950/40
                      dark:text-rose-400
                    "
                  >
                    <X className="size-3.5" />
                  </div>

                  <div>

                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Foods to Minimize
                    </h5>

                    <p className="text-[9px] text-muted-foreground">
                      Limit these where possible
                    </p>

                  </div>

                </div>

                <span className="text-[9px] font-medium text-rose-600 dark:text-rose-400">
                  {foodsToMinimize.length} foods
                </span>

              </div>


              <div className="space-y-2">

                {foodsToMinimize.map(
                  (food) => (

                    <div
                      key={food}
                      className="
                        rounded-xl
                        border
                        border-rose-100
                        bg-rose-50/30
                        p-3
                        dark:border-rose-950
                        dark:bg-rose-950/15
                      "
                    >

                      <div className="flex items-start gap-2.5">

                        <span
                          className="
                            mt-1
                            size-1.5
                            shrink-0
                            rounded-full
                            bg-rose-500
                          "
                        />

                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          {food}
                        </p>

                      </div>

                    </div>

                  )
                )}

              </div>

            </section>

          </>

        )}


        {/* GUIDELINES */}

        {dietPlan.guidelines?.length > 0 && (

          <section>

            <div className="mb-3">

              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Ayurvedic Guidelines
              </h5>

            </div>


            <div className="space-y-2">

              {dietPlan.guidelines.map(
                (guideline, index) => (

                  <div
                    key={index}
                    className="
                      flex items-start gap-2
                      text-[10px]
                      leading-relaxed
                      text-muted-foreground
                    "
                  >

                    <Leaf className="mt-0.5 size-3 shrink-0 text-emerald-500" />

                    <span>
                      {guideline}
                    </span>

                  </div>

                )
              )}

            </div>

          </section>

        )}


        {/* WEEKLY NOTE */}

        {dietPlan.weekly_note && (

          <div
            className="
              rounded-xl
              border
              border-emerald-200
              bg-emerald-50/50
              px-3 py-2.5
              dark:border-emerald-900
              dark:bg-emerald-950/20
            "
          >

            <p className="text-[10px] leading-relaxed text-emerald-800 dark:text-emerald-300">
              {dietPlan.weekly_note}
            </p>

          </div>

        )}


        {/* DISCLAIMER */}

        <div
          className="
            flex items-start gap-2
            rounded-xl
            border
            border-slate-200/70
            bg-slate-50/70
            px-3 py-2.5
            dark:border-slate-800
            dark:bg-slate-900/40
          "
        >

          <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />

          <p className="text-[9px] leading-relaxed text-muted-foreground">
            {dietPlan.disclaimer ||
              "Dietary suggestions are intended as general wellness guidance and should complement, not replace, professional medical advice."}
          </p>

        </div>

      </CardContent>

    </Card>
  );
};


export default DietCard;