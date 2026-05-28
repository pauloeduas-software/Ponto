import { useLoaderData } from "react-router";
import { getHomeData, saveHomePunchRecord } from "../services/homeService.server";
import { HomeView } from "../views/HomeView";

export async function loader({ request }: { request: Request }) {
  return getHomeData(request);
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  await saveHomePunchRecord(request, formData);
  return { success: true };
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  return <HomeView {...data} />;
}
