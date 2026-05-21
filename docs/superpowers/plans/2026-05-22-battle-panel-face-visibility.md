# 対戦画面 アイドル顔可視性修正 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BattlePanel` を全画面 clip-path 構造から独立パネル構造へ変更し、上下両アイドルの顔が常に表示されるようにする。

**Architecture:** 各パネルに独立した表示コンテナ（上60%・下60%）を割り当て、clip-path を装飾的な対角線境界の演出にのみ使う。`BattlePanelProps` から `clip` prop を削除し、`position` から clip-path とコンテナサイズを内部決定する。また `handleTap` の HeartBurst 座標計算をビューポート基準に修正して、パネル縮小後もクリック位置に正確にエフェクトが出るようにする。

**Tech Stack:** React, TailwindCSS, TypeScript, Vitest, @testing-library/react

---

### Task 1: img の objectPosition をテストで検証する（テストファースト）

**Files:**

- Modify: `apps/web/src/routes/__tests__/battle.test.tsx`

- [ ] **Step 1: テストを追加する**

`apps/web/src/routes/__tests__/battle.test.tsx` の既存テスト末尾（`});` の手前）に追加:

```tsx
test("各パネルの画像は object-position: center 25% で表示される", async () => {
  battlePairFn.mockResolvedValue({
    idolA: {
      id: "idol-a",
      name: "アイドルA",
      group: "グループA",
      photo: { id: "photo-a", imageUrl: "https://example.com/a.jpg" },
    },
    idolB: {
      id: "idol-b",
      name: "アイドルB",
      group: "グループB",
      photo: { id: "photo-b", imageUrl: "https://example.com/b.jpg" },
    },
  });

  renderWithProviders(<BattleComponent />);

  await screen.findByText("アイドルA");

  const images = document.querySelectorAll("img");
  expect(images).toHaveLength(2);
  for (const img of images) {
    expect(img.style.objectPosition).toBe("center 25%");
  }
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd apps/web && bun run test --run -- battle
```

Expected: FAIL — `expect(received).toBe("center 25%")` で失敗（現在の img には objectPosition が設定されていないため）

---

### Task 2: `BattlePanelProps` から `clip` を削除し独立パネル構造に変更する

**Files:**

- Modify: `apps/web/src/routes/battle.tsx`

- [ ] **Step 1: `BattleComponent` 内の `clipA`/`clipB` 変数と `clip` prop を削除する**

`battle.tsx` の 122-123 行目を削除する:

```tsx
// この 2 行を削除
const clipA = "polygon(0 0, 100% 0, 100% 38%, 0 62%)";
const clipB = "polygon(0 62%, 100% 38%, 100% 100%, 0 100%)";
```

Panel A の呼び出し（153-163 行目付近）を以下に変更する:

```tsx
{
  /* Panel A (top-left diagonal) */
}
<BattlePanel
  idol={idolA}
  position="top"
  state={phase === "idle" ? "idle" : winnerIdx === 0 ? "win" : "lose"}
  onTap={(e) =>
    handleTap(e, 0, idolA.id, idolB.id, idolA.photo?.id ?? null, idolB.photo?.id ?? null)
  }
  disabled={phase !== "idle"}
/>;
```

Panel B の呼び出し（165-175 行目付近）を以下に変更する:

```tsx
{
  /* Panel B (bottom-right diagonal) */
}
<BattlePanel
  idol={idolB}
  position="bottom"
  state={phase === "idle" ? "idle" : winnerIdx === 1 ? "win" : "lose"}
  onTap={(e) =>
    handleTap(e, 1, idolB.id, idolA.id, idolB.photo?.id ?? null, idolA.photo?.id ?? null)
  }
  disabled={phase !== "idle"}
/>;
```

- [ ] **Step 2: `BattlePanelProps` から `clip` を削除する**

249-256 行目付近の interface を以下に置き換える:

```tsx
interface BattlePanelProps {
  idol: IdolData;
  position: "top" | "bottom";
  state: "idle" | "win" | "lose";
  onTap: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled: boolean;
}
```

- [ ] **Step 3: `BattlePanel` 関数全体を独立パネル構造に置き換える**

258-341 行目の `BattlePanel` 関数を以下に置き換える:

