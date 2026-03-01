import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface StepFooterProps {
  onNext: () => void;
  onBack?: () => void;
  showBack?: boolean;
  nextLabel?: string;
  isNextDisabled?: boolean;
}

export function StepFooter({
  onNext,
  onBack,
  showBack = true,
  nextLabel = "Continue",
  isNextDisabled = false,
}: StepFooterProps) {
  return (
    <div className="mt-auto pt-8 flex items-center justify-between border-t border-white/10">
      <div>
        {showBack && onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
      </div>
      <Button
        onClick={onNext}
        disabled={isNextDisabled}
        className="bg-white text-black hover:bg-slate-200 px-8 py-6 rounded-lg text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {nextLabel}
      </Button>
    </div>
  );
}
