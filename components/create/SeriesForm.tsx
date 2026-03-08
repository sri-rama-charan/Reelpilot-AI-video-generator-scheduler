"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Stepper } from "@/components/create/Stepper";
import { NicheSelection } from "@/components/create/NicheSelection";
import { LanguageVoiceSelection } from "@/components/create/LanguageVoiceSelection";
import { FormatMusicSelection } from "@/components/create/FormatMusicSelection";
import { VideoStyleSelection } from "@/components/create/VideoStyleSelection";
import { CaptionStyleSelection } from "@/components/create/CaptionStyleSelection";
import { SeriesDetails } from "@/components/create/SeriesDetails";
import { StepFooter } from "@/components/create/StepFooter";
import { UpgradeDialog } from "@/components/dialogs/UpgradeDialog";
import { Plan } from "@/lib/plans";

interface SeriesConfig {
  niche: string | null;
  language: string | null;
  voice: string | null;
  backgroundMusic: string[];
  videoStyle: string | null;
  captionStyle: string | null;
  seriesName: string;
  duration: string;
  platform: string;
  publishTime: string;
}

interface SeriesFormProps {
  mode?: "create" | "edit";
  seriesId?: number;
  initialConfig?: SeriesConfig;
}

const defaultConfig: SeriesConfig = {
  niche: null,
  language: null,
  voice: null,
  backgroundMusic: [],
  videoStyle: null,
  captionStyle: null,
  seriesName: "",
  duration: "",
  platform: "",
  publishTime: "",
};

export function SeriesForm({
  mode = "create",
  seriesId,
  initialConfig,
}: SeriesFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [userPlan, setUserPlan] = useState<Plan | null>(null);

  const [seriesConfig, setSeriesConfig] = useState<SeriesConfig>(
    initialConfig || defaultConfig,
  );

  const handleNext = async () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => Math.min(prev + 1, 6));
    } else {
      try {
        setIsSubmitting(true);

        const url = mode === "edit" ? `/api/series/${seriesId}` : "/api/series";
        const method = mode === "edit" ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(seriesConfig),
        });

        if (res.status === 403) {
          // Handle plan limit error
          const errorData = await res.json();
          if (errorData.requiresUpgrade) {
            setUserPlan(errorData.plan);
            setShowUpgradeDialog(true);
            toast.error(errorData.message || "Series limit reached. Please upgrade your plan.");
            return;
          }
        }

        if (!res.ok) {
          const errorData = await res.text();
          throw new Error(errorData || `Failed to ${mode} series`);
        }

        toast.success(
          mode === "edit"
            ? "Series updated successfully!"
            : "Series scheduled successfully!",
        );
        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        console.error(`Error ${mode}ing series:`, error);
        toast.error(
          error instanceof Error ? error.message : `Failed to ${mode} series`,
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleUpdateSeriesDetail = (field: string, value: string) => {
    setSeriesConfig((prev) => ({ ...prev, [field]: value }));
  };

  const isNextDisabled = () => {
    if (currentStep === 1) return !seriesConfig.niche;
    if (currentStep === 2) return !seriesConfig.language || !seriesConfig.voice;
    if (currentStep === 3) return seriesConfig.backgroundMusic.length === 0;
    if (currentStep === 4) return !seriesConfig.videoStyle;
    if (currentStep === 5) return !seriesConfig.captionStyle;
    if (currentStep === 6)
      return (
        !seriesConfig.seriesName ||
        !seriesConfig.duration ||
        !seriesConfig.platform ||
        !seriesConfig.publishTime
      );
    return false;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <Stepper currentStep={currentStep} />

        <div className="mt-12 bg-black/40 border border-white/10 rounded-2xl p-8 backdrop-blur-xl min-h-[600px] flex flex-col">
          {currentStep === 1 && (
            <NicheSelection
              selectedNiche={seriesConfig.niche}
              onSelectNiche={(nicheId) =>
                setSeriesConfig((prev) => ({ ...prev, niche: nicheId }))
              }
            />
          )}
          {currentStep === 2 && (
            <LanguageVoiceSelection
              selectedLanguage={seriesConfig.language}
              selectedVoice={seriesConfig.voice}
              onSelectLanguage={(lang) =>
                setSeriesConfig((prev) => ({ ...prev, language: lang }))
              }
              onSelectVoice={(voice) =>
                setSeriesConfig((prev) => ({ ...prev, voice: voice }))
              }
            />
          )}
          {currentStep === 3 && (
            <FormatMusicSelection
              selectedMusic={seriesConfig.backgroundMusic}
              onSelectMusic={(musicIds) =>
                setSeriesConfig((prev) => ({
                  ...prev,
                  backgroundMusic: musicIds,
                }))
              }
            />
          )}
          {currentStep === 4 && (
            <VideoStyleSelection
              selectedStyle={seriesConfig.videoStyle}
              onSelectStyle={(styleId) =>
                setSeriesConfig((prev) => ({ ...prev, videoStyle: styleId }))
              }
            />
          )}
          {currentStep === 5 && (
            <CaptionStyleSelection
              selectedCaption={seriesConfig.captionStyle}
              onSelectCaption={(captionId) =>
                setSeriesConfig((prev) => ({
                  ...prev,
                  captionStyle: captionId,
                }))
              }
            />
          )}
          {currentStep === 6 && (
            <SeriesDetails
              seriesName={seriesConfig.seriesName}
              duration={seriesConfig.duration}
              platform={seriesConfig.platform}
              publishTime={seriesConfig.publishTime}
              onUpdate={handleUpdateSeriesDetail}
            />
          )}

          <StepFooter
            onNext={handleNext}
            onBack={handleBack}
            showBack={currentStep > 1}
            isNextDisabled={isNextDisabled()}
            isLoading={isSubmitting}
            nextLabel={
              currentStep === 6
                ? mode === "edit"
                  ? "Update Series"
                  : "Schedule"
                : "Continue"
            }
          />
        </div>
      </div>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentPlan={userPlan || "Free"}
        reason="series_limit"
      />
    </div>
  );
}
