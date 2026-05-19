import { Button } from "@oshi-idol/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">推し活バトル</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          あなたの推しは誰？投票して順位を決めよう！
        </p>
      </div>
      <Button size="lg" onClick={() => navigate({ to: "/battle" })}>
        バトルを始める
      </Button>
    </div>
  );
}
