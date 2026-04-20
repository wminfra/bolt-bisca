import React, { useState, useContext } from "react";
import { login, register } from "@/lib/api";
import { useGame } from "@/contexts/GameContext";
import { showToast } from "@/components/game/ToastManager";
import { PracticeCtx } from "@/contexts/PracticeContext";

export default function LoginScreen() {
  const { handleLogin } = useGame();
  const practice = useContext(PracticeCtx);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const fn = isRegister ? register : login;
      const res = await fn({ nickname: nickname.trim(), password });
      handleLogin(res.token, res.session);
      showToast("success", `Bem-vindo, ${res.session.user.nickname}!`);
    } catch (err: any) {
      showToast("error", err.message || "Erro ao conectar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen min-h-screen flex items-center justify-center felt-bg p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-primary tracking-wide">
            Bisca RS
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Baralho Espanhol • Jogo Gaúcho
          </p>
        </div>

        <form onSubmit={submit} className="bg-card rounded-lg p-6 space-y-4 border border-border">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Apelido</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-secondary text-secondary-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Seu apelido"
              minLength={2}
              maxLength={24}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-secondary text-secondary-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Sua senha"
              minLength={3}
              maxLength={64}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-display font-semibold tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Aguarde..." : isRegister ? "Criar Conta" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isRegister ? "Já tenho conta → Entrar" : "Não tenho conta → Criar"}
          </button>
        </form>

        <button
          onClick={() => practice.start("medium")}
          className="w-full mt-4 py-2.5 rounded-md bg-accent text-accent-foreground font-display font-semibold hover:opacity-90 transition-opacity"
        >
          🎯 Jogar Offline (Praticar)
        </button>
      </div>
    </div>
  );
}
