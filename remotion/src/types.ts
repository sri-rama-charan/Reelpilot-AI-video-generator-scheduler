export interface WordTimestamp {
  word: string;
  start: number; // seconds
  end: number; // seconds
}

export interface SceneData {
  order: number;
  imageUrl: string;
  audioUrl: string;
  words: WordTimestamp[];
}

export interface VideoCompositionProps {
  scenes: SceneData[];
  captionStyle: string; // matches CAPTION_STYLES id e.g. "style-1", "style-2"
  fps: number; // always 30
  backgroundMusicUrl: string; // public URL to looping bg music track
  totalDurationInFrames: number; // hard cap: series.duration * fps
}
