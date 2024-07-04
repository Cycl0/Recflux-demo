const VideoBackground = () => {

        return (
          <div className="video-background brightness-200">
            <video
              muted
              playsInline
              loop
              autoPlay
            >
              <source src="/particles_blue.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
    </div>
  );
};

export default VideoBackground;