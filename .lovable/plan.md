# Sincronização da resolução da vaza (modo online)

## Objetivo

Garantir que a janela de visualização das cartas jogadas após cada vaza dure **sempre 2 segundos no frontend**, mesmo que o backend envie `resolving: false` antes disso. O timer local passa a ser a fonte de verdade para a duração da animação; o backend apenas dispara o início via `last_trick.resolved_at`.

## Comportamento garantido

| Cenário backend | Comportamento UI |
|---|---|
| Demora 3s para mandar `resolving:false` | UI bloqueada por 3s (segue o backend, sem corte) |
| Manda `resolving:false` em 200ms | **UI mantém as cartas visíveis até completar 2s locais** ✅ |
| Inicia próxima vaza | Novo `resolved_at` reinicia o ciclo de 2s |

## Arquivo afetado

Apenas `src/components/game/GameTableScreen.tsx`. Sem alterações em `websocket.ts`, `GameContext.tsx` ou `types.ts`.

## Mudanças

1. **Constante configurável** no topo do arquivo:
   ```ts
   const RESOLVE_MS = 2000;
   ```

2. **Estado local derivado** combinando backend + janela local:
   ```ts
   const resolvedAt = game.last_trick ? Date.parse(game.last_trick.resolved_at) : 0;
   const [now, setNow] = useState(Date.now());
   const elapsed = now - resolvedAt;
   const showingTrick = !!game.last_trick && elapsed < RESOLVE_MS;
   const resolving = game.resolving || showingTrick;
   ```

3. **Re-render no momento exato** que a janela local expira:
   ```ts
   useEffect(() => {
     if (!showingTrick) return;
     const remaining = RESOLVE_MS - elapsed;
     const id = setTimeout(() => setNow(Date.now()), remaining);
     return () => clearTimeout(id);
   }, [resolvedAt, showingTrick]);
   ```

4. **Cache das cartas exibidas** via `useRef`, como salvaguarda caso o backend limpe `table_cards` junto com `resolving:false`. Durante `showingTrick`, renderiza o último `table_cards` não-vazio em vez do array atual.

5. **`playCard` e overlay de vencedor** continuam usando o `resolving` local combinado, garantindo que:
   - O jogador não consiga jogar durante a janela visual.
   - O destaque `isWinner` na carta vencedora permaneça por 2s.

## Fora do escopo

- Modo Praticar (`PracticeGameScreen.tsx`) — já controla o delay localmente, não tem o problema.
- Lógica de WebSocket, contexto, tipos, animações de outros componentes.
