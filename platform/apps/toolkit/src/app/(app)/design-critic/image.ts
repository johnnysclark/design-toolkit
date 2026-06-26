// The Critic reuses the Librarian's client-side image prep verbatim (downscale /
// transcode before upload). Keep it as a single source of truth — do not fork.
export { prepareImage } from "../librarian/image";
