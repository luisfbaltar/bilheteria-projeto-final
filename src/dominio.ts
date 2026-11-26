// Evento e erros no paradigma orientado a objetos.
import type { EventoInfo } from "./tipos.ts";

// Cada erro carrega o status HTTP que o servidor deve responder.
export abstract class ErroDeNegocio extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = new.target.name;
    this.status = status;
  }
}

export class DadosInvalidosErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 400);
  }
}

export class NaoEncontradoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 404);
  }
}

export class PoltronaOcupadaErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 409);
  }
}

export class PagamentoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 502);
  }
}

export class Evento {
  readonly id: number;
  readonly nome: string;
  readonly preco: number;
  readonly capacidade: number;
  // Privado: só os métodos da classe mexem nas poltronas vendidas.
  #vendidas: number[] = [];

  constructor(id: number, nome: string, preco: number, capacidade: number) {
    this.id = id;
    this.nome = nome;
    this.preco = preco;
    this.capacidade = capacidade;
  }

  get disponivel(): number {
    return this.capacidade - this.#vendidas.length;
  }

  // Tudo ou nada: confere todas as poltronas antes de marcar qualquer uma.
  reservar(poltronas: number[]): void {
    if (!Array.isArray(poltronas) || poltronas.length === 0) {
      throw new DadosInvalidosErro("o pedido precisa de pelo menos uma poltrona");
    }
    for (const poltrona of poltronas) {
      if (!Number.isInteger(poltrona) || poltrona < 1 || poltrona > this.capacidade) {
        throw new DadosInvalidosErro(`a poltrona ${poltrona} não existe neste evento`);
      }
    }
    if (new Set(poltronas).size !== poltronas.length) {
      throw new DadosInvalidosErro("a mesma poltrona aparece duas vezes no pedido");
    }
    const ocupada = poltronas.find((poltrona) => this.#vendidas.includes(poltrona));
    if (ocupada !== undefined) {
      throw new PoltronaOcupadaErro(`a poltrona ${ocupada} já foi vendida`);
    }
    this.#vendidas.push(...poltronas);
  }

  // Devolve as poltronas para a venda.
  liberar(poltronas: number[]): void {
    const naoVendida = poltronas.find((poltrona) => !this.#vendidas.includes(poltrona));
    if (naoVendida !== undefined) {
      throw new DadosInvalidosErro(`a poltrona ${naoVendida} não estava vendida`);
    }
    this.#vendidas = this.#vendidas.filter((poltrona) => !poltronas.includes(poltrona));
  }

  info(): EventoInfo {
    return {
      id: this.id,
      nome: this.nome,
      preco: this.preco,
      capacidade: this.capacidade,
      disponivel: this.disponivel,
    };
  }
}
