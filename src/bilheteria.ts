// A venda: é aqui que a concorrência aparece.
import { DadosInvalidosErro, NaoEncontradoErro, PagamentoErro } from "./dominio.ts";
import { calcularTotal, montarIngressos } from "./preco.ts";
import { direitoAMeia } from "./regras.ts";
import type { Comprovante, ConfigBilheteria, EventoInfo, Pedido } from "./tipos.ts";

export interface Bilheteria {
  listarEventos(): EventoInfo[];
  reservar(pedido: Pedido): Promise<Comprovante>;
}

// Rejeita se a promessa não terminar dentro de `ms`. Assim uma operadora travada
// não segura as poltronas para sempre.
function comLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error("a operadora demorou demais")), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

// Confere o formato do pedido antes de mexer em qualquer evento ou cobrar alguém.
function validarPedido(pedido: Pedido): void {
  if (typeof pedido !== "object" || pedido === null) {
    throw new DadosInvalidosErro("o pedido precisa ser um objeto");
  }
  if (!Array.isArray(pedido.ingressos) || pedido.ingressos.length === 0) {
    throw new DadosInvalidosErro("o pedido precisa de pelo menos um ingresso");
  }
  const invalido = pedido.ingressos.find(
    (p) =>
      typeof p !== "object" ||
      p === null ||
      typeof p.nome !== "string" ||
      typeof p.idade !== "number" ||
      typeof p.estudante !== "boolean" ||
      typeof p.pcd !== "boolean",
  );
  if (invalido !== undefined) {
    throw new DadosInvalidosErro("cada ingresso precisa de nome, idade, estudante e pcd");
  }
}

export function criarBilheteria({ eventos, pagar, limitePagamentoMs }: ConfigBilheteria): Bilheteria {
  let proximoId = 1;

  return {
    listarEventos: () => eventos.map((evento) => evento.info()),

    async reservar(pedido: Pedido): Promise<Comprovante> {
      validarPedido(pedido);

      const evento = eventos.find((e) => e.id === pedido.eventoId);
      if (!evento) {
        throw new NaoEncontradoErro(`o evento ${pedido.eventoId} não existe`);
      }

      // PONTO-CHAVE DA CONCORRÊNCIA: as poltronas são marcadas ANTES do primeiro await.
      // Como o Node roda o JavaScript numa linha só, nada interrompe este trecho síncrono:
      // dois pedidos para a mesma poltrona nunca passam juntos pela verificação.
      // O await perigoso seria cobrar primeiro e só marcar depois: durante os 80 ms da
      // operadora, outro pedido veria a poltrona livre e também seria vendido.
      const poltronas = pedido.ingressos.map((pessoa) => pessoa.poltrona);
      evento.reservar(poltronas);

      const ingressos = montarIngressos(evento.preco, pedido.ingressos, direitoAMeia);
      const total = calcularTotal(ingressos);

      try {
        await comLimite(pagar(total), limitePagamentoMs);
      } catch {
        // Pagamento recusado ou demorado: devolve as poltronas para a venda.
        evento.liberar(poltronas);
        throw new PagamentoErro("o pagamento não foi aprovado; nenhuma poltrona foi cobrada");
      }

      return { reservaId: proximoId++, eventoId: evento.id, ingressos, total };
    },
  };
}
