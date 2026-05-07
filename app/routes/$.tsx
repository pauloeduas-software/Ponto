// Rota curinga: captura qualquer URL não mapeada e retorna 404
export async function loader() {
  throw new Response("Página não encontrada", { status: 404 });
}
