# Sincronização da resolução da vaza (modo online) — Jitter Buffer

## Contexto do backend

O backend já controla o tempo de resolução: envia `resolving:true` com a mesa cheia, dorme 2s, e envia `resolving:false` com a mesa limpa. O frontend NÃO deve adicionar 2s extras — só atua como jitter buffer caso os dois snapshots cheguem quase juntos por instabilidade da rede.

## Comportamento garantido

| Cenário | Comportamento UI |
|---|---|
| Backend perfeito (2s entre pacotes) | UI segue exatamente o backend, sem espera extra |
| Pacotes colapsam (resolving:false chega <2s após resolving:true) | Snapshot final é bufferizado e aplicado quando o cronômetro local de 2s expira |
| `resolving:false` chega ≥2s depois | Aplicação imediata |

## Implementação (`GameTableScreen.tsx`)

- `displayedGame` (state local): snapshot atualmente renderizado.
- `pendingGameRef`: snapshot bufferizado durante a janela.
- `resolveEndsAtRef`: timestamp do fim da janela local (0 = inativa).
- `flushTimerRef`: `setTimeout` que aplica o snapshot pendente quando a janela termina.

Transições no `useEffect([game])`:
1. `resolving:true` (novo) → aplica imediatamente, abre janela de 2s, agenda flush.
2. `resolving:true` (continuação) → aplica.
3. `resolving:false` durante janela ativa → bufferiza.
4. `resolving:false` sem janela → aplica imediatamente (flush + set).

Toda a UI (turno, mão, mesa, score, overlay) lê de `view = displayedGame ?? game`, garantindo consistência entre carta vencedora destacada, bloqueio de jogada e clear da mesa.
