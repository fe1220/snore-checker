"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function Home() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => api<{ status: string }>("/health/"),
  });

  return (
    <main className="mx-auto w-full max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle>백엔드 연결 상태</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <Skeleton className="h-6 w-20" />
          ) : isError ? (
            <Badge variant="destructive">연결 실패</Badge>
          ) : (
            <Badge>{data.status}</Badge>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
