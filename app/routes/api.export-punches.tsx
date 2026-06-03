import { requireUserId, getUser } from "../services/session.server";
import { prisma } from "../services/prisma.server";
import { minutesToHHMM } from "../utils/time";
import writeXlsxFile from "write-excel-file/node";

export async function loader({ request }: { request: Request }) {
  const currentUserId = await requireUserId(request);
  const currentUser = await getUser(request);
  if (!currentUser) {
    throw new Response("Não autorizado", { status: 401 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get("month"); // Formato: YYYY-MM
  const targetUserId = url.searchParams.get("userId") || currentUserId;

  if (!month) {
    throw new Response("Mês não especificado", { status: 400 });
  }

  if (targetUserId === "todos") {
    throw new Response("Exportação consolidada desativada", { status: 400 });
  }

  // Validação de acesso para exportação de um usuário específico
  if (targetUserId !== currentUserId && currentUser.role !== "admin") {
    const isManager = (currentUser.userTeams || []).some(ut => ut.role === "manager");
    if (!isManager) {
      throw new Response("Acesso negado", { status: 403 });
    }
    const shareTeam = await prisma.userTeam.findFirst({
      where: {
        userId: currentUser.id,
        role: "manager",
        team: {
          userTeams: {
            some: { userId: targetUserId }
          }
        }
      }
    });
    if (!shareTeam) {
      throw new Response("Acesso negado", { status: 403 });
    }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId }
  });
  if (!targetUser) {
    throw new Response("Usuário não encontrado", { status: 404 });
  }

  const records = await prisma.punchRecord.findMany({
    where: {
      userId: targetUserId,
      date: {
        startsWith: month
      }
    },
    orderBy: { date: "asc" }
  });

  const headers = [
    { value: "Data", fontWeight: "bold" as const, align: "center" as const },
    { value: "Batidas", fontWeight: "bold" as const },
    { value: "Meta Diária", fontWeight: "bold" as const, align: "center" as const },
    { value: "Trabalhado", fontWeight: "bold" as const, align: "center" as const },
    { value: "Saldo", fontWeight: "bold" as const, align: "center" as const },
    { value: "Observação", fontWeight: "bold" as const }
  ];

  const rows = records.map(r => {
    const dateFormatted = r.date.split("-").reverse().join("/");
    const formattedPunches = formatPunches(r.punches);
    const goalHHMM = minutesToHHMM(r.goalMins);
    const workedHHMM = minutesToHHMM(r.workMins);
    const sign = r.diffMins >= 0 ? "+" : "-";
    const diffHHMM = sign + minutesToHHMM(Math.abs(r.diffMins));
    const obs = r.observation || "";
    return [
      { value: dateFormatted, align: "center" as const },
      { value: formattedPunches },
      { value: goalHHMM, align: "center" as const },
      { value: workedHHMM, align: "center" as const },
      { value: diffHHMM, align: "center" as const },
      { value: obs }
    ];
  });

  const columns = [
    { width: 12 },
    { width: 35 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 40 }
  ];

  const buf = await writeXlsxFile([headers, ...rows], {
    columns,
    // Em alguns runtimes Node/Bun precisamos de buffer para obter ArrayBuffer/Buffer
    // toBuffer() retorna uma Promise de Buffer
  }).toBuffer();

  const [year, monthNum] = month.split("-");
  const dateSuffix = `${monthNum}-${year}`;
  const filename = `${targetUser.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}-${dateSuffix}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

function formatPunches(punchesJson: string): string {
  try {
    const list: string[] = JSON.parse(punchesJson);
    const pairs: string[] = [];
    for (let i = 0; i < list.length; i += 2) {
      const entrada = list[i] || "--:--";
      const saida = list[i + 1] || "--:--";
      pairs.push(`${entrada} -> ${saida}`);
    }
    return pairs.join(" / ");
  } catch {
    return "";
  }
}
