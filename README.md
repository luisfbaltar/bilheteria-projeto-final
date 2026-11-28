# Bilheteria concorrente

Projeto final de Paradigmas de Linguagens de Programação. Enunciado completo no Blackboard.

Os arquivos de `src/` que vocês escrevem já existem, vazios; o `tipos.ts` e o `servidor.ts` vêm prontos. O que vai em cada um está no passo
indicado do enunciado:

| Arquivo | Passo do enunciado |
| :--- | :--- |
| `src/tipos.ts` (pronto) | 1: os tipos |
| `src/regras.ts` | 2: meia-entrada |
| `src/preco.ts` | 3: preço (funcional) |
| `src/dominio.ts` | 4: evento e erros (orientado a objetos) |
| `src/bilheteria.ts` | 5: a venda, onde a concorrência aparece |
| `src/servidor.ts` (pronto) e `src/main.ts` | 6: ligar o servidor |

Não alterem `src/pagamento.ts`, `src/servidor.ts`, `src/bench.ts` nem `testes/`: a correção usa os originais.

Para começar, sigam o `GUIA.md`. Depois dele, os comandos são:

```bash
npm install
npm test          # correção automática: mostra os pontos
npm start         # serviço em http://localhost:3000
npm run bench     # com o serviço no ar: 200 pedidos simultâneos no evento 1, dois por poltrona
```

Exemplo de pedido:

```bash
curl -X POST localhost:3000/reservas -H 'Content-Type: application/json' \
  -d '{"eventoId":1,"ingressos":[{"nome":"Ana","idade":20,"estudante":true,"pcd":false,"poltrona":7}]}'
```

---

## Preencham (avaliado no vídeo)

**Link do vídeo:** 

https://youtu.be/T5x_dE2EpcA

### Integrantes

| Nome | Usuário do GitHub | Parte principal |
| :--- | :--- | :--- |
| LUIS FERNANDO BALTAR | luisfbaltar | regras.ts e preco.ts; perguntas 3 e 4 |
| JOÃO PEDRO BALTAR | jpedrobaltar | dominio.ts e main.ts; pergunta 2 |
| HENRIQUE DELMAS | hdelmass | bilheteria.ts (concorrência); perguntas 1 e 5 |

### Decisões

1. **Concorrência.** Como vocês garantem que duas pessoas não ficam com a mesma poltrona? Onde estava o
   `await` perigoso?     **Resposta:**
    No `bilheteria.ts`, o `reservar` marca as poltronas no evento (`evento.reservar`) **antes** do primeiro `await`. O Node roda o JavaScript numa linha só, e um trecho síncrono nunca é interrompido: entre conferir se a poltrona está livre e marcá-la, nenhum outro pedido consegue rodar. Quando o segundo pedido chega, a poltrona já aparece vendida e ele recebe `PoltronaOcupadaErro` (409).
   O `await` perigoso é o da operadora de pagamento (`await pagar(total)`). Se o código cobrasse primeiro e só marcasse a poltrona depois, durante os ~80 ms da cobrança outros pedidos veriam a mesma poltrona livre, e várias pessoas pagariam por ela. Por isso a ordem é: validar → marcar → cobrar. Se o pagamento falhar ou passar do `limitePagamentoMs` (com `Promise.race`), o `evento.liberar` devolve as poltronas e o pedido recebe `PagamentoErro` (502).
3. **OO.** O que o `Evento` esconde e por quê? Por que o `reservar` é tudo ou nada? Por que os erros são uma hierarquia de classes?
   **Resposta:**
    O `Evento` esconde a lista de poltronas vendidas num campo privado (`#vendidas`). Quem está fora da classe só lê quantas poltronas restam, pelo `get disponivel`, e só muda a lista pelos métodos `reservar` e `liberar`, que conferem tudo antes. Assim ninguém consegue marcar uma poltrona sem passar pelas regras, nem "liberar" o evento inteiro por engano: tentar `evento.disponivel = 999` não muda nada.
   O `reservar` é tudo ou nada porque uma família compra junta: se uma das poltronas do pedido já foi vendida, não faz sentido vender só as outras. Por isso ele confere todas as poltronas primeiro (se existem, se não se repetem, se estão livres) e só depois marca. Se der erro no meio, nenhuma fica presa.
   Os erros são uma hierarquia porque todos são erros de negócio, mas cada um representa uma situação diferente e carrega o próprio `status` HTTP. O servidor só precisa saber que recebeu um `ErroDeNegocio` e responder com `erro.status`, sem um `if` para cada tipo de erro. Um erro novo é só mais uma classe filha.
