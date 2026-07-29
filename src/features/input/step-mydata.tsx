import type { Mydata } from "@/lib/contracts/persona";
import { MydataPanel } from "@/features/mydata/mydata-panel";

export function StepMydata({
  personaId,
  mydata,
}: {
  personaId: string;
  mydata: Mydata;
}) {
  return <MydataPanel personaId={personaId} mydata={mydata} />;
}
