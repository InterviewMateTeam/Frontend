export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);

    audio.preload = "metadata";
    audio.src = objectUrl;

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);

      const duration = Math.round(audio.duration);

      if (Number.isFinite(duration) && duration > 0) {
        resolve(duration);
      } else {
        resolve(1);
      }
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(1);
    };
  });
};