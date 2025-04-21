"use client";

import { useEffect, useRef } from "react";

const VideoBackground = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        const overlay = overlayRef.current;

        if (!video || !overlay) return;

        const fadeOutTime = 3; // Tempo de fade antes do final
        let threshold = video.duration ? video.duration - fadeOutTime : 0;

        const handleLoadedMetadata = () => {
            threshold = video.duration - fadeOutTime;
        };

        const handleVideoTimeUpdate = () => {
            if (video.currentTime >= threshold) {
                video.classList.add("fade-out");
                overlay.classList.add("fade-overlay");
            } else {
                video.classList.remove("fade-out");
                overlay.classList.remove("fade-overlay");
            }
        };

        const handleVideoEnded = () => {
            video.classList.remove("fade-out");
            overlay.classList.remove("fade-overlay");

            video.currentTime = 0;
            video.play();
        };

        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("timeupdate", handleVideoTimeUpdate);
        video.addEventListener("ended", handleVideoEnded);

        return () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("timeupdate", handleVideoTimeUpdate);
            video.removeEventListener("ended", handleVideoEnded);
        };
    }, []);

    return (
        <div className="video-container">
            <video ref={videoRef} muted playsInline autoPlay>
                <source src="/particles-blue.mp4" type="video/mp4" />
                Seu navegador não suporta o vídeo.
            </video>
            <div ref={overlayRef} className="color-overlay"></div>
        </div>
    );
};

export default VideoBackground;
