import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getSessionId } from "@/lib/session";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/battle")({
  component: BattleComponent,
});

const MAX_VOTES = 10;

function BattleComponent() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [voteCount, setVoteCount] = useState(0);
  const [voting, setVoting] = useState<string | null>(null);

  const sessionId = getSessionId();

  const battlePair = useQuery(trpc.idols.battlePair.queryOptions({ sessionId }));

  const submitVote = useMutation(trpc.votes.submit.mutationOptions());

  async function handleVote(
    winnerId: string,
    loserId: string,
    winnerPhotoId: string | null,
    loserPhotoId: string | null,
  ) {
    if (voting) return;
    setVoting(winnerId);

    await submitVote.mutateAsync({
      winnerId,
      loserId,
      winnerPhotoId: winnerPhotoId ?? "",
      loserPhotoId: loserPhotoId ?? "",
      sessionId,
    });

    const newCount = voteCount + 1;
    setVoteCount(newCount);

    if (newCount >= MAX_VOTES) {
      navigate({ to: "/ranking" });
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: trpc.idols.battlePair.queryKey({ sessionId }),
    });

    setVoting(null);
  }

  if (battlePair.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (battlePair.isError || !battlePair.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">エラーが発生しました。再読み込みしてください。</p>
      </div>
    );
  }

  const { idolA, idolB } = battlePair.data;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col">
        <button
          type="button"
          className="relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 transition-opacity hover:opacity-90 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ opacity: voting && voting !== idolA.id ? 0.5 : 1 }}
          onClick={() =>
            handleVote(idolA.id, idolB.id, idolA.photo?.id ?? null, idolB.photo?.id ?? null)
          }
          disabled={!!voting}
        >
          {idolA.photo ? (
            <img
              src={idolA.photo.imageUrl}
              alt={idolA.name}
              className="h-48 w-48 rounded-full object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg">
              <span className="text-4xl text-white">♪</span>
            </div>
          )}
          <div className="text-center">
            <p className="text-xl font-bold">{idolA.name}</p>
            <p className="text-muted-foreground text-sm">{idolA.group}</p>
          </div>
        </button>

        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-4">
            <div className="h-px w-16 bg-border" />
            <span className="text-xl font-bold">VS</span>
            <div className="h-px w-16 bg-border" />
          </div>
        </div>

        <button
          type="button"
          className="relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 transition-opacity hover:opacity-90 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ opacity: voting && voting !== idolB.id ? 0.5 : 1 }}
          onClick={() =>
            handleVote(idolB.id, idolA.id, idolB.photo?.id ?? null, idolA.photo?.id ?? null)
          }
          disabled={!!voting}
        >
          {idolB.photo ? (
            <img
              src={idolB.photo.imageUrl}
              alt={idolB.name}
              className="h-48 w-48 rounded-full object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg">
              <span className="text-4xl text-white">♪</span>
            </div>
          )}
          <div className="text-center">
            <p className="text-xl font-bold">{idolB.name}</p>
            <p className="text-muted-foreground text-sm">{idolB.group}</p>
          </div>
        </button>
      </div>

      <div className="border-t p-4">
        <div className="mx-auto max-w-sm">
          <div className="mb-1 flex justify-between text-sm">
            <span>
              {voteCount} / {MAX_VOTES}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(voteCount / MAX_VOTES) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
