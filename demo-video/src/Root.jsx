import { Composition } from "remotion";
import { ArgosDemo } from "./ArgosDemo";
import { ReactiveSentryClip } from "./clips/ReactiveSentryClip";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ArgosDemo"
        component={ArgosDemo}
        durationInFrames={1140}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="TriggerEvent"
        component={ReactiveSentryClip}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
