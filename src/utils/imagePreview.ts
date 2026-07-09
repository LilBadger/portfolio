type ImagePresentation = {
  src: string;
  width?: number;
  height?: number;
};

const previews: Record<string, ImagePresentation> = {
  'assets/projects/fugi-visualizer/f1r-character-building-face.png': {
    src: 'assets/projects/fugi-visualizer/f1r-character-building-face.preview.webp', width: 1254, height: 1254
  },
  'assets/projects/fugi-visualizer/f1r-character-glitch.png': {
    src: 'assets/projects/fugi-visualizer/f1r-character-glitch.preview.webp', width: 1254, height: 1254
  },
  'assets/projects/fugi-visualizer/f1r-character-real.png': {
    src: 'assets/projects/fugi-visualizer/f1r-character-real.preview.webp', width: 1600, height: 900
  },
  'assets/projects/fugi-visualizer/f1r-highres-illustration-study-v003.png': {
    src: 'assets/projects/fugi-visualizer/f1r-highres-illustration-study-v003.preview.webp', width: 1600, height: 900
  },
  'assets/projects/fugi-visualizer/f1r-highres-illustration-study-v004.png': {
    src: 'assets/projects/fugi-visualizer/f1r-highres-illustration-study-v004.preview.webp', width: 1600, height: 900
  },
  'assets/projects/fugi-visualizer/fugi-visualizer-03-glitch.png': {
    src: 'assets/projects/fugi-visualizer/fugi-visualizer-03-glitch.preview.webp', width: 1582, height: 804
  },
  'assets/projects/fugi-visualizer/reference-tongue-in.png': {
    src: 'assets/projects/fugi-visualizer/reference-tongue-in.preview.webp', width: 1254, height: 1254
  }
};

export function imagePresentation(path: string): ImagePresentation {
  return previews[path] ?? { src: path };
}
