// Types
export type {
  PostureView,
  OverlayOptions,
  LandmarkData,
  WireframeOptions,
  WireframeOnlyOptions,
  FrontBackAlignments,
  SideViewAlignments,
} from './types';

export {
  ALIGNMENT_COLORS,
  FRONT_VIEW_CONNECTIONS,
  FRONT_VIEW_LANDMARKS,
  BACK_VIEW_CONNECTIONS,
  BACK_VIEW_LANDMARKS,
  SIDE_LEFT_CONNECTIONS,
  SIDE_LEFT_LANDMARKS,
  SIDE_RIGHT_CONNECTIONS,
  SIDE_RIGHT_LANDMARKS,
  DEBUG_POSE_CONNECTIONS,
} from './types';

// Canvas operations
export {
  addPostureOverlay,
  addDeviationOverlay,
  generatePlaceholderWithGreenLines,
  cropAndCenterImage,
} from './postureOverlayCanvas';

export { composeClientPosturePreview } from './composeClientPosturePreview';
export { buildOverlaySkeleton, overlayFromNormalizedLandmarks } from './overlaySkeleton';
export type { OverlaySkeleton, OverlayPt } from './overlaySkeleton';

// Alignment calculations
export { calculateFrontBackAlignments } from './postureAlignmentFront';
export { calculateSideViewAlignments } from './postureAlignmentSide';

// Wireframe rendering
export {
  drawLandmarkWireframe,
  generateWireframeOnly,
} from './postureWireframeRenderer';

// Deviation rendering
export { drawDeviations } from './postureDeviationRenderer';
export { postureDeviationMarks } from './postureDeviationMarks';
export { enrichPostureAnalysisFromOverlay, overlaySideCues } from './overlayCues';

// Drawing utilities
export {
  getSeverityColor,
  getSeverityPointColor,
  drawControlLine,
  drawAlignmentLine,
  drawLandmarkPoint,
} from './drawingUtils';
