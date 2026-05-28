import { useRouteLoaderData } from "react-router";
import { SimuladorView } from "../views/SimuladorView";

export default function Simulador() {
  const rootData = useRouteLoaderData("root") as { user: any } | undefined;
  const userGoal = rootData?.user?.goal || "08:00";
  const userId = rootData?.user?.id || "guest";

  return <SimuladorView userGoal={userGoal} userId={userId} />;
}
