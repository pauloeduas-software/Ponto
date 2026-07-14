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

  let maxPunches = 0;
  const parsedRecords = records.map(r => {
    let punches: string[] = [];
    try {
      punches = JSON.parse(r.punches);
    } catch {
      // ignore
    }
    if (punches.length > maxPunches) maxPunches = punches.length;
    return { ...r, parsedPunches: punches };
  });

  if (maxPunches % 2 !== 0) maxPunches += 1;
  if (maxPunches === 0) maxPunches = 2; // Default to at least 1 pair (Entrada/Saída)

  const headers: any[] = [
    { value: "Data", fontWeight: "bold" as const, align: "center" as const },
  ];
  
  const columns: any[] = [
    { width: 15 },
  ];

  for (let i = 0; i < maxPunches; i++) {
    const isEntrada = i % 2 === 0;
    const number = Math.floor(i / 2) + 1;
    headers.push({
      value: isEntrada ? `Entrada ${number}` : `Saída ${number}`,
      fontWeight: "bold" as const, align: "center" as const
    });
    columns.push({ width: 12 });
  }

  headers.push(
    { value: "Meta Diária", fontWeight: "bold" as const, align: "center" as const },
    { value: "Trabalhado", fontWeight: "bold" as const, align: "center" as const },
    { value: "Saldo", fontWeight: "bold" as const, align: "center" as const },
    { value: "Observação", fontWeight: "bold" as const }
  );
  
  columns.push(
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 40 }
  );

  const rows = parsedRecords.map(r => {
    const dateFormatted = r.date.split("-").reverse().join("/");
    const goalHHMM = minutesToHHMM(r.goalMins);
    const workedHHMM = minutesToHHMM(r.workMins);
    const sign = r.diffMins >= 0 ? "+" : "-";
    const diffHHMM = sign + minutesToHHMM(Math.abs(r.diffMins));
    const obs = r.observation || "";

    const row: any[] = [
      { type: String, value: dateFormatted, format: "@", align: "center" as const },
    ];

    for (let i = 0; i < maxPunches; i++) {
      const punchVal = r.parsedPunches[i];
      if (punchVal && punchVal !== "--:--") {
        row.push({
          type: String,
          value: punchVal,
          format: "@",
          align: "center" as const
        });
      } else {
        row.push({
          type: String,
          value: "--:--",
          format: "@",
          align: "center" as const
        });
      }
    }

    row.push(
      { type: String, value: goalHHMM, format: "@", align: "center" as const },
      { type: String, value: workedHHMM, format: "@", align: "center" as const },
      { type: String, value: diffHHMM, format: "@", align: "center" as const },
      { type: String, value: obs, format: "@" }
    );
    return row;
  });

  const buf = await writeXlsxFile([headers, ...rows], {
    columns,
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
