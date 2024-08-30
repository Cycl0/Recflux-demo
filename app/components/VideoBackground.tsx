const VideoBackground = () => {

        return (
        <div className="video-background brightness-200 rotate-180">
            <video
                muted
                playsInline
                loop
                autoPlay
            >
                <source src="/particles-blue.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

export default VideoBackground;
