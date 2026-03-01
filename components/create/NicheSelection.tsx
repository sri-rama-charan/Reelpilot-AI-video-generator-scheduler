import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface NicheSelectionProps {
  selectedNiche: string | null;
  onSelectNiche: (nicheId: string) => void;
}

const availableNiches = [
  {
    id: "scary-stories",
    title: "Scary Stories",
    description:
      "Creepy, suspenseful tales that keep viewers on the edge of their seats.",
    icon: "👻",
  },
  {
    id: "motivational",
    title: "Motivational",
    description:
      "Inspiring quotes and stories to boost productivity and focus.",
    icon: "🚀",
  },
  {
    id: "facts",
    title: "Interesting Facts",
    description:
      "Mind-blowing trivia and facts across history, science, and space.",
    icon: "🧠",
  },
  {
    id: "bedtime",
    title: "Bedtime Stories",
    description:
      "Calming narratives designed to help audiences relax and fall asleep.",
    icon: "🌙",
  },
  {
    id: "history",
    title: "Historical Events",
    description:
      "Fascinating summaries of major historical events and figures.",
    icon: "📜",
  },
  {
    id: "tech",
    title: "Tech Innovations",
    description:
      "Latest updates and deep dives into new technologies and gadgets.",
    icon: "💻",
  },
];

export function NicheSelection({
  selectedNiche,
  onSelectNiche,
}: NicheSelectionProps) {
  return (
    <div className="flex flex-col h-full flex-1">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-2">Select your series niche</h2>
        <p className="text-slate-400">
          Choose a topic to generate content for your automated video series.
        </p>
      </div>

      <Tabs defaultValue="available" className="w-full flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8 bg-white/5 border border-white/10 p-1">
          <TabsTrigger
            value="available"
            className="rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            Available Niche
          </TabsTrigger>
          <TabsTrigger
            value="custom"
            className="rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            Custom Niche
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="flex-1 mt-0">
          <div className="h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableNiches.map((niche) => (
                <div
                  key={niche.id}
                  onClick={() => onSelectNiche(niche.id)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-4 ${
                    selectedNiche === niche.id
                      ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="text-3xl">{niche.icon}</div>
                  <div>
                    <h3 className="font-semibold text-lg text-white mb-1">
                      {niche.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {niche.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="flex-1 mt-0">
          <div className="h-[400px] flex items-center justify-center p-8 bg-white/5 border border-white/10 rounded-xl border-dashed">
            <div className="text-center max-w-md">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-semibold mb-2">
                Define your own niche
              </h3>
              <p className="text-slate-400 mb-6">
                Describe perfectly what kind of videos you want to generate, and
                our AI will adapt to it.
              </p>
              <textarea
                onChange={(e) => onSelectNiche(`custom:${e.target.value}`)}
                placeholder="E.g., Videos about deep sea creatures and the mystery of the Mariana Trench..."
                className="w-full h-32 bg-black/50 border border-white/20 rounded-lg p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
