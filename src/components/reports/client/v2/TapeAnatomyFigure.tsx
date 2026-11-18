import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { layoutTapeLabels, TAPE_FIGURE_ASPECT, type TapeFigureGender } from '@/lib/reports/tapeAnatomy';
import { TapeAnatomyCallout } from './TapeAnatomyCallout';
import { TapeFigureBody } from './TapeFigureBody';

const FIGURE_HEIGHT = 312;

interface TapeAnatomyFigureProps {
  readings: ClientReportProgressionRow[];
  gender: TapeFigureGender;
}

export function TapeAnatomyFigure({ readings, gender }: TapeAnatomyFigureProps) {
  const figureHeight = readings.some(row => row.measuredChange) ? 420 : FIGURE_HEIGHT;
  const byName = new Map(readings.map((reading) => [reading.name, reading]));
  const placed = layoutTapeLabels(
    readings.map((reading) => reading.name),
    gender,
  ).flatMap((callout) => {
    const reading = byName.get(callout.name);
    return reading ? [{ callout, reading }] : [];
  });

  const figureWidth = Math.round(figureHeight * TAPE_FIGURE_ASPECT[gender]);

  return (
    <div className="relative mx-auto w-full max-w-xl" style={{ height: figureHeight }}>
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2" style={{ width: figureWidth }}>
        <TapeFigureBody gender={gender} width={figureWidth} height={figureHeight} />
      </div>
      {placed.map(({ reading, callout }) => (
        <TapeAnatomyCallout
          key={reading.name}
          callout={callout}
          value={reading.current}
          unit={reading.unit}
          measuredChange={reading.measuredChange}
          figureHalf={figureWidth / 2}
        />
      ))}
    </div>
  );
}