```tsx
function BattlePanel({ idol, position, state, onTap, disabled }: BattlePanelProps) {
  const animClass =
    state === "win" ? "animate-panel-win" : state === "lose" ? "animate-panel-lose" : "";

  const clipPath =
    position === "top"
      ? "polygon(0 0, 100% 0, 100% 63%, 0 100%)"
      : "polygon(0 37%, 100% 0, 100% 100%, 0 100%)";

  const positionClass =
    position === "top"
      ? "absolute top-0 left-0 right-0 h-[60%]"
      : "absolute bottom-0 left-0 right-0 h-[60%]";

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      className={`${positionClass} cursor-pointer overflow-hidden border-none bg-transparent p-0 ${animClass}`}
      style={{
        clipPath,
        transformOrigin: position === "top" ? "50% 30%" : "50% 70%",
      }}
    >
      {/* Portrait */}
      <div className="absolute inset-0">
        {idol.photo?.imageUrl ? (
          <img
            src={idol.photo.imageUrl}
            alt={idol.name}
            className="h-full w-full object-cover"
            style={{ objectPosition: "center 25%" }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background:
                position === "top"
                  ? "linear-gradient(135deg, #ff2e88 0%, #9d4dff 100%)"
                  : "linear-gradient(135deg, #9d4dff 0%, #00f0ff 100%)",
            }}
          >
            <span style={{ fontSize: 80, opacity: 0.2, color: "#fff" }}>♪</span>
          </div>
        )}
      </div>

      {/* Dark fade from cut edge */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            position === "top"
              ? "linear-gradient(180deg, transparent 40%, rgba(10,4,24,0.85) 100%)"
              : "linear-gradient(0deg, transparent 40%, rgba(10,4,24,0.85) 100%)",
        }}
      />

      {/* Inner glow from cut */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: position === "top" ? "inset 0 0 60px #ff2e8844" : "inset 0 0 60px #9d4dff44",
        }}
      />

      {/* Nameplate */}
      <div
        className="pointer-events-none absolute left-6 right-6"
        style={position === "top" ? { top: 90 } : { bottom: 60 }}
      >
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.6)",
            marginBottom: 4,
          }}
        >
          {idol.group}
        </div>
        <div
          style={{
            fontFamily: '"Bungee", monospace',
            fontSize: "clamp(28px, 8vw, 44px)",
            lineHeight: 0.95,
            color: "#fff",
            textShadow: "0 0 12px #ff2e88, 0 0 24px #9d4dff",
          }}
        >
          {idol.name}
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
cd apps/web && bun run test --run -- battle
```

Expected: all tests PASS（Task 1 で追加したテストを含む）

- [ ] **Step 5: 型チェックを実行する**

```bash
cd apps/web && bun run check-types
```

Expected: エラーなし

- [ ] **Step 6: コミットする**

```bash
git add apps/web/src/routes/battle.tsx apps/web/src/routes/__tests__/battle.test.tsx
git commit -m "fix: BattlePanelを独立パネル構造に変更してアイドルの顔が見えるよう修正"
```

---

### Task 3: HeartBurst 座標をビューポート基準に修正する

**Files:**

- Modify: `apps/web/src/routes/battle.tsx:47-49`

**背景:** パネルが画面の60%の高さになったため、ボタン相対で計算した `y` をそのまま HeartBurst に使うとエフェクト位置がクリック位置からずれる（例: 上パネルの50%位置クリック → 実際は画面30%の位置だが burst は画面50%に出る）。HeartBurst の親コンテナはビューポート全体なので、ビューポート基準の % に修正する。

- [ ] **Step 1: 座標計算をビューポート基準に変更する**

`handleTap` 内の 47-49 行目を以下に置き換える（`rect` 変数も不要になるため削除する）:

変更前:

```tsx
const rect = e.currentTarget.getBoundingClientRect();
const x = ((e.clientX - rect.left) / rect.width) * 100;
const y = ((e.clientY - rect.top) / rect.height) * 100;
```

変更後:

```tsx
const x = (e.clientX / window.innerWidth) * 100;
const y = (e.clientY / window.innerHeight) * 100;
```

- [ ] **Step 2: テストが通ることを確認する**

```bash
cd apps/web && bun run test --run -- battle
```

Expected: all tests PASS（既存テストは `clientX/Y = 0` で HeartBurst 位置を検証しないため影響なし）

- [ ] **Step 3: 全チェックを実行する**

```bash
bun run check && bun run check-types && bun run test && bun run build
```

Expected: すべてグリーン

- [ ] **Step 4: dev サーバーで起動確認する**

```bash
(cd packages/infra && timeout 30 bun run dev 2>&1 || true) | grep -vE "SIGTERM|Polite quit"
```

`error:` / `AssertionError` / `command not found` が含まれていないことを確認する。

- [ ] **Step 5: コミットする**

```bash
git add apps/web/src/routes/battle.tsx
git commit -m "fix: HeartBurstの座標計算をビューポート基準に修正"
```
