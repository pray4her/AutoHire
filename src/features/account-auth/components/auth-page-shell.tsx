import type { ReactNode } from "react";
import { UserRound } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  cardTitle: string;
  cardDescription?: string;
  children: ReactNode;
};

export function AuthPageShell({
  title,
  subtitle,
  cardTitle,
  cardDescription,
  children,
}: AuthPageShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-2 text-center">
        <div className="text-muted-foreground flex items-center justify-center gap-2">
          <UserRound />
          <span className="text-sm tracking-wide">Account</span>
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{cardTitle}</CardTitle>
          {cardDescription ? (
            <CardDescription>{cardDescription}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
