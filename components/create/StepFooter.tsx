import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface StepFooterProps {
  onNext: () => void;
  onBack?: () => void;
  showBack?: boolean;
  nextLabel?: string;
  isNextDisabled?: boolean;
  isLoading?: boolean;
}

export function StepFooter({
  onNext,
  onBack,
  showBack = true,
  nextLabel = "Continue",
  isNextDisabled = false,
  isLoading = false,
}: StepFooterProps) {
  return (
    <div className="mt-auto pt-8 flex items-center justify-between border-t border-white/10">
      <div>
        {showBack && onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-2"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
      </div>
      <Button
        onClick={onNext}
        disabled={isNextDisabled || isLoading}
        className="bg-white text-black hover:bg-slate-200 px-8 py-6 rounded-lg text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : nextLabel}
      </Button>
    </div>
  );
}
