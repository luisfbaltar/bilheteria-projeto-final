// A venda: é aqui que a concorrência aparece.
import { NaoEncontradoErro, DadosInvalidosErro, PagamentoErro } from "./dominio.ts";
import type { Evento } from "./dominio.ts";
import type { Pagamento } from "./pagamento.ts";
import { calcularTotal, montarIngressos } from "./preco.ts";
import { direitoAMeia } from "./regras.ts";
import type { Comprovante, ConfigBilheteria, EventoInfo, Pedido } from "./tipos.ts";

// Tempo limite: o Promise.race devolve o resultado de quem terminar primeiro,
// a cobrança ou o relógio, que rejeita depois de ms milissegundos.
function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error("tempo esgotado")), ms);
  });
  // O finally desliga o relógio quando a cobrança termina antes.
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

export class Bilheteria {
  // Campos privados: ninguém de fora consegue trocar os eventos, a operadora,
  // o tempo limite nem o contador de reservas.
  #eventos: Evento[];
  #pagar: Pagamento;
  #limitePagamentoMs: number;
  #proximoReservaId = 1;

  constructor(config: ConfigBilheteria) {
    this.#eventos = config.eventos;
    this.#pagar = config.pagar;
    this.#limitePagamentoMs = config.limitePagamentoMs;
  }

  listarEventos(): EventoInfo[] {
    return this.#eventos.map((evento) => evento.info());
  }

  async reservar(pedido: Pedido): Promise<Comprovante> {
    // 1. Confere o pedido e procura o evento.
    if (!pedido || !Array.isArray(pedido.ingressos) || pedido.ingressos.length === 0) {
      throw new DadosInvalidosErro("o pedido precisa de pelo menos um ingresso");
    }
    const evento = this.#eventos.find((e) => e.id === pedido.eventoId);
    if (!evento) {
      throw new NaoEncontradoErro(`o evento ${pedido.eventoId} não existe`);
    }

    // 2. Marca as poltronas ANTES do await do pagamento.
    // Até o await, o código roda sem ser interrompido: nenhum outro pedido entra no meio.
    // Quando o próximo pedido chegar, a poltrona já aparece como vendida.
    const poltronas = pedido.ingressos.map((pessoa) => pessoa.poltrona);
    evento.reservar(poltronas);

    // 3. Monta os ingressos e o total (funções puras do preco.ts).
    const ingressos = montarIngressos(evento.preco, pedido.ingressos, direitoAMeia);
    const total = calcularTotal(ingressos);

    // 4. Cobra na operadora, com tempo limite.
    // Enquanto este pedido espera aqui, o Node atende os outros pedidos.
    try {
      await comTempoLimite(this.#pagar(total), this.#limitePagamentoMs);
    } catch {
      // Pagamento recusado ou demorou demais: devolve as poltronas para a venda.
      evento.liberar(poltronas);
      throw new PagamentoErro("o pagamento não foi aprovado");
    }

    // 5. Devolve o comprovante com um reservaId novo.
    const reservaId = this.#proximoReservaId;
    this.#proximoReservaId += 1;
    return { reservaId, eventoId: evento.id, ingressos, total };
  }
}

export function criarBilheteria(config: ConfigBilheteria): Bilheteria {
  return new Bilheteria(config);
}
