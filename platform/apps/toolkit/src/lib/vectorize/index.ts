// Vectorize engine — public surface. Pure functions on typed arrays; no DOM.
export * from "./types";
export { integral, boxSum } from "./integral";
export { toGray, otsu, binarize, adaptiveBinarize, despeckle } from "./binarize";
export { blurChannel, blurRGBA } from "./blur";
export { dilate, erode, morph } from "./morph";
export { rdp, rdpClosed, polylineLength, polygonArea } from "./simplify";
export { fitPath, flattenCmds } from "./fit";
export { traceLoops } from "./outline";
export { thinZhangSuen, skeletonPaths } from "./centreline";
export { quantize, rgbToHex } from "./color";
export { cmdsToD, layerToPath, toSVG } from "./svg";
export { toDXF } from "./dxf";
export { trace } from "./trace";
