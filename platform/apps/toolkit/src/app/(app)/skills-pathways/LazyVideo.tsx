"use client";

import { useState } from "react";
import { videoEmbedUrl, videoPoster, type VideoRef } from "@/lib/skills-pathways/pathways";

// A click-to-play video. Nothing loads until the student clicks, so a page (or
// modal) with many tutorials stays fast and doesn't phone home to YouTube/Vimeo
// on load. YouTube/Vimeo render as a (nocookie) iframe; an uploaded file renders
// as a native <video>.
export default function LazyVideo({ video }: { video: VideoRef }) {
  const [playing, setPlaying] = useState(false);
  const poster = videoPoster(video);

  return (
    <figure className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900">
      <div className="relative aspect-video w-full">
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play: ${video.title}`}
            className="group absolute inset-0 flex items-center justify-center"
          >
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900" />
            )}
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg transition group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-[#ff3b21]">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        ) : video.kind === "file" ? (
          <video
            src={videoEmbedUrl(video)}
            controls
            autoPlay
            className="absolute inset-0 h-full w-full bg-black"
          />
        ) : (
          <iframe
            src={videoEmbedUrl(video)}
            title={video.title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-3 bg-white px-3 py-2 text-xs">
        <span className="truncate font-medium text-neutral-800" title={video.title}>
          {video.title}
        </span>
        <span className="shrink-0 text-neutral-400">
          {video.author}
          {video.minutes ? ` · ${video.minutes} min` : ""}
        </span>
      </figcaption>
    </figure>
  );
}
