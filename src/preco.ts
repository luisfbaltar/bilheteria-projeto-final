// Preço no paradigma funcional: só funções puras, sem laço e sem mutação.
import type { Ingresso, Pessoa, TipoIngresso } from "./tipos.ts";

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

// Fábrica: guarda o preço base e devolve uma função que recebe o tipo do ingresso.
export const valorDoIngresso =
  (precoBase: number) =>
  (tipo: TipoIngresso): number =>
    tipo === "meia" ? arredondar(precoBase / 2) : precoBase;

// Fábrica: guarda o percentual e devolve uma função que soma a taxa a um valor.
export const aplicarTaxa =
  (percentual: number) =>
  (valor: number): number =>
    arredondar(valor * (1 + percentual));

// Um Ingresso por pessoa, na mesma ordem. Quem decide a meia é a função recebida.
export const montarIngressos = (
  precoBase: number,
  pessoas: readonly Pessoa[],
  temDireitoAMeia: (pessoa: Pessoa) => boolean,
): Ingresso[] =>
  pessoas.map((pessoa) => {
    const tipo: TipoIngresso = temDireitoAMeia(pessoa) ? "meia" : "inteira";
    return { nome: pessoa.nome, poltrona: pessoa.poltrona, tipo, valor: valorDoIngresso(precoBase)(tipo) };
  });

// Soma os valores e aplica a taxa de serviço de 10%.
export const calcularTotal = (ingressos: readonly Ingresso[]): number =>
  aplicarTaxa(0.1)(ingressos.reduce((soma, ingresso) => soma + ingresso.valor, 0));
