// Evento e erros no paradigma orientado a objetos.
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
