import femaleFigure from '@/assets/reports/tape-silhouette-female.png';
import maleFigure from '@/assets/reports/tape-silhouette-male.png';
import type { TapeFigureGender } from '@/lib/reports/tapeAnatomy';

const FIGURE_SRC: Record<TapeFigureGender, string> = {
  male: maleFigure,
  female: femaleFigure,
};

interface TapeFigureBodyProps {
  gender: TapeFigureGender;
  width: number;
  height: number;
}

export function TapeFigureBody({ gender, width, height }: TapeFigureBodyProps) {
  return (
    <div
      aria-hidden
      className="bg-foreground"
      style={{
        width,
        height,
        WebkitMaskImage: `url(${FIGURE_SRC[gender]})`,
        maskImage: `url(${FIGURE_SRC[gender]})`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}
