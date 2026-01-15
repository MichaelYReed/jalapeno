interface Nutrient {
  name: string;
  amount: number;
  unit: string;
  daily_value: number | null;
}

interface NutritionData {
  serving_size?: string;
  calories?: number | null;
  nutrients?: Nutrient[];
  cached?: boolean;
  error?: string;
}

interface NutritionFactsProps {
  nutrition: NutritionData | null;
  loading: boolean;
}

export default function NutritionFacts({ nutrition, loading }: NutritionFactsProps) {
  if (loading) {
    return (
      <div className="border-2 border-black dark:border-slate-500 p-4 animate-pulse dark:bg-slate-800">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded mb-2 w-32"></div>
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded mb-4 w-24"></div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!nutrition || nutrition.error) {
    return (
      <div className="border-2 border-gray-300 dark:border-slate-600 p-4 text-center text-gray-500 dark:text-gray-400 rounded-lg">
        <p className="font-medium">Nutrition information unavailable</p>
        <p className="text-sm mt-1">{nutrition?.error || 'Unable to fetch nutrition data'}</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black dark:border-slate-500 dark:bg-slate-800 p-3 font-sans text-sm dark:text-gray-100">
      <h3 className="text-2xl font-black mb-0">Nutrition Facts</h3>
      {nutrition.serving_size && (
        <p className="text-sm border-b-8 border-black dark:border-slate-500 pb-1 mb-1">
          Serving Size: {nutrition.serving_size}
        </p>
      )}

      {/* Calories */}
      {nutrition.calories !== null && nutrition.calories !== undefined && (
        <div className="flex justify-between border-b border-black dark:border-slate-500 py-1 font-bold text-lg">
          <span>Calories</span>
          <span>{Math.round(nutrition.calories)}</span>
        </div>
      )}

      {/* Daily Value Header */}
      <div className="text-right text-xs border-b border-black dark:border-slate-500 py-1">
        % Daily Value*
      </div>

      {/* Nutrients */}
      {nutrition.nutrients && nutrition.nutrients.map((nutrient, index) => (
        <div
          key={index}
          className={`flex justify-between py-1 ${
            index < nutrition.nutrients!.length - 1 ? 'border-b border-gray-300 dark:border-slate-600' : ''
          }`}
        >
          <span className={nutrient.name.includes('Fat') || nutrient.name.includes('Carbs') || nutrient.name === 'Protein' ? 'font-bold' : 'pl-4'}>
            {nutrient.name} {nutrient.amount}{nutrient.unit}
          </span>
          {nutrient.daily_value !== null && (
            <span className="font-bold">{Math.round(nutrient.daily_value)}%</span>
          )}
        </div>
      ))}

      {/* Footer */}
      <div className="text-xs mt-2 pt-2 border-t border-black dark:border-slate-500">
        *Percent Daily Values are based on a 2,000 calorie diet.
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Source: USDA FoodData Central
        {nutrition.cached && <span className="ml-2">(cached)</span>}
      </div>
    </div>
  );
}