5. **Funcional.** O que ganhamos com `preco.ts` puro? Como vocês testariam ele sem subir o servidor?

   **Resposta:** As funções do `preco.ts` são puras: o resultado depende só do que elas recebem, e elas não mudam nada fora delas (nem a lista de pessoas, nem os ingressos). Por isso o mesmo pedido sempre dá o mesmo preço, não importa quantos pedidos estejam sendo atendidos ao mesmo tempo, e o cálculo nunca interfere na concorrência da bilheteria. As fábricas (`valorDoIngresso` e `aplicarTaxa`) guardam o preço base e o percentual dentro da função que devolvem, então dá para reaproveitar a mesma regra sem repetir parâmetros. E o `montarIngressos` recebe a regra da meia como função, o que permite trocar a regra sem mexer no cálculo.

   Para testar, basta importar as funções e comparar o resultado com o valor esperado, sem servidor, sem banco e sem operadora de pagamento. Por exemplo: `valorDoIngresso(80)("meia")` tem que dar `40`, `aplicarTaxa(0.1)(100)` tem que dar `110` e `calcularTotal` de ingressos de 50 e 100 tem que dar `165`. É o que os testes do `npm test` fazem.

6. **Se fosse em outro paradigma.** Escolham uma das partes e expliquem como ficaria em outro
   paradigma, e se ficaria melhor ou pior.

   **Resposta:** Escolhemos o `preco.ts` no paradigma imperativo. O `calcularTotal` viraria um `for` com um `let total = 0` somando cada valor, e o `montarIngressos` criaria uma lista vazia e faria `push` de cada ingresso. Funciona e é fácil de ler para quem está começando, mas ficaria pior: cada função passa a ter variáveis que mudam ao longo do laço, o que abre espaço para erros (esquecer de zerar o total, alterar a lista recebida por engano) e torna o código mais difícil de testar e de reaproveitar. Também perderíamos as fábricas de funções, e a regra da meia e a taxa voltariam a ser parâmetros repetidos em todo lugar. Para um cálculo sem estado como o preço, o funcional encaixa melhor.

7. **Concorrente × paralelo.** O Node roda o JavaScript numa linha só: os pedidos de vocês são
   concorrentes, não paralelos. O que mudaria se a venda rodasse em vários núcleos ao mesmo tempo?     **Resposta:** Hoje a garantia vem de o trecho "conferir e marcar" ser síncrono numa linha só. Em vários núcleos ao mesmo tempo, duas linhas poderiam executar esse trecho no mesmo instante: as duas leem a poltrona livre e as duas marcam, e a poltrona seria vendida duas vezes. Ia ser preciso uma proteção explícita: uma trava (mutex/`Atomics` com memória compartilhada), uma operação atômica ou, o mais comum, deixar o banco de dados decidir (transação ou restrição `UNIQUE` em evento+poltrona). Além disso, cada núcleo teria a própria memória, então a lista `#vendidas` de um não seria vista pelo outro: o estado teria que sair do objeto e ir para um lugar compartilhado. Em troca, o paralelismo daria mais vazão em cálculo pesado, mas aqui o tempo é quase todo espera da operadora, que a concorrência do Node já sobrepõe.

### Resultados do bench

| Cenário | Pedidos | Tempo (ms) | Vendidos | Poltrona ocupada | Falha de pagamento |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Padrão (`main.ts`) | 200 | 593 | 97 | 91 | 12 |

O bench ocupa as poltronas do evento 1: para rodar de novo, parem o `npm start` (Ctrl+C) e subam outra
vez.

O que os números mostram:

Os 200 pedidos (dois para cada uma das 100 poltronas) terminaram em 593 ms, bem menos que os 16 s (200 × 80 ms) que levariam se fossem atendidos um por vez: enquanto um pedido espera a operadora no `await`, o Node atende os outros. Nenhuma poltrona foi vendida duas vezes: 97 vendidas + 3 livres = 100. Os 91 recusados com 409 chegaram numa poltrona que já estava marcada. As 12 falhas de pagamento (502) vêm da operadora falsa, que falha 10% das vezes. Nesses casos a poltrona foi devolvida, e por isso o 409 não deu 100: em 9 delas o segundo pedido chegou depois da devolução e conseguiu comprar, e as outras 3 ficaram livres.
