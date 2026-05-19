import { Button } from "@oshi-idol/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import { useRef } from "react";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/ranking")({
  component: RankingComponent,
});

function getTier(eloRating: number): { label: string; color: string } {
  if (eloRating >= 1600) return { label: "S", color: "text-yellow-500" };
  if (eloRating >= 1500) return { label: "A", color: "text-orange-400" };
  if (eloRating >= 1400) return { label: "B", color: "text-blue-400" };
  if (eloRating >= 1300) return { label: "C", color: "text-green-400" };
  return { label: "D", color: "text-muted-foreground" };
}

function RankingComponent() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const rankingRef = useRef<HTMLDivElement>(null);

  const ranking = useQuery(trpc.ranking.top10.queryOptions());

  if (ranking.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (ranking.isError || !ranking.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">エラーが発生しました。再読み込みしてください。</p>
      </div>
    );
  }

  const tierGroups: Record<string, typeof ranking.data> = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
  };

  for (const idol of ranking.data) {
    const tier = getTier(idol.eloRating);
    tierGroups[tier.label].push(idol);
  }

  async function handleSaveImage() {
    if (!rankingRef.current) return;
    const dataUrl = await toPng(rankingRef.current);
    const link = document.createElement("a");
    link.download = "oshi-ranking.png";
    link.href = dataUrl;
    link.click();
  }

  function handleShareX() {
    const text =
      "私の推し活ランキング！\n" +
      ranking
        .data!.map((idol) => `${idol.rank}位: ${idol.name} (${idol.group})`)
        .slice(0, 5)
        .join("\n");
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=推し活バトル`;
    window.open(url, "_blank");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">ランキング</h1>
        <Button onClick={() => navigate({ to: "/battle" })}>もう一度バトル</Button>
      </div>

      <div ref={rankingRef}>
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">TOP 10</h2>
          <div className="flex flex-col gap-2">
            {ranking.data.map((idol) => {
              const tier = getTier(idol.eloRating);
              return (
                <div key={idol.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="w-6 text-center font-bold text-muted-foreground">
                    {idol.rank}
                  </span>
                  {idol.photo ? (
                    <img
                      src={idol.photo.imageUrl}
                      alt={idol.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500">
                      <span className="text-lg text-white">♪</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{idol.name}</p>
                    <p className="text-sm text-muted-foreground">{idol.group}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${tier.color}`}>{tier.label}</span>
                    <p className="text-xs text-muted-foreground">ELO {idol.eloRating}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>勝率 {idol.winRate}%</p>
                    <p>
                      {idol.wins}勝 {idol.losses}敗
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Tier List</h2>
          <div className="flex flex-col gap-3">
            {(["S", "A", "B", "C", "D"] as const).map((tierLabel) => {
              const idolsInTier = tierGroups[tierLabel];
              if (idolsInTier.length === 0) return null;
              const tierColors: Record<string, string> = {
                S: "bg-yellow-500/10 border-yellow-500/30",
                A: "bg-orange-400/10 border-orange-400/30",
                B: "bg-blue-400/10 border-blue-400/30",
                C: "bg-green-400/10 border-green-400/30",
                D: "bg-muted border-border",
              };
              const labelColors: Record<string, string> = {
                S: "text-yellow-500",
                A: "text-orange-400",
                B: "text-blue-400",
                C: "text-green-400",
                D: "text-muted-foreground",
              };
              return (
                <div
                  key={tierLabel}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${tierColors[tierLabel]}`}
                >
                  <span className={`w-8 text-center text-2xl font-black ${labelColors[tierLabel]}`}>
                    {tierLabel}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {idolsInTier.map((idol) => (
                      <div key={idol.id} className="flex items-center gap-1">
                        {idol.photo ? (
                          <img
                            src={idol.photo.imageUrl}
                            alt={idol.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500">
                            <span className="text-sm text-white">♪</span>
                          </div>
                        )}
                        <span className="text-sm">{idol.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={handleShareX}>
          Xでシェア
        </Button>
        <Button variant="outline" onClick={handleSaveImage}>
          画像を保存
        </Button>
      </div>
    </div>
  );
}
