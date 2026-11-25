// Preço no paradigma funcional: só funções puras, sem laço e sem mutação.
import type { TipoIngresso } from "./tipos.ts";

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
