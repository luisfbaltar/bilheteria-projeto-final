import type { Pessoa } from "./tipos.ts";

// Meia-entrada: estudante, PcD ou quem tem 60 anos ou mais.
export function direitoAMeia(pessoa: Pessoa): boolean {
  return pessoa.estudante || pessoa.pcd || pessoa.idade >= 60;
}
