import { Button } from "@oshi-idol/ui/components/button";
import { Input } from "@oshi-idol/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await getUser();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
  component: AdminComponent,
});

type Tab = "list" | "create" | "csv";

function AdminComponent() {
  const [tab, setTab] = useState<Tab>("list");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">アイドル管理</h1>
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("list")}
          className={`rounded px-4 py-2 text-sm font-medium transition-colors ${tab === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          一覧
        </button>
        <button
          type="button"
          onClick={() => setTab("create")}
          className={`rounded px-4 py-2 text-sm font-medium transition-colors ${tab === "create" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          登録
        </button>
        <button
          type="button"
          onClick={() => setTab("csv")}
          className={`rounded px-4 py-2 text-sm font-medium transition-colors ${tab === "csv" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          CSVインポート
        </button>
      </div>
      {tab === "list" && <IdolListTab />}
      {tab === "create" && <IdolCreateTab onCreated={() => setTab("list")} />}
      {tab === "csv" && <CsvImportTab />}
    </div>
  );
}

function IdolListTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const idolList = useQuery(trpc.admin.idols.list.queryOptions());

  const deleteMutation = useMutation(
    trpc.admin.idols.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.admin.idols.list.queryFilter());
      },
    }),
  );

  if (idolList.isLoading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  if (idolList.error) {
    return <p className="text-destructive">エラーが発生しました</p>;
  }

  const idolsData = idolList.data ?? [];

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">名前</th>
            <th className="px-4 py-3 text-left font-medium">グループ</th>
            <th className="px-4 py-3 text-right font-medium">ELO</th>
            <th className="px-4 py-3 text-right font-medium">勝</th>
            <th className="px-4 py-3 text-right font-medium">負</th>
            <th className="px-4 py-3 text-right font-medium">写真数</th>
            <th className="px-4 py-3 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {idolsData.length === 0 && (
            <tr>
              <td colSpan={7} className="text-muted-foreground px-4 py-6 text-center">
                アイドルが登録されていません
              </td>
            </tr>
          )}
          {idolsData.map((idol) => (
            <tr key={idol.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-3">{idol.name}</td>
              <td className="text-muted-foreground px-4 py-3">{idol.group}</td>
              <td className="px-4 py-3 text-right">{idol.eloRating}</td>
              <td className="px-4 py-3 text-right">{idol.wins}</td>
              <td className="px-4 py-3 text-right">{idol.losses}</td>
              <td className="px-4 py-3 text-right">{idol.photos.length}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ id: idol.id })}
                >
                  削除
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IdolCreateTab({ onCreated }: { onCreated: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [imageUrlsText, setImageUrlsText] = useState("");

  const createMutation = useMutation(
    trpc.admin.idols.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.admin.idols.list.queryFilter());
        setName("");
        setGroup("");
        setImageUrlsText("");
        onCreated();
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const imageUrls = imageUrlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    createMutation.mutate({ name: name.trim(), group: group.trim(), imageUrls });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="idol-name">
          名前
        </label>
        <Input
          id="idol-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 田中美咲"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="idol-group">
          グループ
        </label>
        <Input
          id="idol-group"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder="例: AKB48"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="idol-images">
          画像URL（1行1URL）
        </label>
        <textarea
          id="idol-images"
          value={imageUrlsText}
          onChange={(e) => setImageUrlsText(e.target.value)}
          placeholder={"https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg"}
          rows={5}
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
        />
      </div>
      {createMutation.error && (
        <p className="text-destructive text-sm">{createMutation.error.message}</p>
      )}
      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? "登録中..." : "登録"}
      </Button>
    </form>
  );
}

function CsvImportTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);

  const importMutation = useMutation(
    trpc.admin.idols.importCsv.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.admin.idols.list.queryFilter());
        setResult(data);
        setCsv("");
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    importMutation.mutate({ csv });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="csv-input">
          CSV
        </label>
        <p className="text-muted-foreground text-xs">フォーマット: name,group,imageUrl</p>
        <textarea
          id="csv-input"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={"name,group,imageUrl\n田中美咲,AKB48,https://example.com/photo.jpg"}
          rows={10}
          required
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
        />
      </div>
      {importMutation.error && (
        <p className="text-destructive text-sm">{importMutation.error.message}</p>
      )}
      {result && (
        <p className="text-sm text-green-600">
          インポート完了: 新規 {result.created} 件、更新 {result.updated} 件
        </p>
      )}
      <Button type="submit" disabled={importMutation.isPending}>
        {importMutation.isPending ? "インポート中..." : "インポート"}
      </Button>
    </form>
  );
}
