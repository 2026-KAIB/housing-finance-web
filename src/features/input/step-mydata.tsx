import type { Mydata } from "@/lib/contracts/persona";
import { MydataPanel } from "@/features/mydata/mydata-panel";

export function StepMydata({
  personaId,
  mydata,
  loaded,
  onLoad,
}: {
  personaId: string;
  mydata: Mydata;
  loaded: boolean;
  onLoad: () => void;
}) {
  return (
    <MydataPanel
      personaId={personaId}
      mydata={mydata}
      loaded={loaded}
      onLoad={onLoad}
    />
  );
}
