"use client";

import { useState } from "react";
import { Stepper } from "@/components/create/Stepper";
import { NicheSelection } from "@/components/create/NicheSelection";
import { LanguageVoiceSelection } from "@/components/create/LanguageVoiceSelection";
import { FormatMusicSelection } from "@/components/create/FormatMusicSelection";
import { VideoStyleSelection } from "@/components/create/VideoStyleSelection";
import { CaptionStyleSelection } from "@/components/create/CaptionStyleSelection";
import { SeriesDetails } from "@/components/create/SeriesDetails";
import { StepFooter } from "@/components/create/StepFooter";

export default function CreateSeriesPage() {
  const [currentStep, setCurrentStep] = useState(1);

  // Global state for all 6 steps
  const [seriesConfig, setSeriesConfig] = useState({
    niche: null as string | null,
    language: null as string | null,
    voice: null as string | null,
    backgroundMusic: [] as string[],
    videoStyle: null as string | null,
    captionStyle: null as string | null,
    seriesName: "",
    duration: "",
    platform: "",
    publishTime: "",
  });

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleUpdateSeriesDetail = (field: string, value: string) => {
    setSeriesConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Prevent moving to next step if required fields are missing
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
            nextLabel={currentStep === 6 ? "Schedule" : "Continue"}
          />
        </div>
      </div>
    </div>
  );
}
