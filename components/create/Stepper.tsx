import { Check } from "lucide-react";

interface StepperProps {
  currentStep: number;
}

const steps = [
  "Niche",
  "Language & Voice",
  "Format",
  "Script",
  "Assets",
  "Review",
];

export function Stepper({ currentStep }: StepperProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 rounded-full" />

        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 rounded-full transition-all duration-300"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;

          return (
            <div
              key={step}
              className="relative flex flex-col items-center gap-2 z-10"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors duration-300 ${
                  isCompleted
                    ? "bg-indigo-500 text-white"
                    : isActive
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20"
                      : "bg-white/10 text-slate-400 border border-white/10"
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
              </div>
              <span
                className={`text-xs absolute -bottom-6 whitespace-nowrap hidden sm:block ${
                  isActive || isCompleted
                    ? "text-white font-medium"
                    : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
